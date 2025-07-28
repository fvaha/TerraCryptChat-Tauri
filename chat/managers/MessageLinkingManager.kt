package xyz.terracrypt.chat.managers

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.models.MessageEntity
import javax.inject.Inject

class MessageLinkingManager @Inject constructor(
    private val messageManager: MessageManager
) {

    /**
     * Links a pending message (by clientMessageId) with the server-assigned messageId.
     * Updates status and timestamp, but does NOT overwrite clientMessageId.
     */
    private suspend fun replaceMessageIdByClient(
        clientMessageId: String,
        serverId: String,
        serverTimestamp: Long?
    ) = withContext(Dispatchers.IO) {
        val oldMessage = messageManager.findMessageByClientId(clientMessageId)
        if (oldMessage != null) {
            val updated = oldMessage.copy(
                messageId = serverId,
                timestamp = serverTimestamp ?: oldMessage.timestamp,
                isSent = true,
                isFailed = false
            )
            messageManager.updateMessage(updated)
            Log.d(
                "MessageLinkingManager",
                "Linked serverId=$serverId to local clientId=$clientMessageId"
            )
        } else {
            Log.w("MessageLinkingManager", "No local message found with clientId=$clientMessageId to link with serverId=$serverId")
        }
    }

    /**
     * Fallback: Finds a message without serverId based on timestamp and sender.
     */
    private suspend fun findUnlinkedMessageByTimestamp(
        chatId: String,
        senderId: String,
        serverTimestampMillis: Long,
        windowMillis: Long = 3000L
    ): MessageEntity? = withContext(Dispatchers.IO) {
        val unread = messageManager.getUnreadMessages(chatId)
        unread.firstOrNull {
            it.senderId == senderId &&
                    it.messageId == null &&
                    kotlin.math.abs(it.timestamp - serverTimestampMillis) <= windowMillis
        }
    }

    /**
     * Main linking function — tries clientMessageId first, then timestamp fallback.
     */
    suspend fun robustLinking(
        chatId: String,
        senderId: String,
        clientMessageId: String?,
        serverId: String,
        serverTimestampMillis: Long?
    ) = withContext(Dispatchers.IO) {
        if (!clientMessageId.isNullOrBlank()) {
            replaceMessageIdByClient(clientMessageId, serverId, serverTimestampMillis)
        } else if (serverTimestampMillis != null) {
            val match = findUnlinkedMessageByTimestamp(chatId, senderId, serverTimestampMillis)
            if (match != null) {
                replaceMessageIdByClient(match.clientMessageId, serverId, serverTimestampMillis)
                Log.d("MessageLinkingManager", "Linked serverId=$serverId via timestamp fallback")
            } else {
                Log.w("MessageLinkingManager", "No fallback match found for serverId=$serverId with timestamp=$serverTimestampMillis")
            }
        } else {
            Log.w("MessageLinkingManager", "Missing clientMessageId and timestamp for serverId=$serverId — cannot link")
        }
    }

    /**
     * Applies status update by serverId — handles all types: sent, delivered, read.
     * Assumes robustLinking was already attempted.
     */
    suspend fun updateStatusByServerId(
        serverId: String,
        status: String,
        timestamp: Long? = null
    ) = withContext(Dispatchers.IO) {
        try {
            when (status.lowercase()) {
                "sent" -> {
                    messageManager.markMessageAsSent(serverId) // usually by clientId
                }
                "delivered" -> {
                    messageManager.markMessageAsDeliveredByServerId(serverId)
                }
                "read" -> {
                    messageManager.markMessageAsReadByServerId(serverId)
                }
                else -> {
                    Log.w("MessageLinkingManager", "Unknown status: $status for serverId=$serverId")
                }
            }
        } catch (e: Exception) {
            Log.e("MessageLinkingManager", "Failed to apply $status to serverId=$serverId", e)
        }
    }
}
