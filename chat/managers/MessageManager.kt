package xyz.terracrypt.chat.managers

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.data.MessageDao
import xyz.terracrypt.chat.models.MessageEntity
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageManager @Inject constructor(
    private val messageDao: MessageDao
) {

    private val _messageFlow = MutableSharedFlow<MessageEntity>(replay = 1)
    val messageFlow: SharedFlow<MessageEntity> = _messageFlow

    suspend fun saveMessage(chatId: String, content: String, senderId: String, timestamp: Long): String {
        val clientMessageId = UUID.randomUUID().toString()
        val messageEntity = MessageEntity(
            messageId = null,
            clientMessageId = clientMessageId,
            chatId = chatId,
            senderId = senderId,
            content = content,
            timestamp = timestamp,
            isSent = false,
            isRead = false,
            isDelivered = false,
            isFailed = false
        )
        messageDao.insertMessage(messageEntity)
        return clientMessageId
    }

    suspend fun insertMessage(message: MessageEntity) {
        withContext(Dispatchers.IO) {
            messageDao.insertMessage(message)
        }
    }

    suspend fun insertAndEmit(message: MessageEntity) {
        withContext(Dispatchers.IO) {
            messageDao.insertMessage(message)
            _messageFlow.emit(message)
        }
    }

    suspend fun updateMessage(message: MessageEntity) {
        withContext(Dispatchers.IO) {
            messageDao.updateMessage(message)
        }
    }

    suspend fun updateMessages(messages: List<MessageEntity>) {
        withContext(Dispatchers.IO) {
            messageDao.updateMessages(messages)
        }
    }

    suspend fun fetchMessages(chatId: String, limit: Int = 50, beforeTimestamp: Long? = null): List<MessageEntity> {
        return withContext(Dispatchers.IO) {
            beforeTimestamp?.let {
                messageDao.getMessagesBeforeTimestamp(chatId, it, limit)
            } ?: messageDao.getMessages(chatId, limit)
        }
    }

    suspend fun fetchOldMessages(chatId: String, beforeTimestamp: Long): List<MessageEntity> {
        return withContext(Dispatchers.IO) {
            messageDao.getMessagesBeforeTimestamp(chatId, beforeTimestamp, 50)
        }
    }

    suspend fun markMessageAsSent(clientMessageId: String) {
        withContext(Dispatchers.IO) {
            val message = messageDao.getMessageByClientId(clientMessageId)
            if (message != null && !message.isSent) {
                val updated = message.copy(isSent = true, isFailed = false)
                updateMessage(updated)
                _messageFlow.emit(updated)
                Log.d("MessageManager", "markMessageAsSent for $clientMessageId")
            }
        }
    }

    suspend fun markMessageAsDelivered(clientMessageId: String) {
        withContext(Dispatchers.IO) {
            val message = messageDao.getMessageByClientId(clientMessageId)
            if (message != null && !message.isDelivered) {
                val updated = message.copy(isDelivered = true, isFailed = false)
                updateMessage(updated)
                _messageFlow.emit(updated)
                Log.d("MessageManager", "markMessageAsDelivered for $clientMessageId")
            }
        }
    }

    suspend fun markMessageAsDeliveredByServerId(messageId: String) {
        withContext(Dispatchers.IO) {
            var message: MessageEntity? = null
            var attempt = 0
            val maxAttempts = 3

            while (attempt < maxAttempts) {
                message = messageDao.getMessageById(messageId)

                if (message != null) break

                Log.w("MessageManager", "Attempt $attempt: Message not found for serverId=$messageId, retrying...")
                delay(60)
                attempt++
            }

            if (message != null && !message.isDelivered) {
                val updated = message.copy(isDelivered = true, isFailed = false)
                updateMessage(updated)
                _messageFlow.emit(updated)
                Log.d("MessageManager", "markMessageAsDeliveredByServerId for $messageId after $attempt attempt(s)")
            } else if (message == null) {
                Log.e("MessageManager", "Failed to find message by serverId=$messageId after $maxAttempts attempts")
            } else {
                Log.w("MessageManager", "Message already delivered for serverId=$messageId")
            }
        }
    }



    suspend fun markMessageAsRead(clientMessageId: String) {
        withContext(Dispatchers.IO) {
            val message = messageDao.getMessageByClientId(clientMessageId)
            if (message != null && !message.isRead) {
                val updated = message.copy(isRead = true, isFailed = false)
                updateMessage(updated)
                _messageFlow.emit(updated)
                Log.d("MessageManager", "markMessageAsRead for $clientMessageId")
            }
        }
    }

    suspend fun markMessageAsReadByServerId(messageId: String) {
        withContext(Dispatchers.IO) {
            val message = messageDao.getMessageById(messageId)
            if (message != null && !message.isRead) {
                val updated = message.copy(isRead = true, isFailed = false)
                updateMessage(updated)
                _messageFlow.emit(updated)
                Log.d("MessageManager", "markMessageAsReadByServerId for $messageId")
            } else {
                Log.w("MessageManager", "No message found or already read for serverId=$messageId")
            }
        }
    }

    suspend fun markMessagesAsReadByServerIds(messageIds: List<String>) {
        withContext(Dispatchers.IO) {
            if (messageIds.isEmpty()) return@withContext
            messageDao.markMessagesReadByServerIds(messageIds)
            Log.d("MessageManager", "Marked ${messageIds.size} messages as read by serverIds")

            // Optional: fetch updated entities and emit individually for UI updates
            messageIds.forEach { id ->
                val message = messageDao.getMessageById(id)
                if (message != null) _messageFlow.emit(message.copy(isRead = true))
            }
        }
    }

    suspend fun markAllMessagesAsRead(chatId: String): List<MessageEntity> {
        return withContext(Dispatchers.IO) {
            val unread = messageDao.getUnreadMessages(chatId)
            if (unread.isNotEmpty()) {
                val updated = unread.map { it.copy(isRead = true, isFailed = false) }
                updateMessages(updated)
                updated.forEach { _messageFlow.emit(it) }
                updated
            } else emptyList()
        }
    }

    suspend fun getUnreadMessages(chatId: String): List<MessageEntity> {
        return withContext(Dispatchers.IO) {
            messageDao.getUnreadMessages(chatId)
        }
    }

    fun observeMessages(chatId: String): Flow<List<MessageEntity>> {
        return messageDao.observeMessages(chatId)
    }

    suspend fun emitMessageUpdate(message: MessageEntity) {
        _messageFlow.emit(message)
    }

    suspend fun findMessageByClientId(clientMessageId: String): MessageEntity? {
        return withContext(Dispatchers.IO) {
            messageDao.getMessageByClientId(clientMessageId)
        }
    }

    suspend fun findMessageByServerId(messageId: String): MessageEntity? {
        return withContext(Dispatchers.IO) {
            messageDao.getMessageById(messageId)
        }
    }

    suspend fun findLatestByChatAndSender(chatId: String, senderId: String): MessageEntity? {
        return withContext(Dispatchers.IO) {
            messageDao.findLatestByChatAndSender(chatId, senderId)
        }
    }
}
