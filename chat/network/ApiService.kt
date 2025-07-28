package xyz.terracrypt.chat.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response
import xyz.terracrypt.chat.models.AddParticipantRequest
import xyz.terracrypt.chat.models.Chat
import xyz.terracrypt.chat.models.ChatMemberListResponse
import xyz.terracrypt.chat.models.CreateChatRequest
import xyz.terracrypt.chat.models.Friend
import xyz.terracrypt.chat.models.FriendRequest
import xyz.terracrypt.chat.models.FriendRequestParams
import xyz.terracrypt.chat.models.HealthStatus
import xyz.terracrypt.chat.models.Message
import xyz.terracrypt.chat.models.PublicKeysPayload
import xyz.terracrypt.chat.models.SignInCredentials
import xyz.terracrypt.chat.models.SignInResponse
import xyz.terracrypt.chat.models.SignUpParams
import xyz.terracrypt.chat.models.SignUpResponse
import xyz.terracrypt.chat.models.User
import xyz.terracrypt.chat.models.UserUpdateParams
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiService @Inject constructor(
    private val api: ApiInterface
) {
    companion object {
        private const val TAG = "ApiService"
    }

    suspend fun signIn(credentials: SignInCredentials): Result<SignInResponse> =
        executeApiCall("signIn") { api.signIn(credentials) }

    suspend fun signUp(params: SignUpParams): Result<SignUpResponse> =
        executeApiCall("signUp") { api.signUp(params) }

    suspend fun getMe(): Result<User> =
        executeApiCall("getMe") { api.getMe() }

    suspend fun updateUser(params: UserUpdateParams): Result<User> =
        executeApiCall("updateUser") { api.updateUser(params) }

    suspend fun getUserById(userId: String): Result<User> =
        executeApiCall("getUserById") { api.getUserById(userId) }

    suspend fun searchUsers(username: String): Result<List<User>> =
        executeApiCall("searchUsers") { api.searchUsers(username.trim()) }

    suspend fun createChat(request: CreateChatRequest): Result<Chat> =
        executeApiCall("createChat") { api.createChat(request) }

    suspend fun getChatMembers(chatId: String): Response<ChatMemberListResponse> =
        api.getChatMembers(chatId)

    suspend fun getMyChats(): Result<List<Chat>> =
        executeApiCall("getMyChats") { api.getMyChats() }.map { it.data }

    suspend fun deleteChat(chatId: String): Result<Unit> =
        executeVoidApiCall("deleteChat") { api.deleteChat(chatId) }

    suspend fun leaveChat(chatId: String): Result<Unit> =
        executeVoidApiCall("leaveChat") { api.leaveChat(chatId) }

    suspend fun addParticipantToChat(chatId: String, request: AddParticipantRequest): Result<Unit> =
        executeVoidApiCall("addParticipantToChat") { api.addParticipantToChat(chatId, request) }

    suspend fun removeParticipantFromChat(chatId: String, userId: String): Result<Unit> =
        executeVoidApiCall("removeParticipantFromChat") { api.removeParticipantFromChat(chatId, userId) }

    suspend fun getMessages(chatId: String, limit: Int? = null, before: String? = null): Result<List<Message>> =
        executeApiCall("getMessages") { api.getMessages(chatId, limit, before) }

    suspend fun getFriendsList(): Result<List<Friend>> =
        executeApiCall("getFriendsList") { api.getFriendsList() }

    suspend fun getPendingFriendRequests(): Result<List<FriendRequest>> =
        executeApiCall("getPendingFriendRequests") { api.getPendingFriendRequests() }

    suspend fun sendFriendRequest(receiverId: String, senderId: String): Boolean {
        return try {
            val response = api.sendFriendRequest(FriendRequestParams(receiverId, senderId))
            response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "Friend request failed: ${e.localizedMessage}")
            false
        }
    }

    suspend fun acceptFriendRequest(requestId: String): Boolean {
        return try {
            val response = api.acceptFriendRequest(requestId)
            response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "Accept request failed: ${e.localizedMessage}")
            false
        }
    }

    suspend fun declineFriendRequest(requestId: String): Boolean {
        return try {
            val response = api.declineFriendRequest(requestId)
            response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "Decline request failed: ${e.localizedMessage}")
            false
        }
    }

    suspend fun deleteFriend(friendId: String): Result<Unit> =
        executeVoidApiCall("deleteFriend") { api.deleteFriend(friendId) }


    suspend fun checkDbHealth(): Result<HealthStatus> =
        executeApiCall("checkDbHealth") { api.checkDbHealth() }

    // Current user's keys (already present)
    suspend fun getUserKeys(): Result<PublicKeysPayload> =
        executeApiCall("getUserKeys") { api.getUserKeys() }

    suspend fun addUserKeys(payload: PublicKeysPayload): Result<Unit> =
        executeVoidApiCall("addUserKeys") { api.addUserKeys(payload) }

    suspend fun updateUserKeys(payload: PublicKeysPayload): Result<Unit> =
        executeVoidApiCall("updateUserKeys") { api.updateUserKeys(payload) }

    // Add this for other user's keys
    suspend fun getOtherUserPublicKeys(userId: String): Result<PublicKeysPayload> =
        executeApiCall("getOtherUserPublicKeys") { api.getOtherUserPublicKeys(userId) }


    // =================== Universal Handlers ===================

    private suspend fun <T> executeApiCall(
        operation: String,
        apiCall: suspend () -> Response<T>
    ): Result<T> = withContext(Dispatchers.IO) {
        try {
            val response = apiCall()
            Log.d(TAG, "[$operation] Response code: ${response.code()}")
            Log.d(TAG, "[$operation] Raw: ${response.raw()}")

            if (!response.isSuccessful) {
                Log.e(TAG, "[$operation] Error Body: ${response.errorBody()?.string()}")
            }

            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    Result.success(body)
                } else {
                    Result.failure(Exception("[$operation] Response body is null."))
                }
            } else {
                Result.failure(Exception("[$operation] Error ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "[$operation] Exception: ${e.localizedMessage}", e)
            Result.failure(e)
        }
    }


    private suspend fun executeVoidApiCall(
        operation: String,
        apiCall: suspend () -> Response<Unit>
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiCall()
            Log.d(TAG, "[$operation] Void Response code: ${response.code()}")
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("[$operation] Error ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "[$operation] Exception: ${e.localizedMessage}", e)
            Result.failure(e)
        }
    }
}
