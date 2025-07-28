package xyz.terracrypt.chat.managers

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.data.FriendDao
import xyz.terracrypt.chat.models.Friend
import xyz.terracrypt.chat.models.FriendEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FriendManager @Inject constructor(
    private val friendDao: FriendDao
) {

    private var cachedFriends: List<FriendEntity>? = null
    private var lastSyncTimeMillis: Long = 0L

    // --- Public API ---

    fun isStale(): Boolean {
        return System.currentTimeMillis() - lastSyncTimeMillis > 5 * 60 * 1000 // 5 minutes
    }

    suspend fun saveFriends(friends: List<Friend>) {
        withContext(Dispatchers.IO) {
            val existingFriends = friendDao.getAllFriends()
            val updatedFriends = mutableListOf<FriendEntity>()

            for (friend in friends) {
                val existing = existingFriends.firstOrNull { it.friendId == friend.id }
                if (existing != null) {
                    val updated = existing.copy(
                        username = friend.username,
                        email = friend.email,
                        name = friend.name,
                        picture = friend.picture,
                        createdAt = friend.createdAt?.toLongOrNull(),
                        updatedAt = friend.updatedAt?.toLongOrNull(),
                        isFavorite = existing.isFavorite
                    )
                    updatedFriends.add(updated)
                } else {
                    updatedFriends.add(
                        FriendEntity(
                            friendId = friend.id,
                            username = friend.username,
                            email = friend.email,
                            name = friend.name,
                            picture = friend.picture,
                            createdAt = friend.createdAt?.toLongOrNull(),
                            updatedAt = friend.updatedAt?.toLongOrNull(),
                            status = null,
                            isFavorite = false
                        )
                    )
                }
            }

            friendDao.insertFriends(updatedFriends)
            refreshCache()
            Log.d("FriendManager", "Friends saved successfully. Updated ${updatedFriends.size} records.")
        }
    }

    suspend fun fetchFriends(): List<FriendEntity> {
        if (cachedFriends != null) return cachedFriends!!
        return withContext(Dispatchers.IO) {
            val friends = friendDao.getAllFriends()
            cachedFriends = friends
            lastSyncTimeMillis = System.currentTimeMillis()
            friends
        }
    }

    suspend fun fetchFriendById(friendId: String): FriendEntity? {
        return withContext(Dispatchers.IO) {
            friendDao.getFriendById(friendId)
        }
    }

    // Suspend (DB) verzija za avatar, koristi kad si u korutini
    suspend fun getFriendPicture(friendId: String?): String? {
        return friendId?.let {
            withContext(Dispatchers.IO) {
                friendDao.getFriendById(it)?.picture
            }
        }
    }

    // --- INSTANT/SYNC CACHE METODE ---

    // Instantno vraća FriendEntity iz cache-a (ili null ako nije u cache-u)
    fun getCachedFriendById(friendId: String?): FriendEntity? {
        return cachedFriends?.firstOrNull { it.friendId == friendId }
    }

    // Instantno vraća avatar iz cache-a (ili null ako nije u cache-u)
    fun getCachedFriendPicture(friendId: String?): String? {
        return getCachedFriendById(friendId)?.picture
    }

    // --- Favorite & update ---

    suspend fun updateFavoriteStatus(friend: FriendEntity, isFavorite: Boolean) {
        withContext(Dispatchers.IO) {
            try {
                friendDao.updateFriend(friend.copy(isFavorite = isFavorite))
                refreshCache()
                Log.d("FriendManager", "Favorite status updated for ${friend.username}")
            } catch (e: Exception) {
                Log.e("FriendManager", "Failed to update favorite status: ${e.localizedMessage}", e)
            }
        }
    }

    suspend fun clearFriends() {
        withContext(Dispatchers.IO) {
            try {
                friendDao.clearFriends()
                clearCache()
                Log.d("FriendManager", "Friends cleared.")
            } catch (e: Exception) {
                Log.e("FriendManager", "Failed to clear friends: ${e.localizedMessage}", e)
            }
        }
    }

    fun clearCache() {
        cachedFriends = null
        lastSyncTimeMillis = 0L
    }

    // In FriendManager
    suspend fun removeFriendLocally(friendId: String) {
        withContext(Dispatchers.IO) {
            friendDao.deleteFriendById(friendId)
            refreshCache()
        }
    }


    // --- Internal helpers ---

    private suspend fun refreshCache() {
        cachedFriends = withContext(Dispatchers.IO) { friendDao.getAllFriends() }
        lastSyncTimeMillis = System.currentTimeMillis()
    }

    // Pozovi ovo za globalno brisanje cache-a, npr. na logout
    fun clearAllCache() = clearCache()
}
