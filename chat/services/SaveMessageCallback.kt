package xyz.terracrypt.chat.services

/**
 * Callback interface for saving messages.
 */
interface SaveMessageCallback {
    suspend fun saveMessage(chatId: String, content: String, senderId: String, timestamp: Long): String
}