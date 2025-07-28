package xyz.terracrypt.chat.managers

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CacheManager @Inject constructor(
    private val participantManager: ParticipantManager,
    private val friendManager: FriendManager,
    private val userManager: UserManager,
    // Uncomment below if chatManager caching is later supported
    // private val chatManager: ChatManager
) {

    fun clearAll() {
        participantManager.clearAllCache()
        friendManager.clearCache()
        userManager.clearCache()
        // chatManager.clearCache() // Uncomment if chatManager adds caching
    }

    // Individual scoped clears
    fun clearParticipants() = participantManager.clearAllCache()
    fun clearFriends() = friendManager.clearCache()
    fun clearUsers() = userManager.clearCache()

    // fun clearChats() = chatManager.clearCache() // Optional if needed
}
