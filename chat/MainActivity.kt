package xyz.terracrypt.chat

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.network.WebSocketManager
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.ParticipantService
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var webSocketManager: WebSocketManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var friendService: FriendService
    @Inject lateinit var participantService: ParticipantService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ✅ Ovo dodaj - omogućava insete za Compose
        WindowCompat.setDecorFitsSystemWindows(window, false)

        lifecycleScope.launch {
            sessionManager.initializeSession()
        }

        setContent {
            MainScreen(
                sessionManager = sessionManager,
                friendService = friendService,
                participantService = participantService
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (webSocketManager.isConnected) {
            webSocketManager.disconnect()
        }
    }
}
