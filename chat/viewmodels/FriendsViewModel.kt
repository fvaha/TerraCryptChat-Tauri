package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.models.ChatEntity
import xyz.terracrypt.chat.models.FriendEntity
import xyz.terracrypt.chat.services.ChatService
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.utils.ISO8601DateFormatter
import xyz.terracrypt.chat.utils.formatAsTime
import javax.inject.Inject

@HiltViewModel
class FriendsViewModel @Inject constructor(
    private val friendService: FriendService,
    val chatService: ChatService,
    val sessionManager: xyz.terracrypt.chat.managers.SessionManager
) : MemorySafeViewModel() {

    private val _friendsList = MutableStateFlow(emptyList<FriendEntity>())
    val friendsList: StateFlow<List<FriendEntity>> = _friendsList

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _searchResults = MutableStateFlow(emptyList<FriendEntity>())
    val searchResults: StateFlow<List<FriendEntity>> = _searchResults

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery

    private val _pendingRequestCount = MutableStateFlow(0)
    val pendingRequestCount: StateFlow<Int> = _pendingRequestCount

    private val _sentRequestIds = MutableStateFlow(emptySet<String>())
    val sentRequestIds: StateFlow<Set<String>> = _sentRequestIds

    private val _refreshTrigger = MutableSharedFlow<Unit>()
    val refreshTrigger: SharedFlow<Unit> = _refreshTrigger

    val snackbarMessages = MutableSharedFlow<String>(extraBufferCapacity = 3)

    init {
        viewModelScope.launch {
            sessionManager.isSessionInitialized
                .combine(sessionManager.isLoggedIn) { initialized, loggedIn -> initialized && loggedIn }
                .filter { it }
                .first()

            if (sessionManager.isLoggedIn.value) {
                sessionManager.postLoginInitialization()
            }
        }

        viewModelScope.launch {
            chatService.chats.collect {
                _friendsList.value = _friendsList.value
            }
        }

        viewModelScope.launch {
            friendService.friendsChanged.collect {
                if (sessionManager.isLoggedIn.value) {
                    loadFriends(forceRefresh = true)
                    snackbarMessages.emit("You have a new friend!")
                }
            }
        }



    viewModelScope.launch {
            friendService.pendingCountChanged.collect {
                if (sessionManager.isLoggedIn.value) {
                    loadPendingRequestCount()
                    snackbarMessages.emit("You received a new friend request")
                }
            }
        }
    }



    fun refreshFriends() {
        viewModelScope.launch { _refreshTrigger.emit(Unit) }
    }

    private fun getOneOnOneChat(friendUsername: String): ChatEntity? {
        val currentUsername = sessionManager.getCurrentUsername()
        return chatService.chats.value.firstOrNull { chat ->
            !chat.isGroup && chat.participants?.split(",")?.map { it.trim() }?.toSet() == setOf(currentUsername, friendUsername)
        }
    }

    fun getChatWithFriend(friend: FriendEntity): ChatEntity? = getOneOnOneChat(friend.username)

    fun loadFriends(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                chatService.syncChatsWithAPI()

                val newFriends = if (forceRefresh || friendService.isFriendDataStale()) {
                    friendService.fetchFriendsAndUpdateCoreData()
                } else {
                    friendService.getFriends()
                }

                _friendsList.value = newFriends
            } catch (_: Exception) {
                // optional: log error
            } finally {
                _isLoading.value = false
            }
        }
    }

    data class FriendUiModel(
        val friend: FriendEntity,
        val lastMessage: String?,
        val timestampFormatted: String?,
        val existingChatId: String?
    )

    fun prepareFriendsForDisplay(): List<FriendUiModel> {
        val currentUsername = sessionManager.getCurrentUsername()
        val allChats = chatService.chats.value

        return friendsList.value.map { friend ->
            val chat = allChats.firstOrNull { chat ->
                !chat.isGroup && chat.participants?.split(",")?.map { it.trim() }?.toSet() == setOf(currentUsername, friend.username)
            }

            val timestampMillis = chat?.lastMessageTimestamp?.let { ISO8601DateFormatter.toMillis(it.toString()) }

            FriendUiModel(
                friend = friend,
                lastMessage = chat?.lastMessageContent,
                timestampFormatted = timestampMillis?.takeIf { it > 0L }?.formatAsTime(),
                existingChatId = chat?.chatId
            )
        }
    }

    fun updateFavorite(friend: FriendEntity, isFavorite: Boolean) {
        viewModelScope.launch {
            friendService.updateFavoriteStatus(friend, isFavorite)
            _friendsList.update { list ->
                list.map { if (it.friendId == friend.friendId) it.copy(isFavorite = isFavorite) else it }
            }
        }
    }

    fun searchUsers(query: String) {
        viewModelScope.launch {
            val currentUserId = friendService.getCurrentUserId()
            val existingFriends = friendService.getFriends().map { it.friendId }.toSet()

            val results = friendService.searchUsers(query)
                .filterNot { user ->
                    user.friendId == currentUserId || user.friendId in existingFriends || _sentRequestIds.value.contains(user.friendId)
                }

            _searchResults.value = results
        }
    }

    fun clearSearchResults() {
        _searchResults.value = emptyList()
    }

    fun sendFriendRequest(receiverId: String, onResult: (Boolean, String?) -> Unit) {
        if (_sentRequestIds.value.contains(receiverId)) {
            onResult(false, "Request already sent")
            return
        }

        viewModelScope.launch {
            val senderId = friendService.getCurrentUserId()
            if (senderId == null) {
                onResult(false, "Unauthorized")
                return@launch
            }

            try {
                val success = friendService.sendFriendRequest(receiverId, senderId)
                if (success) {
                    _sentRequestIds.update { it + receiverId }
                    _searchResults.update { it.filterNot { user -> user.friendId == receiverId } }
                    onResult(true, null)
                } else {
                    onResult(false, "Failed to send friend request")
                }
            } catch (e: Exception) {
                val message = if (e.message?.contains("already exists", ignoreCase = true) == true) {
                    "Friend request already exists"
                } else {
                    "Error sending friend request: ${e.localizedMessage}"
                }
                onResult(false, message)
            }
        }
    }

    fun loadPendingRequestCount() {
        viewModelScope.launch {
            _pendingRequestCount.value = friendService.fetchPendingRequestCount()
        }
    }

    fun removeFriend(friendId: String) {
        viewModelScope.launch {
            val success = friendService.removeFriend(friendId)
            if (success) {
                snackbarMessages.emit("Friend removed")
                loadFriends(forceRefresh = true)
            } else {
                snackbarMessages.emit("Failed to remove friend")
            }
        }
    }


    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    override fun onClearMemory() {
        _friendsList.value = emptyList()
        _searchResults.value = emptyList()
        _searchQuery.value = ""
        _sentRequestIds.value = emptySet()
    }
}
