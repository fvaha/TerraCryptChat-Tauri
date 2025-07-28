@file:OptIn(kotlinx.coroutines.FlowPreview::class)

package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.MessageEntity
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.MessageService
import xyz.terracrypt.chat.services.ParticipantService
import javax.inject.Inject
import kotlin.math.abs

@HiltViewModel
class ChatScreenViewModel @Inject constructor(
    private val messageService: MessageService,
    private val sessionManager: SessionManager,
    private val participantService: ParticipantService,
    private val friendService: FriendService
) : MemorySafeViewModel() {

    private val _rawMessages = MutableStateFlow<List<MessageEntity>>(emptyList())
    private val _messages = MutableStateFlow<List<MessageEntity>>(emptyList())
    val messages: StateFlow<List<MessageEntity>> = _messages.asStateFlow()

    private val _participantNames = MutableStateFlow<List<String>>(emptyList())
    val participantNames: StateFlow<List<String>> = _participantNames.asStateFlow()

    val currentUserId: String? get() = sessionManager.currentUser.value?.userId

    private var observeJob: Job? = null
    private var isPaging = false
    private var viewedChatId: String? = null

    private var chatListViewModel: ChatListViewModel? = null
    fun setChatListViewModel(vm: ChatListViewModel) {
        this.chatListViewModel = vm
    }

    private val pastelColors = listOf(
        0xFF667C73, 0xFF6D99AD, 0xFF7687B3, 0xFF998C61,
        0xFF8C80B7, 0xFF949494, 0xFF709E70, 0xFF6D917D,
        0xFF948A66, 0xFF66A6BF, 0xFF999969, 0xFF6B9994, 0xFF80A68C
    )

    fun loadMessages(chatId: String) {
        viewModelScope.launch {
            val result = messageService.fetchMessages(chatId, limit = 50)
            _rawMessages.value = result
            _messages.value = prepareMessagesForDisplay(result)
        }
    }

    fun loadParticipants(chatId: String) {
        viewModelScope.launch {
            try {
                val participants = participantService.fetchParticipants(chatId)
                _participantNames.value = participants.map { it.username }.sorted()
            } catch (_: Exception) {
                _participantNames.value = emptyList()
            }
        }
    }

    fun observeMessages(chatId: String) {
        observeJob?.cancel()
        viewedChatId = chatId

        observeJob = viewModelScope.launch {
            messageService.messageFlow
                .debounce(100)
                .collectLatest { updatedMessage ->
                    if (updatedMessage.chatId != chatId) return@collectLatest

                    _rawMessages.update { current ->
                        val updated = current.toMutableList()
                        val idx = updated.indexOfFirst { it.clientMessageId == updatedMessage.clientMessageId }
                        if (idx != -1) {
                            val preservedTimestamp = updated[idx].timestamp
                            updated[idx] = updatedMessage.copy(timestamp = preservedTimestamp)
                        } else {
                            updated.add(updatedMessage)
                        }
                        updated.distinctBy { it.clientMessageId }
                    }

                    _messages.value = prepareMessagesForDisplay(_rawMessages.value)

                    if (updatedMessage.senderId != currentUserId) {
                        chatListViewModel?.updateUnreadCount(chatId, 0)
                    }
                }
        }
    }

    fun sendMessage(chatId: String, content: String, receiverId: String) {
        viewModelScope.launch {
            val senderId = currentUserId ?: return@launch
            val timestamp = System.currentTimeMillis()

            val clientMessageId = messageService.saveMessage(chatId, content, senderId, timestamp)

            val newMessage = MessageEntity(
                id = 0L,
                messageId = null,
                clientMessageId = clientMessageId,
                chatId = chatId,
                senderId = senderId,
                senderUsername = null,
                content = content,
                timestamp = timestamp,
                isSent = false,
                isDelivered = false,
                isRead = false,
                isFailed = false
            )

            _rawMessages.update { current ->
                (current + newMessage).distinctBy { it.clientMessageId }
            }
            _messages.value = prepareMessagesForDisplay(_rawMessages.value)

            val payload = mapOf(
                "chat_id" to chatId,
                "receiver_id" to receiverId,
                "message_text" to content,
                "client_message_id" to clientMessageId
            )

            try {
                messageService.handleOutgoingMessage("chat", payload) {
                    messageService.markMessageAsSent(clientMessageId)
                }
            } catch (_: Exception) {
                _rawMessages.update { current ->
                    current.map {
                        if (it.clientMessageId == clientMessageId) it.copy(isFailed = true) else it
                    }
                }
                _messages.value = prepareMessagesForDisplay(_rawMessages.value)
            }
        }
    }

    fun resendMessage(message: MessageEntity, receiverId: String) {
        viewModelScope.launch {
            _rawMessages.update { current ->
                current.map {
                    if (it.clientMessageId == message.clientMessageId)
                        it.copy(isFailed = false, isSent = false)
                    else it
                }
            }
            _messages.value = prepareMessagesForDisplay(_rawMessages.value)

            val payload = mapOf(
                "chat_id" to message.chatId,
                "receiver_id" to receiverId,
                "message_text" to message.content,
                "client_message_id" to message.clientMessageId
            )

            try {
                messageService.handleOutgoingMessage("chat", payload) {
                    messageService.markMessageAsSent(message.clientMessageId)
                }
            } catch (_: Exception) {
                _rawMessages.update { current ->
                    current.map {
                        if (it.clientMessageId == message.clientMessageId)
                            it.copy(isFailed = true)
                        else it
                    }
                }
                _messages.value = prepareMessagesForDisplay(_rawMessages.value)
            }
        }
    }

    fun markMessagesAsRead(chatId: String) {
        viewModelScope.launch {
            if (chatId == viewedChatId) {
                val currentUserId = sessionManager.currentUser.value?.userId
                _rawMessages.update { messages ->
                    messages.map {
                        if (it.chatId == chatId && it.senderId != currentUserId) {
                            it.copy(isRead = true)
                        } else it
                    }
                }
                _messages.value = prepareMessagesForDisplay(_rawMessages.value)
                messageService.markAllMessagesAsRead(chatId)
                chatListViewModel?.updateUnreadCount(chatId, 0)
            }
        }
    }

    fun loadOlderMessages(chatId: String, beforeTimestamp: Long) {
        if (isPaging) return
        isPaging = true

        viewModelScope.launch {
            val olderMessages = messageService.fetchOldMessages(chatId, beforeTimestamp)
            if (olderMessages.isNotEmpty()) {
                _rawMessages.update { current ->
                    (olderMessages + current).distinctBy { it.clientMessageId }
                }
                _messages.value = prepareMessagesForDisplay(_rawMessages.value)
            }
            isPaging = false
        }
    }

    private suspend fun prepareMessagesForDisplay(messages: List<MessageEntity>): List<MessageEntity> {
        val sortedMessages = messages.sortedBy { it.timestamp }

        val participants = participantService.getCachedParticipants(viewedChatId.orEmpty())
        val senderMap = participants.associateBy { it.userId }
        val friendPictures = mutableMapOf<String, String?>()

        return sortedMessages.map { msg ->
            val sender = senderMap[msg.senderId]
            val fallbackPicture = if (sender == null) {
                friendPictures.getOrPut(msg.senderId) {
                    friendService.getFriendPicture(msg.senderId)
                }
            } else null

            val colorHex = pastelColors
                .getOrNull(abs(msg.senderId.hashCode()) % pastelColors.size)
                ?.let { String.format("#%06X", 0xFFFFFF and it.toInt()) }
                ?: "#CCCCCC"

            val replyMatch = Regex("""⟪(.+?)⟫: (.+)\n""").find(msg.content)
            val cleanContent = replyMatch?.let { msg.content.removePrefix(it.value) } ?: msg.content

            MessageEntity(
                id = msg.id,
                messageId = msg.messageId,
                clientMessageId = msg.clientMessageId,
                chatId = msg.chatId,
                senderId = msg.senderId,
                content = cleanContent,
                timestamp = msg.timestamp,
                isRead = msg.isRead,
                isSent = msg.isSent,
                isDelivered = msg.isDelivered,
                isFailed = msg.isFailed,
                senderUsername = sender?.username,
                replyToMessageId = msg.replyToMessageId
            ).apply {
                profilePictureUrl = fallbackPicture
                replyPreviewSender = replyMatch?.groupValues?.getOrNull(1)
                replyPreviewText = replyMatch?.groupValues?.getOrNull(2)
                bubbleColorHex = colorHex
            }
        }
    }

    override fun onClearMemory() {
        observeJob?.cancel()
        _rawMessages.value = emptyList()
        _messages.value = emptyList()
        _participantNames.value = emptyList()
        viewedChatId = null
        isPaging = false
        chatListViewModel = null
    }
}
