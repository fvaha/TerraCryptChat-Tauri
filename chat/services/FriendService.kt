package xyz.terracrypt.chat.services

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.managers.FriendManager
import xyz.terracrypt.chat.models.FriendEntity
import xyz.terracrypt.chat.models.FriendRequest
import xyz.terracrypt.chat.network.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FriendService @Inject constructor(
    private val apiService: ApiService,
    private val friendManager: FriendManager,
    private val userService: UserService
) {
    companion object {
        private const val TAG = "FriendService"
    }

    private val _friendsChanged = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val friendsChanged: SharedFlow<Unit> = _friendsChanged

    private val _pendingCountChanged = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val pendingCountChanged: SharedFlow<Unit> = _pendingCountChanged

    fun notifyFriendsListChanged() {
        _friendsChanged.tryEmit(Unit)
    }

    fun notifyPendingRequestChange() {
        _pendingCountChanged.tryEmit(Unit)
    }

    fun isFriendDataStale(): Boolean {
        return friendManager.isStale()
    }

    // ====== Fetch Friends from API and Update CoreData ======
    suspend fun fetchFriendsAndUpdateCoreData(): List<FriendEntity> = withContext(Dispatchers.IO) {
        runCatching {
            val result = apiService.getFriendsList()
            if (result.isSuccess) {
                friendManager.saveFriends(result.getOrNull().orEmpty())
            } else {
                Log.e(TAG, "Error fetching friends: ${result.exceptionOrNull()?.localizedMessage}")
            }
        }.onFailure {
            Log.e(TAG, "Exception fetching friends: ${it.localizedMessage}", it)
        }
        friendManager.fetchFriends()
    }

    // ====== Get Friends Locally from DB ======
    suspend fun getFriends(): List<FriendEntity> {
        return friendManager.fetchFriends()
    }

    // ====== Fetch Pending Friend Requests ======
    suspend fun fetchPendingRequests(): List<FriendRequest> = withContext(Dispatchers.IO) {
        runCatching {
            val result = apiService.getPendingFriendRequests()
            if (result.isSuccess) result.getOrNull().orEmpty() else emptyList()
        }.getOrElse {
            Log.e(TAG, "Failed to fetch pending requests: ${it.localizedMessage}", it)
            emptyList()
        }
    }

    suspend fun fetchPendingRequestCount(): Int {
        return fetchPendingRequests().size
    }

    // ====== Search Users (Filter Out Friends & Pending) ======
    suspend fun searchUsers(query: String): List<FriendEntity> = withContext(Dispatchers.IO) {
        if (query.isBlank()) return@withContext emptyList()
        runCatching {
            val allResults = apiService.searchUsers(query).getOrNull().orEmpty()

            val currentUserId = userService.getCurrentUserId()
            val existingFriendIds = getFriends().map { it.friendId }.toSet()
            val pendingSenderIds = fetchPendingRequests().map { it.sender.userId }.toSet()

            allResults.filter { user ->
                user.id != currentUserId &&
                        user.id !in existingFriendIds &&
                        user.id !in pendingSenderIds
            }.take(7).map { user ->
                FriendEntity(
                    friendId = user.id.toString(),
                    username = user.username,
                    name = user.name,
                    email = user.email,
                    picture = user.picture,
                    isFavorite = false,
                    createdAt = null,
                    updatedAt = null,
                    status = null
                )
            }
        }.getOrElse {
            Log.e(TAG, "Error searching users: ${it.localizedMessage}", it)
            emptyList()
        }
    }

    // ====== Fetch Specific User Details ======
    suspend fun fetchUserDetails(userId: String): FriendEntity? = withContext(Dispatchers.IO) {
        runCatching {
            val result = apiService.getUserById(userId)
            if (result.isSuccess) {
                result.getOrNull()?.let { user ->
                    FriendEntity(
                        friendId = user.id.toString(),
                        username = user.username,
                        name = user.name,
                        email = user.email,
                        picture = user.picture,
                        isFavorite = false,
                        createdAt = null,
                        updatedAt = null,
                        status = null
                    )
                }
            } else {
                Log.e(TAG, "API error fetching user by ID: ${result.exceptionOrNull()?.localizedMessage}")
                null
            }
        }.getOrElse {
            Log.e(TAG, "Exception fetching user by ID: ${it.localizedMessage}", it)
            null
        }
    }

    // ====== Friend Request Actions ======
    suspend fun sendFriendRequest(receiverId: String, senderId: String): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            apiService.sendFriendRequest(receiverId, senderId)
        }.getOrElse {
            Log.e(TAG, "Error sending friend request: ${it.localizedMessage}", it)
            false
        }
    }

    suspend fun acceptFriendRequest(requestId: String): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            apiService.acceptFriendRequest(requestId)
        }.getOrElse {
            Log.e(TAG, "Error accepting friend request: ${it.localizedMessage}", it)
            false
        }
    }

    suspend fun declineFriendRequest(requestId: String): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            apiService.declineFriendRequest(requestId)
        }.getOrElse {
            Log.e(TAG, "Error declining friend request: ${it.localizedMessage}", it)
            false
        }
    }

    // ====== Get Friend's Picture by ID (Suspend, DB) ======
    suspend fun getFriendPicture(friendId: String?): String? {
        return friendManager.getFriendPicture(friendId)
    }

    // ====== Get Friend's Picture by ID (Instant, MEMORY CACHE - za Compose!) ======
    fun getCachedFriendPicture(friendId: String?): String? {
        return friendManager.getCachedFriendPicture(friendId)
    }

    // ====== Remove Friend (Not Yet Implemented) ======
    // In FriendService
    suspend fun removeFriend(friendId: String): Boolean = withContext(Dispatchers.IO) {
        val result = apiService.deleteFriend(friendId)
        if (result.isSuccess) {
            // Optionally: Remove from local DB/cache
            friendManager.removeFriendLocally(friendId)
            true
        } else {
            false
        }
    }


    // ====== Update Favorite Status Locally ======
    suspend fun updateFavoriteStatus(friend: FriendEntity, isFavorite: Boolean) {
        withContext(Dispatchers.IO) {
            runCatching {
                friendManager.updateFavoriteStatus(friend, isFavorite)
            }.onFailure {
                Log.e(TAG, "Failed to update favorite status: ${it.localizedMessage}", it)
            }
        }
    }

    // ====== Get Current User ID ======
    fun getCurrentUserId(): String? {
        return userService.getCurrentUserId()
    }
}
