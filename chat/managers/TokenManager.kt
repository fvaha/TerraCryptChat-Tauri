package xyz.terracrypt.chat.managers

import android.content.SharedPreferences
import android.util.Log
import androidx.core.content.edit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    private val sharedPreferences: SharedPreferences
) {

    companion object {
        private const val ACCESS_TOKEN_KEY = "accessToken"
        private const val USERNAME_KEY = "username"
        private const val PASSWORD_KEY = "password"
    }

    @Volatile
    private var cachedToken: String? = null

    init {
        cachedToken = sharedPreferences.getString(ACCESS_TOKEN_KEY, null)
    }

    fun getCachedAccessToken(): String? = cachedToken

    suspend fun getAccessToken(): String? = withContext(Dispatchers.IO) {
        cachedToken ?: sharedPreferences.getString(ACCESS_TOKEN_KEY, null)?.also {
            cachedToken = it
        }
    }

    suspend fun updateAccessToken(token: String) = withContext(Dispatchers.IO) {
        val current = sharedPreferences.getString(ACCESS_TOKEN_KEY, null)
        if (current != token) {
            sharedPreferences.edit(true) {
                putString(ACCESS_TOKEN_KEY, token)
            }
            cachedToken = token
            logTokenExpiry(token)
        }
    }

    fun clearAccessToken() {
        sharedPreferences.edit(true) {
            remove(ACCESS_TOKEN_KEY)
        }
        cachedToken = null
    }

    fun updateCredentials(username: String?, password: String?) {
        sharedPreferences.edit(true) {
            putString(USERNAME_KEY, username)
            putString(PASSWORD_KEY, password)
        }
    }

    fun getStoredCredentials(): Pair<String?, String?> {
        val username = sharedPreferences.getString(USERNAME_KEY, null)
        val password = sharedPreferences.getString(PASSWORD_KEY, null)
        return username to password
    }

    fun clearCredentials() {
        sharedPreferences.edit(true) {
            remove(USERNAME_KEY)
            remove(PASSWORD_KEY)
        }
    }

    fun isTokenExpired(token: String): Boolean {
        val parts = token.split(".")
        if (parts.size != 3) return true

        val payload = decodeBase64URL(parts[1]) ?: return true
        val json = runCatching { JSONObject(String(payload)) }.getOrNull() ?: return true

        val exp = json.optDouble("exp", 0.0)
        val expired = exp <= 0.0 || Date((exp * 1000).toLong()) < Date()

        Log.d("TokenManager", "Decoded token exp=$exp vs now=${System.currentTimeMillis() / 1000}")
        return expired
    }

    suspend fun ensureValidAccessToken(): String? = withContext(Dispatchers.IO) {
        val token = getAccessToken()
        if (token.isNullOrBlank() || isTokenExpired(token)) {
            throw Exception("Access token is missing or expired")
        }
        token
    }

    fun getExpirationTime(token: String): Long {
        val parts = token.split(".")
        if (parts.size != 3) return 0

        val payload = decodeBase64URL(parts[1]) ?: return 0
        val json = runCatching { JSONObject(String(payload)) }.getOrNull() ?: return 0
        return json.optLong("exp", 0)
    }

    private fun logTokenExpiry(token: String) {
        val parts = token.split(".")
        if (parts.size != 3) return

        val payload = decodeBase64URL(parts[1]) ?: return
        val json = runCatching { JSONObject(String(payload)) }.getOrNull() ?: return

        val exp = json.optLong("exp", 0)
        val now = System.currentTimeMillis() / 1000
        val secondsLeft = exp - now

        Log.d("TokenManager", "Token expires in $secondsLeft seconds (exp=$exp, now=$now)")
    }

    private fun decodeBase64URL(base64: String): ByteArray? {
        var base64String = base64.replace("-", "+").replace("_", "/")
        while (base64String.length % 4 != 0) base64String += "="
        return android.util.Base64.decode(base64String, android.util.Base64.URL_SAFE)
    }
}
