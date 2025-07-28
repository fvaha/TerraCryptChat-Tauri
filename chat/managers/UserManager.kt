package xyz.terracrypt.chat.managers

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.data.UserDao
import xyz.terracrypt.chat.models.User
import xyz.terracrypt.chat.models.UserEntity
import xyz.terracrypt.chat.security.KeyStoreManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserManager @Inject constructor(
    private val userDao: UserDao
) {

    private var cachedUser: UserEntity? = null

    val currentUserId: String?
        get() = cachedUser?.userId

    suspend fun saveUserFromApi(user: User, token: String, password: String) = withContext(Dispatchers.IO) {
        val userId = user.id ?: run {
            Log.e("UserManager", "Cannot save user: user.id is null.")
            return@withContext
        }

        val encryptedPassword = KeyStoreManager.encrypt(password)

        val entity = UserEntity(
            userId = userId,
            username = user.username,
            email = user.email,
            name = user.name,
            password = encryptedPassword, // encrypted manually
            picture = user.picture,
            role = user.role,
            tokenHash = token,
            verified = user.verified,
            createdAt = user.createdAt?.toLongOrNull(),
            updatedAt = user.updatedAt?.toLongOrNull(),
            deletedAt = user.deletedAt?.toLongOrNull(),
            isDarkMode = false,
            lastSeen = System.currentTimeMillis()
        )


        userDao.insert(entity)
        refreshCache()
    }


    suspend fun saveUserEntityExternally(user: UserEntity) {
        userDao.insert(user)
        refreshCache()
    }

    suspend fun fetchLoggedInUser(): UserEntity? = withContext(Dispatchers.IO) {
        cachedUser ?: userDao.getFirstUser()?.also { cachedUser = it }
    }

    suspend fun clearLoggedInUser() = withContext(Dispatchers.IO) {
        userDao.clearUsers()
        clearCache()
    }

    suspend fun updateUserDarkMode(isDarkMode: Boolean) = withContext(Dispatchers.IO) {
        val user = cachedUser ?: userDao.getFirstUser()
        if (user != null) {
            val updated = user.copy(isDarkMode = isDarkMode)
            userDao.update(updated)
            cachedUser = updated
        }
    }

    suspend fun updateUserAccessToken(token: String) = withContext(Dispatchers.IO) {
        val user = cachedUser ?: userDao.getFirstUser()
        if (user != null) {
            val updatedUser = user.copy(tokenHash = token)
            userDao.update(updatedUser)
            cachedUser = updatedUser
        }
    }

    fun clearCache() {
        cachedUser = null
    }

    private suspend fun refreshCache() {
        cachedUser = withContext(Dispatchers.IO) {
            userDao.getFirstUser()
        }
    }
}
