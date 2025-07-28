package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.models.FriendRequest
import xyz.terracrypt.chat.services.FriendService
import javax.inject.Inject

@HiltViewModel
class PendingRequestsViewModel @Inject constructor(
    private val friendService: FriendService
) : MemorySafeViewModel() {

    private val _pendingRequests = MutableStateFlow<List<FriendRequest>>(emptyList())
    val pendingRequests: StateFlow<List<FriendRequest>> = _pendingRequests

    private val _statusMessage = MutableStateFlow<String?>(null)
    val statusMessage: StateFlow<String?> = _statusMessage

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private var loadJob: kotlinx.coroutines.Job? = null

    fun loadPendingRequests() {
        if (loadJob?.isActive == true) return

        loadJob = viewModelScope.launch {
            _isLoading.value = true
            try {
                _pendingRequests.value = friendService.fetchPendingRequests()
            } catch (e: Exception) {
                _statusMessage.value = "Error loading requests: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }


    fun clearStatusMessage() {
        _statusMessage.value = null
    }

    fun acceptRequest(requestId: String, onAccepted: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                val success = friendService.acceptFriendRequest(requestId)
                _statusMessage.value = if (success) {
                    loadPendingRequests()
                    onAccepted()
                    "Friend request accepted"
                } else {
                    "Failed to accept friend request"
                }
            } catch (e: Exception) {
                _statusMessage.value = "Error: ${e.localizedMessage}"
            }
        }
    }

    fun declineRequest(requestId: String) {
        viewModelScope.launch {
            try {
                val success = friendService.declineFriendRequest(requestId)
                _statusMessage.value = if (success) {
                    loadPendingRequests()
                    "Friend request declined"
                } else {
                    "Failed to decline friend request"
                }
            } catch (e: Exception) {
                _statusMessage.value = "Error: ${e.localizedMessage}"
            }
        }
    }

    override fun onClearMemory() {
        loadJob?.cancel()
        _pendingRequests.value = emptyList()
        _statusMessage.value = null
        _isLoading.value = false
    }
}
