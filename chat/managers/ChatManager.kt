package xyz.terracrypt.chat.managers

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.data.ChatDao
import xyz.terracrypt.chat.models.ChatEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatManager @Inject constructor(
    private val chatDao: ChatDao,
    //private val participantService: ParticipantService
) {

    private val ioScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    val chats: StateFlow<List<ChatEntity>> = chatDao
        .getAllChatsFlow()
        .stateIn(ioScope, SharingStarted.WhileSubscribed(5000), emptyList())

    suspend fun getChatUsingId(chatId: String): ChatEntity? {
        return chatDao.getChatById(chatId)
    }

    suspend fun getChatById(chatId: String): ChatEntity? {
        return withContext(Dispatchers.IO) {
            chatDao.getChatById(chatId)
        }
    }

    fun createOrUpdateChat(
        chatId: String,
        chatType: String,
        isGroup: Boolean,
        chatName: String? = null,
        groupName: String? = null,
        adminId: String? = null,
        unreadCount: Int? = null,
        description: String? = null,
        lastMessageContent: String? = null,
        lastMessageTimestamp: Long? = null,
        createdAt: Long,
        participants: String? = null,
        creatorId: String? = null // NEW
    ) {
        ioScope.launch {
            val existing = chatDao.getChatById(chatId)

            val updated = ChatEntity(
                chatId = chatId,
                chatType = chatType,
                isGroup = isGroup,
                chatName = chatName ?: existing?.chatName,
                groupName = groupName ?: existing?.groupName,
                adminId = adminId ?: existing?.adminId,
                unreadCount = unreadCount ?: existing?.unreadCount ?: 0,
                description = description ?: existing?.description,
                lastMessageContent = lastMessageContent ?: existing?.lastMessageContent,
                lastMessageTimestamp = lastMessageTimestamp ?: existing?.lastMessageTimestamp,
                createdAt = if (existing?.createdAt != null && existing.createdAt > 0) existing.createdAt else createdAt,
                participants = participants
                    ?.split(",")
                    ?.map { it.trim() }
                    ?.sorted()
                    ?.joinToString(",") ?: existing?.participants,
                creatorId = creatorId ?: existing?.creatorId // use new or fallback to old
            )

            chatDao.insertChat(updated)
            Log.d("ChatManager", "Inserted/Updated chat $chatId (group=$isGroup)")
        }
    }

    fun deleteChat(chatId: String) {
        ioScope.launch {
            try {
                chatDao.deleteById(chatId)
                Log.d("ChatManager", "Deleted chat $chatId from local DB")
            } catch (e: Exception) {
                Log.e("ChatManager", "Failed to delete chat $chatId: ${e.message}")
            }
        }
    }

    // Suspend verzija deleteChat
    suspend fun deleteChatSuspend(chatId: String) {
        try {
            withContext(Dispatchers.IO) {
                chatDao.deleteById(chatId)
            }
            Log.d("ChatManager", "Deleted chat $chatId from local DB (suspend)")
        } catch (e: Exception) {
            Log.e("ChatManager", "Failed to delete chat $chatId (suspend): ${e.message}")
        }
    }

    fun updateUnreadCount(chatId: String, count: Int) {
        ioScope.launch {
            try {
                chatDao.updateUnreadCount(chatId, count)
            } catch (e: Exception) {
                Log.e("ChatManager", "Error updating unread count: ${e.localizedMessage}")
            }
        }
    }

    // Suspend verzija updateUnreadCount
    suspend fun updateUnreadCountSuspend(chatId: String, count: Int) {
        try {
            withContext(Dispatchers.IO) {
                chatDao.updateUnreadCount(chatId, count)
            }
        } catch (e: Exception) {
            Log.e("ChatManager", "Error updating unread count (suspend): ${e.localizedMessage}")
        }
    }

    // Tracks the currently active chat screen
    var currentlyOpenChatId: String? = null
}
