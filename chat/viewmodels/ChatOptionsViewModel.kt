package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.ParticipantEntity
import xyz.terracrypt.chat.services.ChatService
import xyz.terracrypt.chat.services.ParticipantService
import xyz.terracrypt.chat.services.UserService
import javax.inject.Inject

@HiltViewModel
class ChatOptionsViewModel @Inject constructor(
    private val participantService: ParticipantService,
    private val chatService: ChatService,
    private val userService: UserService,
    val sessionManager: SessionManager
) : MemorySafeViewModel() {

    private val _participants = MutableStateFlow<List<ParticipantEntity>>(emptyList())
    val participants: StateFlow<List<ParticipantEntity>> = _participants

    private val _userPictures = MutableStateFlow<Map<String, String>>(emptyMap())
    val userPictures: StateFlow<Map<String, String>> = _userPictures

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    val isRefreshing = MutableStateFlow(false)
    val chatCreatedAt = MutableStateFlow<Long?>(null)

    private var creatorId: String? = null

    fun refreshParticipants(chatId: String) {
        viewModelScope.launch {
            isRefreshing.value = true
            loadParticipants(chatId)
            isRefreshing.value = false
        }
    }

    fun loadParticipants(chatId: String) {
        viewModelScope.launch {
            try {
                val chat = chatService.getChatById(chatId)
                chatCreatedAt.value = chat?.createdAt
                creatorId = chat?.creatorId

                val result = participantService.fetchParticipants(chatId)
                    .sortedBy { it.joinedAt }

                _participants.value = result

            } catch (e: Exception) {
                _errorMessage.value = "Failed to load participants: ${e.localizedMessage}"
            }
        }
    }

    fun fetchUserPicture(userId: String) {
        viewModelScope.launch {
            try {
                if (_userPictures.value.containsKey(userId)) return@launch
                val user = userService.getUserById(userId)
                user.picture?.let { pictureUrl ->
                    _userPictures.value += userId to pictureUrl
                }
            } catch (_: Exception) {}
        }
    }

    fun removeParticipant(chatId: String, userId: String) {
        if (userId == creatorId) {
            _errorMessage.value = "You can't remove the super admin."
            return
        }

        viewModelScope.launch {
            try {
                participantService.removeParticipant(chatId, userId)
                refreshParticipants(chatId)
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun updateParticipantRole(chatId: String, userId: String, newRole: String) {
        if (userId == creatorId) {
            _errorMessage.value = "You can't change the super admin's role."
            return
        }

        viewModelScope.launch {
            try {
                participantService.updateParticipantRole(chatId, userId, newRole)
                refreshParticipants(chatId)
            } catch (e: Exception) {
                _errorMessage.value = "Failed to update role: ${e.localizedMessage}"
            }
        }
    }

    fun isSuperAdmin(chatId: String, currentUserId: String): Boolean {
        return creatorId == currentUserId
    }

    suspend fun isAdminOrSuperAdmin(chatId: String, currentUserId: String): Boolean {
        val participant = participantService.fetchParticipant(chatId, currentUserId)
        return participant?.role == "admin" || creatorId == currentUserId
    }

    fun leaveChat(chatId: String) {
        viewModelScope.launch {
            try {
                participantService.leaveChat(chatId)
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun getSuperAdmin(): ParticipantEntity? {
        return _participants.value.firstOrNull { it.userId == creatorId }
    }

    fun getCurrentUserId(): String? = sessionManager.currentUser.value?.userId
}
