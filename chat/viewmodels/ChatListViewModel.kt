package xyz.terracrypt.chat.viewmodels

import android.util.Log
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.ChatEntity
import xyz.terracrypt.chat.services.ChatService
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.MessageService
import xyz.terracrypt.chat.services.ParticipantService
import javax.inject.Inject

@HiltViewModel
class ChatListViewModel @Inject constructor(
    private val chatService: ChatService,
    private val participantService: ParticipantService,
    private val sessionManager: SessionManager,
    private val messageService: MessageService,
    private val friendService: FriendService
) : MemorySafeViewModel() {

    val chatsList: StateFlow<List<ChatEntity>> = chatService.chats

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _selectedChat = MutableStateFlow<ChatEntity?>(null)
    val selectedChat: StateFlow<ChatEntity?> = _selectedChat.asStateFlow()

    private val _totalUnreadCount = MutableStateFlow(0)
    val totalUnreadCount: StateFlow<Int> = _totalUnreadCount.asStateFlow()

    private val _chatNames = MutableStateFlow<Map<String, String>>(emptyMap())
    val chatNames: StateFlow<Map<String, String>> = _chatNames.asStateFlow()

    private val _chatAvatars = MutableStateFlow<Map<String, String?>>(emptyMap())
    val chatAvatars: StateFlow<Map<String, String?>> = _chatAvatars.asStateFlow()

    private var activeChatId: String? = null

    val currentUserId: String? get() = sessionManager.getCurrentUserId()

    init {
        viewModelScope.launch {
            sessionManager.isSessionInitialized
                .combine(sessionManager.isLoggedIn) { initialized, loggedIn -> initialized && loggedIn }
                .filter { it }
                .first()
            sessionManager.postLoginInitialization()
        }

        observeLiveMessageUpdates()
        observeChatNamesAndAvatars()

        // Praćenje promene učesnika chata preko ChatService eventa
        viewModelScope.launch {
            chatService.chatParticipantsUpdated.collect { chatId ->
                try {
                    participantService.syncParticipantsWithAPI(chatId)
                    refreshChatNamesAndAvatars(chatsList.value)
                } catch (e: Exception) {
                    Log.e("ChatListViewModel", "Failed to refresh participants for chat $chatId: ${e.message}")
                }
            }
        }


        viewModelScope.launch {
            chatService.chats.collect { chats ->
                _totalUnreadCount.value = chats.sumOf { it.unreadCount }
                refreshChatNamesAndAvatars(chats)
            }
        }
    }

    fun canCurrentUserDelete(chat: ChatEntity): Boolean {
        return chat.creatorId == sessionManager.getCurrentUserId()
    }

    fun selectChat(chat: ChatEntity) {
        _selectedChat.value = chat
        activeChatId = chat.chatId
    }

    fun loadMessages(chatId: String) {
        viewModelScope.launch {
            try {
                messageService.fetchMessages(chatId, limit = 1)
            } catch (e: Exception) {
                Log.e("ChatListModel", "Failed to fetch messages for $chatId", e)
            }
        }
    }

    fun getUserAvatarUrlSync(userId: String?): String? {
        return friendService.getCachedFriendPicture(userId)
    }

    suspend fun getUserAvatarUrl(userId: String?): String? {
        return friendService.getFriendPicture(userId)
    }

    fun fetchChats() {
        viewModelScope.launch {
            _isLoading.emit(true)
            try {
                chatService.syncChatsWithAPI()
                syncParticipants()
                refreshUnreadCounts()
            } catch (e: Exception) {
                Log.e("ChatListModel", "Failed to sync chats: ${e.localizedMessage}")
            } finally {
                _isLoading.emit(false)
            }
        }
    }

    fun deleteChat(chatId: String) {
        viewModelScope.launch {
            try {
                chatService.deleteChatFromServer(chatId)
            } catch (e: Exception) {
                Log.e("ChatListModel", "Delete failed: ${e.message}")
            }
        }
    }

    fun leaveChat(chatId: String) {
        viewModelScope.launch {
            try {
                chatService.leaveChat(chatId)
            } catch (e: Exception) {
                Log.e("ChatListModel", "Leave failed: ${e.message}")
            }
        }
    }

    fun updateUnreadCount(chatId: String, count: Int) {
        chatService.updateUnreadCount(chatId, count)
        _totalUnreadCount.value = chatsList.value.sumOf { it.unreadCount }
    }

    private fun observeChatNamesAndAvatars() {
        viewModelScope.launch {
            chatsList.collect { chats ->
                refreshChatNamesAndAvatars(chats)
            }
        }
    }

    private fun refreshChatNamesAndAvatars(chats: List<ChatEntity>) {
        viewModelScope.launch {
            val names = mutableMapOf<String, String>()
            val avatars = mutableMapOf<String, String?>()
            val myUserId = sessionManager.getCurrentUserId()

            for (chat in chats) {
                if (!chat.isGroup && myUserId != null) {
                    val others = participantService.getCachedParticipants(chat.chatId)
                        .filter { it.userId != myUserId }
                    val otherUser = others.firstOrNull()
                    val name = otherUser?.username ?: "Direct Chat"
                    val avatar = getUserAvatarUrlSync(otherUser?.userId)
                    names[chat.chatId] = name
                    avatars[chat.chatId] = avatar
                } else {
                    names[chat.chatId] = chat.groupName ?: chat.chatName ?: "Chat"
                    avatars[chat.chatId] = null
                }
            }
            _chatNames.value = names
            _chatAvatars.value = avatars
        }
    }


    suspend fun getChatDisplayName(chat: ChatEntity): String {
        val myUserId = sessionManager.getCurrentUserId()
        if (!chat.isGroup && myUserId != null) {
            val others = participantService.getCachedParticipants(chat.chatId)
                .filter { it.userId != myUserId }
            return others.firstOrNull()?.username ?: chat.chatName ?: "Direct Chat"
        }
        return chat.groupName ?: chat.chatName ?: "Chat"
    }

    suspend fun getChatAvatarUrl(chat: ChatEntity): String? {
        val myUserId = sessionManager.getCurrentUserId()
        if (!chat.isGroup && myUserId != null) {
            val others = participantService.getCachedParticipants(chat.chatId)
                .filter { it.userId != myUserId }
            return others.firstOrNull()?.userId?.let { getUserAvatarUrl(it) }
        }
        return null
    }

    private suspend fun syncParticipants() {
        chatsList.value.forEach { chat ->
            participantService.syncParticipantsWithAPI(chat.chatId)
        }
    }

    private fun refreshUnreadCounts() {
        viewModelScope.launch {
            chatsList.value.forEach { chat ->
                val unread = messageService.getUnreadMessages(chat.chatId).size
                chatService.updateUnreadCount(chat.chatId, unread)
            }
            _totalUnreadCount.value = chatsList.value.sumOf { it.unreadCount }
        }
    }

    private fun observeLiveMessageUpdates() {
        viewModelScope.launch {
            messageService.messageFlow.collect { updated ->
                val chatId = updated.chatId
                if (chatId == activeChatId) {
                    chatService.updateUnreadCount(chatId, 0)
                } else {
                    val unread = messageService.getUnreadMessages(chatId).size
                    chatService.updateUnreadCount(chatId, unread)
                }
                _totalUnreadCount.value = chatService.chats.value.sumOf { it.unreadCount }
                refreshChatNamesAndAvatars(chatService.chats.value)
            }
        }
    }

    private fun syncChatsAndParticipantsInBackground() {
        viewModelScope.launch {
            try {
                chatService.syncChatsWithAPI()
                syncParticipants()
                refreshUnreadCounts()
            } catch (e: Exception) {
                Log.e("ChatListModel", "Background sync failed: ${e.localizedMessage}")
            }
        }
    }

    override fun onClearMemory() {
        _isLoading.value = false
        _selectedChat.value = null
        _totalUnreadCount.value = 0
        activeChatId = null
        _chatNames.value = emptyMap()
        _chatAvatars.value = emptyMap()
    }
}
