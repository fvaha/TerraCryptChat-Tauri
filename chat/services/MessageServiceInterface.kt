package xyz.terracrypt.chat.services

import kotlinx.coroutines.flow.Flow
import xyz.terracrypt.chat.models.MessageEntity

interface MessageServiceInterface {
    fun attachWebSocketManager()
    fun observeMessages(chatId: String): Flow<List<MessageEntity>>

    suspend fun saveMessage(chatId: String, content: String, senderId: String, timestamp: Long): String
    suspend fun handleOutgoingMessage(type: String, payload: Map<String, Any>, onSent: suspend () -> Unit)

    suspend fun markMessageAsSent(messageId: String)
    suspend fun markMessageAsDelivered(messageId: String)
    suspend fun markMessageAsRead(messageId: String)
    suspend fun markAllMessagesAsRead(chatId: String)

    suspend fun getUnreadMessages(chatId: String): List<MessageEntity>
    suspend fun fetchMessages(chatId: String, limit: Int): List<MessageEntity>
    suspend fun fetchOldMessages(chatId: String, beforeTimestamp: Long): List<MessageEntity>
}
