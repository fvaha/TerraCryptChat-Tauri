package xyz.terracrypt.chat

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import xyz.terracrypt.chat.network.WebSocketManager
import xyz.terracrypt.chat.services.MessageService
import javax.inject.Inject

@HiltAndroidApp
class TerraCryptApplication : Application() {

    @Inject
    lateinit var webSocketManager: WebSocketManager

    @Inject
    lateinit var messageService: MessageService

    override fun onCreate() {
        super.onCreate()
        // No WebSocket connection here
    }
}
