package xyz.terracrypt.chat.services

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.managers.ChatManager
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.ChatEntity
import xyz.terracrypt.chat.models.ChatMember
import xyz.terracrypt.chat.models.CreateChatRequest
import xyz.terracrypt.chat.network.ApiService
import xyz.terracrypt.chat.utils.ISO8601DateFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatService @Inject constructor(
    private val chatManager: ChatManager,
    private val apiService: ApiService,
    private val userService: UserService,
    private val participantService: ParticipantService,
    private val sessionManager: SessionManager
) {

    val chats: StateFlow<List<ChatEntity>> = chatManager.chats

    // === WebSocket EVENT-OVI ===
    private val _chatCreated = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val chatCreated: SharedFlow<String> = _chatCreated

    private val _chatDeleted = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val chatDeleted: SharedFlow<String> = _chatDeleted

    // NOVI flow za osvežavanje učesnika i avatara chata
    private val _chatParticipantsUpdated = MutableSharedFlow<String>(extraBufferCapacity = 5)
    val chatParticipantsUpdated: SharedFlow<String> = _chatParticipantsUpdated

    fun notifyChatCreated(chatId: String) {
        _chatCreated.tryEmit(chatId)
    }

    fun notifyChatDeleted(chatId: String) {
        _chatDeleted.tryEmit(chatId)
    }

    fun notifyChatParticipantsUpdated(chatId: String) {
        _chatParticipantsUpdated.tryEmit(chatId)
    }

    var currentlyOpenChatId: String?
        get() = chatManager.currentlyOpenChatId
        set(value) {
            chatManager.currentlyOpenChatId = value
        }

    suspend fun getDirectChatOtherUsername(chatId: String): String? = withContext(Dispatchers.IO) {
        val myUserId = sessionManager.getCurrentUserId() ?: return@withContext null
        val participants = participantService.getCachedParticipants(chatId)
        participants.firstOrNull { it.userId != myUserId }?.username
    }

    suspend fun syncChatsWithAPI() {
        try {
            val response = apiService.getMyChats()
            if (response.isSuccess) {
                val apiChats = response.getOrNull() ?: return
                val serverChatIds = apiChats.map { it.chatId }.toSet()
                val localChats = chatManager.chats.value
                val localChatIds = localChats.map { it.chatId }.toSet()

                for (chat in apiChats) {
                    val chatId = chat.chatId
                    val isGroup = chat.isGroup

                    var chatName: String? = null
                    if (!isGroup) {
                        chatName = chat.chatName

                        // Ako chatName nije postavljen ili je default (npr. "Direct Chat"), pokušaj da izvadiš iz participants
                        if (chatName.isNullOrBlank() || chatName == "Direct Chat") {
                            chatName = getDirectChatOtherUsername(chatId)
                        }
                    }

                    val groupName = if (isGroup) chat.groupName ?: chat.chatName else null
                    val adminId = chat.adminId
                    val creatorId = chat.creatorId
                    val description = chat.description
                    val createdAtMillis = ISO8601DateFormatter.parseIsoToMillis(chat.createdAt)

                    val existing = chatManager.getChatUsingId(chatId)
                    chatManager.createOrUpdateChat(
                        chatId = chatId,
                        chatType = if (isGroup) "group" else "direct",
                        isGroup = isGroup,
                        chatName = chatName,
                        groupName = groupName,
                        adminId = adminId,
                        description = description,
                        createdAt = createdAtMillis,
                        lastMessageContent = existing?.lastMessageContent,
                        lastMessageTimestamp = existing?.lastMessageTimestamp,
                        unreadCount = existing?.unreadCount ?: 0,
                        participants = existing?.participants,
                        creatorId = creatorId
                    )
                }

                val orphanedChatIds = localChatIds - serverChatIds
                orphanedChatIds.forEach { chatId ->
                    chatManager.deleteChat(chatId)
                    Log.d("ChatService", "Deleted local-only chat: $chatId")
                }
            } else {
                val errorMsg = response.exceptionOrNull()?.message ?: "Unknown error"
                Log.e("ChatService", "syncChatsWithAPI failed: $errorMsg")
            }
        } catch (e: Exception) {
            Log.e("ChatService", "Exception syncing chats: ${e.localizedMessage}", e)
        }
    }


    suspend fun deleteChat(chatId: String) {
        try {
            chatManager.deleteChat(chatId)
            Log.d("ChatService", "Deleted chat $chatId (local and via WS or API)")
        } catch (e: Exception) {
            Log.e("ChatService", "Failed to delete chat $chatId: ${e.localizedMessage}")
        }
    }

    suspend fun deleteChatFromServer(chatId: String) {
        val result = apiService.deleteChat(chatId)
        if (result.isSuccess) {
            chatManager.deleteChat(chatId)
            Log.d("ChatService", "Deleted chat $chatId successfully")
        } else {
            Log.e("ChatService", "Failed to delete chat $chatId: ${result.exceptionOrNull()?.message}")
            throw result.exceptionOrNull() ?: Exception("Unknown error deleting chat")
        }
    }

    fun updateUnreadCount(chatId: String, count: Int) {
        try {
            chatManager.updateUnreadCount(chatId, count)
        } catch (e: Exception) {
            Log.e("ChatService", "Failed to update unread count: ${e.localizedMessage}")
        }
    }

    suspend fun createChat(
        name: String,
        participantIds: List<String>
    ): String? {
        return try {
            val currentUserId = sessionManager.getCurrentUserId() ?: return null

            val allIds = (participantIds + currentUserId).distinct()
            val isGroup = allIds.size > 2

            val chatName = if (!isGroup) {
                val friendId = allIds.first { it != currentUserId }
                val fetchedUsername = userService.getUsernameById(friendId)
                fetchedUsername?.takeIf { it.isNotBlank() } ?: name.takeIf { it.isNotBlank() } ?: "Direct Chat"
            } else {
                name
            }

            val memberPayload = allIds.map { userId ->
                if (userId == currentUserId) {
                    ChatMember(userId = userId, isAdmin = true)
                } else {
                    ChatMember(userId = userId)
                }
            }

            val createRequest = CreateChatRequest(
                name = chatName,
                isGroup = isGroup,
                members = memberPayload
            )


            val result = apiService.createChat(createRequest)
            val createdChat = result.getOrNull() ?: return null
            val createdAtMillis = ISO8601DateFormatter.parseIsoToMillis(createdChat.createdAt)

            chatManager.createOrUpdateChat(
                chatId = createdChat.chatId,
                chatType = if (isGroup) "group" else "direct",
                isGroup = isGroup,
                chatName = if (!isGroup) chatName else null,
                groupName = if (isGroup) name else null,
                adminId = createdChat.adminId,
                description = createdChat.description,
                createdAt = createdAtMillis,
                participants = allIds.joinToString(","),
                creatorId = currentUserId
            )

            participantService.syncParticipantsWithAPI(createdChat.chatId)
            return createdChat.chatId
        } catch (e: Exception) {
            Log.e("ChatService", "createChat failed: ${e.localizedMessage}", e)
            null
        }
    }

    suspend fun createOrUpdateChat(
        chatId: String,
        chatType: String,
        isGroup: Boolean,
        chatName: String? = null,
        groupName: String? = null,
        adminId: String? = null,
        description: String? = null,
        createdAt: Long,
        lastMessageContent: String? = null,
        lastMessageTimestamp: Long? = null,
        unreadCount: Int = 0,
        participants: String? = null,
        creatorId: String? = null
    ) {
        chatManager.createOrUpdateChat(
            chatId = chatId,
            chatType = chatType,
            isGroup = isGroup,
            chatName = chatName,
            groupName = groupName,
            adminId = adminId,
            description = description,
            createdAt = createdAt,
            lastMessageContent = lastMessageContent,
            lastMessageTimestamp = lastMessageTimestamp,
            unreadCount = unreadCount,
            participants = participants,
            creatorId = creatorId
        )
    }

    suspend fun getChatById(chatId: String): ChatEntity? {
        return chatManager.getChatUsingId(chatId)
    }

    fun getChatWithFriend(friendUsername: String): ChatEntity? {
        val currentUsername = sessionManager.getCurrentUsername()
        return chatManager.chats.value.firstOrNull { chat ->
            !chat.isGroup &&
                    chat.participants != null &&
                    chat.participants
                        .split(",")
                        .map { it.trim() }
                        .toSet() == setOf(currentUsername, friendUsername)
        }
    }

    @Suppress("unused")
    suspend fun updateChatParticipants(chatId: String, participants: String) {
        val existing = chatManager.getChatById(chatId)
        if (existing != null && existing.participants != participants) {
            chatManager.createOrUpdateChat(
                chatId = existing.chatId,
                chatType = existing.chatType,
                isGroup = existing.isGroup,
                chatName = existing.chatName,
                groupName = existing.groupName,
                adminId = existing.adminId,
                unreadCount = existing.unreadCount,
                description = existing.description,
                lastMessageContent = existing.lastMessageContent,
                lastMessageTimestamp = existing.lastMessageTimestamp,
                createdAt = existing.createdAt,
                participants = participants,
                creatorId = existing.creatorId
            )
        }
    }

    suspend fun updateChatWithAdmin(chatId: String, adminId: String?, participants: String) {
        val existing = chatManager.getChatById(chatId)
        if (existing != null) {
            chatManager.createOrUpdateChat(
                chatId = existing.chatId,
                chatType = existing.chatType,
                isGroup = existing.isGroup,
                chatName = existing.chatName,
                groupName = existing.groupName,
                adminId = adminId,
                unreadCount = existing.unreadCount,
                description = existing.description,
                createdAt = existing.createdAt,
                lastMessageContent = existing.lastMessageContent,
                lastMessageTimestamp = existing.lastMessageTimestamp,
                participants = participants,
                creatorId = existing.creatorId
            )
        }
    }

    fun parseIsoTimestamp(iso: String?): Long {
        return try {
            java.time.Instant.parse(iso).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }

    fun isCurrentUserCreator(chat: ChatEntity?): Boolean {
        val currentUserId = sessionManager.getCurrentUserId()
        return chat?.creatorId == currentUserId
    }

    suspend fun deleteChatIfCreator(chatId: String) {
        val chat = getChatById(chatId)
        if (!isCurrentUserCreator(chat)) {
            throw Exception("Only the creator can delete this chat.")
        }
        val result = apiService.deleteChat(chatId)
        if (result.isSuccess) {
            chatManager.deleteChat(chatId)
            Log.d("ChatService", "Deleted chat $chatId (by creator)")
        } else {
            Log.e("ChatService", "Failed to delete chat $chatId: ${result.exceptionOrNull()?.message}")
            throw result.exceptionOrNull() ?: Exception("Unknown error deleting chat")
        }
    }

    suspend fun leaveChat(chatId: String) {
        val userId = sessionManager.getCurrentUserId() ?: throw Exception("User not logged in")
        val result = apiService.leaveChat(chatId)
        if (result.isFailure) {
            val ex = result.exceptionOrNull()
            val msg = ex?.message?.lowercase() ?: ""
            if (msg.contains("404") || msg.contains("not a member")) {
                Log.w("ChatService", "User $userId already not member of chat $chatId, treating as success.")
            } else {
                throw Exception("Failed to leave chat: ${ex?.message}")
            }
        }
        participantService.removeParticipant(chatId, userId)
        chatManager.deleteChat(chatId)
        Log.d("ChatService", "User $userId left chat $chatId (local data removed)")
    }

    suspend fun refreshDirectChatNames() {
        val chats = chatManager.chats.value
        val myUserId = sessionManager.getCurrentUserId() ?: return

        for (chat in chats) {
            if (!chat.isGroup) {
                val participants = participantService.getCachedParticipants(chat.chatId)
                val otherUser = participants.firstOrNull { it.userId != myUserId }
                val properName = otherUser?.username ?: "Direct Chat"
                if (chat.chatName != properName) {
                    chatManager.createOrUpdateChat(
                        chatId = chat.chatId,
                        chatType = "direct",
                        isGroup = false,
                        chatName = properName,
                        groupName = null,
                        adminId = chat.adminId,
                        description = chat.description,
                        createdAt = chat.createdAt,
                        lastMessageContent = chat.lastMessageContent,
                        lastMessageTimestamp = chat.lastMessageTimestamp,
                        unreadCount = chat.unreadCount,
                        participants = chat.participants,
                        creatorId = chat.creatorId
                    )
                    _chatParticipantsUpdated.emit(chat.chatId)
                }
            }
        }
    }


    // --- Novo: metoda za WS event "chat created"
    suspend fun handleChatCreatedEvent(
        chatId: String,
        isGroup: Boolean,
        name: String?,
        creatorId: String,
        timestampIso: String,
        members: List<String>
    ) {
        createOrUpdateChat(
            chatId = chatId,
            chatType = if (isGroup) "group" else "direct",
            isGroup = isGroup,
            chatName = if (!isGroup) name else null,
            groupName = if (isGroup) name else null,
            adminId = creatorId,
            description = null,
            createdAt = parseIsoTimestamp(timestampIso),
            lastMessageContent = "Chat created",
            lastMessageTimestamp = System.currentTimeMillis(),
            unreadCount = 0,
            participants = members.sorted().joinToString(","),
            creatorId = creatorId
        )
        notifyChatCreated(chatId)

        // SINHRONIZUJ učesnike chata da osvežiš cache učesnika i avatara
        participantService.syncParticipantsWithAPI(chatId)

        // OBAVESTI ViewModel/UI da su učesnici i avatari chata osveženi
        notifyChatParticipantsUpdated(chatId)
    }
}
