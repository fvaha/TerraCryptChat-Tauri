package xyz.terracrypt.chat.network

import android.os.Build
import android.util.Log
import dagger.Lazy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import xyz.terracrypt.chat.services.UserService
import xyz.terracrypt.chat.utils.JsonUtils
import javax.inject.Inject
import javax.inject.Named
import javax.inject.Singleton

@Singleton
class WebSocketManager @Inject constructor(
    private val userService: Lazy<UserService>,
    @Named("WebSocketOkHttpClient") private val okHttpClient: OkHttpClient
) {
    companion object {
        private const val TAG = "WebSocketManager"
        private const val HEARTBEAT_TIMEOUT_MS = 120_000L // 2 minutes
    }

    var onMessageReceived: ((String) -> Unit)? = null

    private var webSocket: WebSocket? = null
    var isConnected = false
        private set
    private var isConnecting = false
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatMonitorJob: Job? = null
    private var lastReceivedTimestamp = System.currentTimeMillis()

    fun connect() {
        disconnect()
        if (isConnected || isConnecting) {
            Log.d(TAG, "WebSocket already connected or reconnecting.")
            return
        }

        coroutineScope.launch {
            try {
                isConnecting = true
                val token = userService.get().getAccessToken()
                if (token.isNullOrEmpty()) {
                    Log.e(TAG, "Access token is null or empty, skipping connect.")
                    return@launch
                }

                Log.d(TAG, "Attempting WebSocket connection to ${ApiConfig.WS_URL}")
                Log.d(TAG, "Using token: ${token.take(16)}...")

                val isEmulator = Build.FINGERPRINT.contains("generic")

                val request = if (isEmulator) {
                    Request.Builder()
                        .url(ApiConfig.WS_URL)
                        .addHeader("Authorization", "Bearer ${token.trim()}")
                        .addHeader("Connection", "Upgrade")
                        .addHeader("Upgrade", "websocket")
                        .addHeader("Sec-WebSocket-Version", "13")
                        .addHeader("Origin", "https://dev.v1.terracrypt.cc")
                        .build()
                } else {
                    Request.Builder()
                        .url("${ApiConfig.WS_URL}?token=${token.trim()}")
                        .addHeader("Authorization", "Bearer ${token.trim()}")
                        .addHeader("Connection", "Upgrade")
                        .addHeader("Upgrade", "websocket")
                        .addHeader("Sec-WebSocket-Version", "13")
                        .addHeader("Origin", "https://dev.v1.terracrypt.cc")
                        .build()
                }

                webSocket = okHttpClient.newWebSocket(request, socketListener)
            } catch (e: Exception) {
                Log.e(TAG, "Connection failed: ${e.localizedMessage}", e)
            } finally {
                isConnecting = false
            }
        }
    }

    fun disconnect() {
        stopHeartbeat()
        webSocket?.close(1000, "Client disconnected")
        webSocket = null
        isConnected = false
    }

    fun sendMessage(message: Map<String, Any>) {
        val json = JsonUtils.encodeToString(message)
        Log.d(TAG, "SENDING WS: $json")
        webSocket?.send(json)
    }

    private val socketListener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            Log.i(TAG, "WebSocket connected")
            isConnected = true
            lastReceivedTimestamp = System.currentTimeMillis()
            startHeartbeat()
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            lastReceivedTimestamp = System.currentTimeMillis()
            Log.d(TAG, "RECEIVED WS (text): $text")
            onMessageReceived?.invoke(text)
        }

        override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
            lastReceivedTimestamp = System.currentTimeMillis()
            Log.d(TAG, "RECEIVED WS (binary): ${bytes.hex()}")
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            Log.w(TAG, "WebSocket closing: $code / $reason")
            isConnected = false
            stopHeartbeat()
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            Log.w(TAG, "WebSocket closed: $code / $reason")
            isConnected = false
            stopHeartbeat()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            Log.e(TAG, "WebSocket failure: ${t.localizedMessage}", t)
            isConnected = false
            stopHeartbeat()
            scheduleReconnect()
        }
    }

    private fun startHeartbeat() {
        heartbeatMonitorJob?.cancel()
        heartbeatMonitorJob = coroutineScope.launch {
            while (isConnected) {
                delay(HEARTBEAT_TIMEOUT_MS / 2) // šalji češće
                try {
                    // Ovo šalje text message "ping" — Go backend može ovo ignorisati, ali je indikator života
                    webSocket?.send("ping")
                    Log.d(TAG, "Sent ping to server")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send ping: ${e.message}")
                    disconnect()
                    scheduleReconnect()
                    break
                }
                // Proveri kada je poslednji put stiglo nešto
                val elapsed = System.currentTimeMillis() - lastReceivedTimestamp
                if (elapsed > HEARTBEAT_TIMEOUT_MS) {
                    Log.w(TAG, "Heartbeat timeout — forcing reconnect")
                    disconnect()
                    scheduleReconnect()
                    break
                }
            }
        }
    }


    private fun stopHeartbeat() {
        heartbeatMonitorJob?.cancel()
        heartbeatMonitorJob = null
    }

    private fun scheduleReconnect() {
        coroutineScope.launch {
            delay(5000) // fixed simple delay (5 sec), možeš povećati po želji
            Log.d(TAG, "Retrying WebSocket connection after heartbeat failure")
            connect()
        }
    }
}
