package xyz.terracrypt.chat.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import xyz.terracrypt.chat.models.AddParticipantRequest
import xyz.terracrypt.chat.models.Chat
import xyz.terracrypt.chat.models.ChatListResponse
import xyz.terracrypt.chat.models.ChatMemberListResponse
import xyz.terracrypt.chat.models.ChatRequest
import xyz.terracrypt.chat.models.ChatRequestParams
import xyz.terracrypt.chat.models.ChatRequestStatusParams
import xyz.terracrypt.chat.models.CreateChatRequest
import xyz.terracrypt.chat.models.Friend
import xyz.terracrypt.chat.models.FriendRequest
import xyz.terracrypt.chat.models.FriendRequestParams
import xyz.terracrypt.chat.models.HealthStatus
import xyz.terracrypt.chat.models.Message
import xyz.terracrypt.chat.models.PublicKeyInfo
import xyz.terracrypt.chat.models.PublicKeysPayload
import xyz.terracrypt.chat.models.SignInCredentials
import xyz.terracrypt.chat.models.SignInResponse
import xyz.terracrypt.chat.models.SignUpParams
import xyz.terracrypt.chat.models.SignUpResponse
import xyz.terracrypt.chat.models.User
import xyz.terracrypt.chat.models.UserUpdateParams

interface ApiInterface {

    @POST("/api/v1/auth/signin")
    suspend fun signIn(@Body credentials: SignInCredentials): Response<SignInResponse>

    @POST("/api/v1/auth/signup")
    suspend fun signUp(@Body params: SignUpParams): Response<SignUpResponse>

    @GET("/api/v1/users/me")
    suspend fun getMe(): Response<User>

    @GET("/api/v1/users/me")
    suspend fun getUserByEmailUsingToken(
        @Header("Authorization") authHeader: String
    ): Response<User>

    @GET("/api/v1/users/search")
    suspend fun searchUsers(@Query("username") username: String): Response<List<User>>

    @PUT("/api/v1/users")
    suspend fun updateUser(@Body user: UserUpdateParams): Response<User>

    @GET("/api/v1/users/{userId}")
    suspend fun getUserById(@Path("userId") userId: String): Response<User>

    @GET("/api/v1/chats")
    suspend fun getMyChats(): Response<ChatListResponse>

    @DELETE("/api/v1/chats/{chatId}")
    suspend fun deleteChat(@Path("chatId") chatId: String): Response<Unit>

    @GET("/api/v1/chats/{chat_id}/members")
    suspend fun getChatMembers(
        @Path("chat_id") chatId: String
    ): Response<ChatMemberListResponse>

    @POST("/api/v1/chat/request")
    suspend fun sendChatRequest(@Body request: ChatRequestParams): Response<Unit>

    @GET("/api/v1/chat/request/pending")
    suspend fun getPendingChatRequests(): Response<List<ChatRequest>>

    @PUT("/api/v1/chat/request/status")
    suspend fun changeChatRequestStatus(@Body status: ChatRequestStatusParams): Response<Unit>

    @GET("/api/v1/messages/{chatId}")
    suspend fun getMessages(
        @Path("chatId") chatId: String,
        @Query("limit") limit: Int? = null,
        @Query("before") before: String? = null
    ): Response<List<Message>>

    @GET("/api/v1/friends")
    suspend fun getFriendsList(): Response<List<Friend>>

    @GET("/api/v1/friends/request/pending")
    suspend fun getPendingFriendRequests(): Response<List<FriendRequest>>

    @POST("/api/v1/friends/request")
    suspend fun sendFriendRequest(
        @Body request: FriendRequestParams
    ): Response<Unit>

    @PUT("/api/v1/friends/request/{requestId}/accept")
    suspend fun acceptFriendRequest(@Path("requestId") requestId: String): Response<Unit>

    @PUT("/api/v1/friends/request/{requestId}/reject")
    suspend fun declineFriendRequest(@Path("requestId") requestId: String): Response<Unit>


    @DELETE("/api/v1/friends/{friendId}")
    suspend fun deleteFriend(
        @Path("friendId") friendId: String
    ): Response<Unit>


    @GET("/api/v1/user/public-key")
    suspend fun getUserPublicKeys(): Response<List<PublicKeyInfo>>

    @GET("/api/v1/db-health")
    suspend fun checkDbHealth(): Response<HealthStatus>

    @POST("/api/v1/chats/{chatId}/members")
    suspend fun addParticipantToChat(
        @Path("chatId") chatId: String,
        @Body participant: AddParticipantRequest
    ): Response<Unit> // CHANGED from AddParticipantResponse to Unit

    @DELETE("/api/v1/chats/{chatId}/members/{userId}")
    suspend fun removeParticipantFromChat(
        @Path("chatId") chatId: String,
        @Path("userId") userId: String
    ): Response<Unit> // CHANGED from LeaveChatResponse to Unit

    // OVO TREBA!
    @DELETE("/api/v1/chats/{chatId}/leave")
    suspend fun leaveChat(
        @Path("chatId") chatId: String
    ): Response<Unit>


    @POST("/api/v1/chats")
    suspend fun createChat(@Body request: CreateChatRequest): Response<Chat>


    @GET("/api/v1/users/keys")
    suspend fun getUserKeys(): Response<PublicKeysPayload>

    @POST("/api/v1/users/keys")
    suspend fun addUserKeys(@Body payload: PublicKeysPayload): Response<Unit>

    @PUT("/api/v1/users/keys")
    suspend fun updateUserKeys(@Body payload: PublicKeysPayload): Response<Unit>

    // Add this:
    @GET("/api/v1/users/{userId}/public-keys")
    suspend fun getOtherUserPublicKeys(
        @Path("userId") userId: String
    ): Response<PublicKeysPayload>





}
