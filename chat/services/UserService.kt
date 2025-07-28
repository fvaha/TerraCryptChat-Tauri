package xyz.terracrypt.chat.services

import android.util.Log
import dagger.Lazy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.managers.TokenManager
import xyz.terracrypt.chat.managers.UserManager
import xyz.terracrypt.chat.models.SignInCredentials
import xyz.terracrypt.chat.models.SignUpParams
import xyz.terracrypt.chat.models.User
import xyz.terracrypt.chat.models.UserEntity
import xyz.terracrypt.chat.network.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserService @Inject constructor(
    private val userManager: UserManager,
    private val tokenManager: Lazy<TokenManager>,
    private val apiService: Lazy<ApiService>
) {

    companion object {
        private const val TAG = "UserService"
    }

    // MARK: - User ID
    fun getCurrentUserId(): String? = userManager.currentUserId

    // MARK: - Get User from Room
    suspend fun getLoggedInUser(): UserEntity? = userManager.fetchLoggedInUser()

    // MARK: - Sign In
    // stari potpis
// suspend fun signIn(email: String, password: String): Boolean = withContext(Dispatchers.IO) {

    // novi potpis
    suspend fun signIn(username: String, password: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val credentials = SignInCredentials(username, password)
            val result = apiService.get().signIn(credentials)

            if (result.isSuccess) {
                val accessToken = result.getOrNull()?.accessToken ?: return@withContext false

                withContext(NonCancellable) {
                    tokenManager.get().updateAccessToken(accessToken)
                    tokenManager.get().updateCredentials(username, password) // ovde šalji username
                    userManager.updateUserAccessToken(accessToken)
                }

                val userResult = apiService.get().getMe()
                if (userResult.isSuccess) {
                    val user = userResult.getOrNull()
                    if (user != null) {
                        userManager.saveUserFromApi(user, accessToken, password)
                        return@withContext true
                    }
                }
            }

            false
        } catch (e: Exception) {
            Log.e(TAG, "Sign-in error: ${e.localizedMessage}", e)
            false
        }
    }


    // MARK: - Sign Up
    suspend fun signUp(params: SignUpParams): Boolean = withContext(Dispatchers.IO) {
        try {
            val result = apiService.get().signUp(params)
            if (result.isSuccess) {
                val accessToken = result.getOrNull()?.accessToken ?: return@withContext false

                // ✅ Save token before calling getMe(), so interceptor works
                withContext(NonCancellable) {
                    tokenManager.get().updateAccessToken(accessToken)
                    tokenManager.get().updateCredentials(params.email, params.password)
                    userManager.updateUserAccessToken(accessToken)
                }

                // ✅ Safe to call now — interceptor will use the saved token
                val userResult = apiService.get().getMe()
                if (userResult.isSuccess) {
                    val user = userResult.getOrNull()!!
                    withContext(NonCancellable) {
                        userManager.saveUserFromApi(user, accessToken, params.password)
                    }
                    return@withContext true
                } else {
                    Log.e(TAG, "getMe failed: ${userResult.exceptionOrNull()?.message}")
                }
            }
            false
        } catch (e: Exception) {
            Log.e(TAG, "Sign-up error: ${e.localizedMessage}", e)
            false
        }
    }




    // UserService.kt
    suspend fun clearLoggedInUser() {
        userManager.clearLoggedInUser()  // This calls the UserManager to clear the user data
    }

    // MARK: - Access Token
    suspend fun getAccessToken(): String? {
        val token = tokenManager.get().getAccessToken()
        if (token.isNullOrEmpty()) {
            throw Exception("Access token is empty.")
        }
        return token
    }

    // MARK: - Update User Profile
    suspend fun updateProfile(name: String, username: String, email: String): UserEntity? = withContext(Dispatchers.IO) {
        try {
            val current = userManager.fetchLoggedInUser() ?: return@withContext null

            val updatedUser = current.copy(
                name = name,
                username = username,
                email = email,
                updatedAt = System.currentTimeMillis()
            )

            userManager.saveUserEntityExternally(updatedUser)
            updatedUser
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update user profile: ${e.localizedMessage}", e)
            null
        }
    }

    // MARK: - Resolve Username by User ID
    suspend fun getUsernameById(userId: String): String {
        return try {
            val user = getUserById(userId)
            user.username
        } catch (_: Exception) {
            "Unknown"
        }
    }

    // MARK: - Get Full User by ID
    suspend fun getUserById(userId: String): User = withContext(Dispatchers.IO) {
        val result = apiService.get().getUserById(userId)
        if (result.isSuccess) {
            result.getOrThrow()
        } else {
            throw Exception("Failed to fetch user by ID: $userId")
        }
    }

}
