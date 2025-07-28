// MARK: - AddParticipantViewModel.kt

package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.FriendEntity
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.ParticipantService
import javax.inject.Inject

@HiltViewModel
class AddParticipantViewModel @Inject constructor(
    private val friendService: FriendService,
    private val participantService: ParticipantService,
    val sessionManager: SessionManager
) : MemorySafeViewModel() {

    private val _availableFriends = MutableStateFlow<List<FriendEntity>>(emptyList())
    private val _searchText = MutableStateFlow("")
    private val _filteredFriends = MutableStateFlow<List<FriendEntity>>(emptyList())

    val searchText: StateFlow<String> = _searchText
    val filteredFriends: StateFlow<List<FriendEntity>> = _filteredFriends

    // MARK: - Set Search Text
    fun setSearchText(text: String) {
        _searchText.value = text
        filterFriends()
    }

    // MARK: - Load Friends Not in Chat
    fun loadAvailableFriends(chatId: String) {
        viewModelScope.launch {
            val allFriends = friendService.getFriends()
            val participants = participantService.fetchParticipants(chatId)
            val existingUserIds = participants.map { it.userId }.toSet()

            _availableFriends.value = allFriends.filter { it.friendId !in existingUserIds }
            filterFriends()
        }
    }

    // MARK: - Filter Friend List Based on Search
    private fun filterFriends() {
        val search = _searchText.value.lowercase()
        val base = _availableFriends.value
        val result = if (search.isBlank()) base else base.filter {
            it.username.lowercase().contains(search)
        }
        _filteredFriends.value = result
    }

    // MARK: - Add New Participant to Chat
    fun addParticipantToChat(chatId: String, friend: FriendEntity) {
        viewModelScope.launch {
            participantService.addParticipants(chatId, listOf(friend.friendId))
        }
    }
}
