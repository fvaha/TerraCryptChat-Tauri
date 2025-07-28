package xyz.terracrypt.chat.services

import android.util.Log
import dagger.Lazy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.ChatManager
import xyz.terracrypt.chat.managers.MessageLinkingManager
import xyz.terracrypt.chat.managers.MessageManager
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.ChatMessageWrapper
import xyz.terracrypt.chat.models.ChatNotificationWrapper
import xyz.terracrypt.chat.models.ConnectionStatusMessage
import xyz.terracrypt.chat.models.ErrorWebSocketMessage
import xyz.terracrypt.chat.models.InfoWebSocketMessage
import xyz.terracrypt.chat.models.MessageEntity
import xyz.terracrypt.chat.models.MessageStatusMessage
import xyz.terracrypt.chat.models.RequestNotificationWrapper
import xyz.terracrypt.chat.network.WebSocketManager
import xyz.terracrypt.chat.utils.JsonUtils
import java.util.UUID
import javax.inject.Singleton

@Singleton
class MessageService(
    private val messageManager: MessageManager,
    private val messageLinkingManager: MessageLinkingManager,
    private val cryptoService: CryptoService,
    private val chatManager: ChatManager,
    private val participantService: ParticipantService,
    private val webSocketManager: Lazy<WebSocketManager>,
    private val userService: UserService,
    private val sessionManager: SessionManager,
    private val friendService: FriendService,
    private val chatService: ChatService
) : MessageServiceInterface, SaveMessageCallback {

    private val scope = CoroutineScope(Dispatchers.IO)

    val messageFlow = messageManager.messageFlow

    init {
        attachWebSocketManager()
    }

    override fun attachWebSocketManager() {
        webSocketManager.get().onMessageReceived = { rawMessage ->
            scope.launch {
                handleIncomingMessage(rawMessage)
            }
        }
    }

    override fun observeMessages(chatId: String) = messageManager.observeMessages(chatId)

    override suspend fun saveMessage(chatId: String, content: String, senderId: String, timestamp: Long): String {
        val clientMessageId = UUID.randomUUID().toString()
        val senderUsername = resolveSenderUsername(senderId)
        val msTimestamp = System.currentTimeMillis()

        val messageEntity = MessageEntity(
            messageId = null,
            clientMessageId = clientMessageId,
            chatId = chatId,
            senderId = senderId,
            senderUsername = senderUsername,
            content = content,
            timestamp = msTimestamp,
            isSent = false,
            isDelivered = false,
            isRead = false
        )
        Log.d("MessageService", "INSERT LOCAL: $messageEntity")
        messageManager.insertAndEmit(messageEntity)
        return clientMessageId
    }

    private suspend fun resolveSenderUsername(senderId: String): String {
        if (senderId == sessionManager.getCurrentUserId()) {
            return sessionManager.getCurrentUsername()
        }
        return try {
            val user = userService.getUserById(senderId)
            user.username
        } catch (e: Exception) {
            Log.e("resolveSenderUsername", "Fallback: failed to fetch username for $senderId", e)
            "Unknown"
        }
    }

    private suspend fun handleIncomingMessage(rawMessage: String) {
        Log.d("MessageService", "INCOMING: $rawMessage")
        if (rawMessage.isBlank() || rawMessage.length < 5 || !rawMessage.contains("\"type\"")) return

        try {
            when (JsonUtils.getType(rawMessage)) {
                "chat" -> handleChatMessage(rawMessage)
                "message-status" -> handleMessageStatus(rawMessage)
                "connection-status" -> handleConnectionStatus(rawMessage)
                "error" -> handleErrorMessage(rawMessage)
                "info" -> handleInfoMessage(rawMessage)
                "request-notification" -> handleRequestNotification(rawMessage)
                "chat-notification" -> handleChatNotification(rawMessage)
                else -> Log.w("MessageService", "Unknown type: $rawMessage")
            }
        } catch (e: Exception) {
            Log.e("MessageService", "Exception: $rawMessage", e)
        }
    }

    private suspend fun handleChatMessage(rawMessage: String) {
        val wrapper = JsonUtils.decodeFromStringOrNull<ChatMessageWrapper>(rawMessage)
        val chatMessage = wrapper?.message ?: return

        val decryptedContent = cryptoService.decrypt(chatMessage.messageText)
        if (decryptedContent.isEmpty()) return

        participantService.syncParticipantsWithAPI(chatMessage.chatId)
        val participants = participantService.fetchParticipants(chatMessage.chatId)
        val participantUsernames = participants.joinToString(",") { it.username }
        val isCurrentUserSender = sessionManager.getCurrentUserId() == chatMessage.senderId

        val senderUsername = participants.find { it.userId == chatMessage.senderId }?.username
            ?: resolveSenderUsername(chatMessage.senderId)

        val msgTimestampMs: Long = try {
            java.time.Instant.parse(chatMessage.sentAt).toEpochMilli()
        } catch (_: Exception) {
            System.currentTimeMillis()
        }

        val messageEntity = MessageEntity(
            messageId = chatMessage.messageId,
            clientMessageId = chatMessage.messageId,  // isti messageId za obe kolone
            chatId = chatMessage.chatId,
            senderId = chatMessage.senderId,
            senderUsername = senderUsername,
            content = decryptedContent,
            timestamp = msgTimestampMs,
            isSent = isCurrentUserSender,
            isDelivered = false,
            isRead = false
        )
        messageManager.insertAndEmit(messageEntity)

        val existingChat = chatManager.getChatById(chatMessage.chatId)
        val unreadCount = if (isCurrentUserSender) 0 else messageManager.getUnreadMessages(chatMessage.chatId).size

        chatManager.createOrUpdateChat(
            chatId = chatMessage.chatId,
            chatType = existingChat?.chatType ?: "direct",
            isGroup = existingChat?.isGroup == true,
            chatName = existingChat?.chatName,
            groupName = existingChat?.groupName,
            adminId = existingChat?.adminId,
            lastMessageTimestamp = msgTimestampMs,
            lastMessageContent = decryptedContent,
            unreadCount = unreadCount,
            createdAt = existingChat?.createdAt ?: System.currentTimeMillis(),
            participants = participantUsernames
        )
    }


    private suspend fun handleChatNotification(rawMessage: String) {
        val wrapper = JsonUtils.decodeFromStringOrNull<ChatNotificationWrapper>(rawMessage) ?: return
        val message = wrapper.message

        when (message.action) {
            "created" -> {
                if (message.members.contains(sessionManager.getCurrentUserId())) {
                    chatService.handleChatCreatedEvent(
                        chatId = message.chatId,
                        isGroup = message.isGroup,
                        name = message.name,
                        creatorId = message.creatorId,
                        timestampIso = message.timestamp,
                        members = message.members
                    )
                }
            }
            "deleted" -> {
                chatService.deleteChat(message.chatId)
                chatService.notifyChatDeleted(message.chatId)
            }
        }
    }

    private suspend fun handleMessageStatus(rawMessage: String) {
        val statusMessage = JsonUtils.decodeFromStringOrNull<MessageStatusMessage>(rawMessage) ?: return
        val payload = statusMessage.message

        val clientMessageId = payload.clientMessageId
        val serverMessageId = payload.messageId
        val messageIds = payload.messageIds ?: emptyList()
        val status = payload.status
        val chatId = payload.chatId ?: run {
            Log.w("MessageService", "Missing chatId in status payload, skipping")
            return
        }
        val senderId = payload.senderId ?: run {
            Log.w("MessageService", "Missing senderId in status payload, skipping")
            return
        }

        val serverTimestamp = try {
            java.time.Instant.parse(payload.timestamp).toEpochMilli()
        } catch (_: Exception) {
            Log.w("MessageService", "Invalid timestamp format: ${payload.timestamp}")
            null
        }

        Log.d(
            "MessageService", "STATUS: id=$serverMessageId, clientId=$clientMessageId, status=$status, " +
                    "chatId=$chatId, senderId=$senderId, ts=$serverTimestamp"
        )

        // === Bulk READ support ===
        if (status == "read" && messageIds.isNotEmpty()) {
            Log.d("MessageService", "Bulk read status for ${messageIds.size} messages")
            messageManager.markMessagesAsReadByServerIds(messageIds)
            return
        }

        if (serverMessageId.isNullOrBlank()) {
            Log.w("MessageService", "Missing messageId in single status update, skipping")
            return
        }

        // === STEP 1: Link message only for 'sent' ===
        if (status == "sent" && !clientMessageId.isNullOrBlank()) {
            messageLinkingManager.robustLinking(
                chatId = chatId,
                senderId = senderId,
                clientMessageId = clientMessageId,
                serverId = serverMessageId,
                serverTimestampMillis = serverTimestamp
            )
        }

        // === STEP 2: Always apply status to messageId ===
        messageLinkingManager.updateStatusByServerId(
            serverId = serverMessageId,
            status = status,
            timestamp = serverTimestamp
        )
    }





    private fun handleRequestNotification(rawMessage: String) {
        try {
            val wrapper = JsonUtils.decodeFromStringOrNull<RequestNotificationWrapper>(rawMessage) ?: return
            val notification = wrapper.message

            when (notification.status) {
                "pending" -> friendService.notifyPendingRequestChange()
                "accepted" -> friendService.notifyFriendsListChanged()
            }
        } catch (e: Exception) {
            Log.e("MessageService", "Failed to handle request-notification: ${e.localizedMessage}", e)
        }
    }

    private fun handleConnectionStatus(rawMessage: String) {
        JsonUtils.decodeFromStringOrNull<ConnectionStatusMessage>(rawMessage)?.let {
            Log.d("MessageService", "WebSocket connected at: ${it.message.timestamp}")
        }
    }

    private fun handleInfoMessage(rawMessage: String) {
        JsonUtils.decodeFromStringOrNull<InfoWebSocketMessage>(rawMessage)?.let {
            Log.i("MessageService", "Info: ${it.message}")
        }
    }

    private fun handleErrorMessage(rawMessage: String) {
        JsonUtils.decodeFromStringOrNull<ErrorWebSocketMessage>(rawMessage)?.let {
            Log.e("MessageService", "WebSocket Error: ${it.message}")
        }
    }

    override suspend fun handleOutgoingMessage(
        type: String,
        payload: Map<String, Any>,
        onSent: suspend () -> Unit
    ) {
        try {
            val clientMessageId = payload["client_message_id"] as? String
                ?: UUID.randomUUID().toString() // fallback
            val processedPayload = when (type) {
                "chat" -> prepareChatMessagePayload(payload)
                else -> throw IllegalArgumentException("Unsupported type: $type")
            }

            // Novi payload za backend!
            val finalPayload = mapOf(
                "type" to type,
                "message" to processedPayload,
                "client_message_id" to clientMessageId
            )
            Log.d("MessageService", "OUTGOING: $finalPayload")
            webSocketManager.get().sendMessage(finalPayload)
            onSent()
        } catch (e: Exception) {
            Log.e("MessageService", "Failed to send message", e)
        }
    }

    private fun prepareChatMessagePayload(payload: Map<String, Any>): Map<String, Any?> {
        val text = payload["message_text"] as? String ?: throw IllegalArgumentException("Missing message_text")
        return mapOf(
            "chat_id" to payload["chat_id"],
            "content" to cryptoService.encrypt(text)
        )
    }

    // ───── Message State Updates ─────

    override suspend fun markMessageAsSent(messageId: String) {
        messageManager.markMessageAsSent(messageId)
    }

    override suspend fun markMessageAsDelivered(messageId: String) {
        messageManager.markMessageAsDelivered(messageId)
    }

    override suspend fun markMessageAsRead(messageId: String) {
        messageManager.markMessageAsRead(messageId)
    }

    override suspend fun markAllMessagesAsRead(chatId: String) {
        messageManager.markAllMessagesAsRead(chatId)
        chatManager.updateUnreadCount(chatId, 0)
    }

    override suspend fun getUnreadMessages(chatId: String): List<MessageEntity> =
        messageManager.getUnreadMessages(chatId)

    override suspend fun fetchMessages(chatId: String, limit: Int): List<MessageEntity> =
        messageManager.fetchMessages(chatId, limit)

    override suspend fun fetchOldMessages(chatId: String, beforeTimestamp: Long): List<MessageEntity> =
        messageManager.fetchOldMessages(chatId, beforeTimestamp)


}
