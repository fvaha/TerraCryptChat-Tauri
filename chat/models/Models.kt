package xyz.terracrypt.chat.models

import androidx.room.Entity
import androidx.room.Ignore
import androidx.room.Index
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import xyz.terracrypt.chat.security.KeyStoreManager

//========== USER ==========

// Room Entity
@Entity(tableName = "user")
data class UserEntity(
    @PrimaryKey val userId: String,
    val username: String,
    val email: String?,
    val name: String?,
    val password: String?,
    val picture: String?,
    val role: String?,
    val tokenHash: String?,
    val verified: Boolean = false,
    val createdAt: Long?,
    val updatedAt: Long?,
    val deletedAt: Long?,
    val isDarkMode: Boolean = false,
    val lastSeen: Long? = null
)

// API Model
data class User(
    @SerializedName("user_id") val id: String?,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("username") val username: String,
    @SerializedName("role") val role: String,
    @SerializedName("picture") val picture: String? = null,
    @SerializedName("verified") val verified: Boolean,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,
    @SerializedName("deleted_at") val deletedAt: String? = null
)

data class UserResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("picture") val picture: String,
    @SerializedName("verified") val verified: Boolean,
    @SerializedName("role") val role: String
)

data class UserLite(
    @SerializedName("user_id") val userId: String,
    val name: String,
    val email: String,
    val username: String
)

data class UserUpdateParams(
    @SerializedName("username") val username: String?,
    @SerializedName("picture") val picture: String?
)

//========== AUTH ==========

data class SignInCredentials(
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String
)


data class SignUpParams(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("username") val username: String,
    @SerializedName("name") val name: String? = null
)

data class SignInResponse(
    @SerializedName("access_token") val accessToken: String
)

data class SignUpResponse(
    @SerializedName("access_token") val accessToken: String
)

fun UserEntity.getDecryptedPassword(): String? {
    return password?.let { KeyStoreManager.decrypt(it) }
}

//========== FRIEND ==========

@Entity(tableName = "friend")
data class FriendEntity(
    @PrimaryKey val friendId: String,
    val username: String,
    val email: String,
    val name: String,
    val picture: String?,
    val createdAt: Long?,
    val updatedAt: Long?,
    val status: String?,
    val isFavorite: Boolean = false
)

data class Friend(
    @SerializedName("user_id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("picture") val picture: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("status") val status: String?,
    @SerializedName("is_favorite") val isFavorite: Boolean?
)

data class FriendRequest(
    @SerializedName("request_id") val id: String,
    @SerializedName("receiver_id") val receiverId: String,
    @SerializedName("sender") val sender: SenderInfo,
    @SerializedName("status") val status: String,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
)

data class SenderInfo(
    @SerializedName("user_id") val userId: String,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String
)

data class FriendSearchResult(
    @SerializedName("user_id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("role") val role: String,
    @SerializedName("verified") val verified: Boolean,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
)

data class FriendRequestParams(
    @SerializedName("receiver_id") val receiverId: String,
    @SerializedName("sender_id") val senderId: String
)

@Serializable
data class RequestNotificationWrapper(
    val message: RequestNotification,
    val type: String
)

@Serializable
data class RequestNotification(
    @SerialName("request_id") val requestId: String,
    @SerialName("sender_id") val senderId: String,
    @SerialName("receiver_id") val receiverId: String,
    @SerialName("status") val status: String,
    @SerialName("timestamp") val timestamp: String
)
//========== CHAT ==========

@Entity(tableName = "chat")
data class ChatEntity(
    @PrimaryKey val chatId: String,
    val chatType: String,
    val chatName: String?,
    val createdAt: Long,
    val adminId: String?,
    val unreadCount: Int = 0,
    val description: String?,
    val groupName: String?,
    val lastMessageContent: String?,
    val lastMessageTimestamp: Long?,
    val participants: String?,
    val isGroup: Boolean,
    val creatorId: String? = null
)


data class Chat(
    @SerializedName("chat_id") val chatId: String,
    @SerializedName("is_group") val isGroup: Boolean,
    @SerializedName("name") val chatName: String,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("group_name") val groupName: String? = null,
    @SerializedName("admin_id") val adminId: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("creator_id") val creatorId: String? = null
)


data class ChatListResponse(
    val data: List<Chat>,
    val limit: Int,
    val offset: Int
)

data class ChatRequest(
    @SerializedName("id") val id: String,
    @SerializedName("fromUser") val fromUser: User,
    @SerializedName("status") val status: String
)


data class CreateChatRequest(
    val name: String,
    @SerializedName("is_group") val isGroup: Boolean,
    val members: List<ChatMember>
)

data class ChatMember(
    @SerializedName("user_id") val userId: String,
    @SerializedName("is_admin") val isAdmin: Boolean? = null
)

data class ChatRequestParams(
    @SerializedName("targetUserId") val targetUserId: String
)

data class ChatRequestStatusParams(
    @SerializedName("requestId") val requestId: String,
    @SerializedName("status") val status: String
)

data class ChatNotificationWrapper(
    val message: ChatNotificationMessage,
    val type: String
)


data class ChatNotificationMessage(
    @SerializedName("chat_id") val chatId: String,
    @SerializedName("creator_id") val creatorId: String,
    @SerializedName("name") val name: String,
    @SerializedName("is_group") val isGroup: Boolean,
    @SerializedName("timestamp") val timestamp: String,
    @SerializedName("members") val members: List<String>,
    @SerializedName("action") val action: String
)

//========== PARTICIPANT ==========

@Entity(tableName = "participant")
data class ParticipantEntity(
    @PrimaryKey val participantId: String,
    val userId: String,
    val username: String,
    val joinedAt: Long,
    val role: String,
    val chatId: String
)

data class Participant(
    @SerializedName("participant_id") val participantId: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("username") val username: String,
    @SerializedName("joined_at") val joinedAt: String,
    @SerializedName("role") var role: String
)

data class ParticipantResponse(
    @SerializedName("chat_id") val chatId: String,
    @SerializedName("is_admin") val isAdmin: Boolean,
    @SerializedName("joined_at") val joinedAt: String,
    @SerializedName("user") val user: ParticipantUserResponse
)

data class ParticipantUserResponse(
    @SerializedName("user_id") val userId: String,
    @SerializedName("username") val username: String,
    val role: String
)

data class ChatMemberListResponse(
    val data: List<ParticipantMemberResponse>,
    val limit: Int,
    val offset: Int
)

data class ParticipantMemberResponse(
    @SerializedName("chat_id") val chatId: String,
    @SerializedName("is_admin") val isAdmin: Boolean,
    @SerializedName("joined_at") val joinedAt: String,
    val user: UserLite
)

data class AddParticipantRequest(
    @SerializedName("members") val members: List<ChatMember>
)

data class AddParticipantResponse(
    @SerializedName("success") val success: Boolean
)

//========== MESSAGE ==========

@Entity(
    tableName = "message",
    indices = [
        Index(value = ["messageId"], unique = false), // server id NIJE unique dok ne dođe ACK!
        Index(value = ["clientMessageId"], unique = true)
    ]
)
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val messageId: String?,           // Server ID, može biti null dok čekaš ACK!
    val clientMessageId: String,      // UVEK prisutan! UUID koji generišeš lokalno
    val chatId: String,
    val senderId: String,
    val content: String,
    val timestamp: Long,
    val isRead: Boolean,
    val isSent: Boolean,
    val isDelivered: Boolean = false,
    val isFailed: Boolean = false,
    val senderUsername: String? = null,
    val replyToMessageId: String? = null
) {
    @Ignore var profilePictureUrl: String? = null
    @Ignore var replyPreviewSender: String? = null
    @Ignore var replyPreviewText: String? = null
    @Ignore var bubbleColorHex: String? = null

    constructor(
        messageId: String?,
        clientMessageId: String,
        chatId: String,
        senderId: String,
        content: String,
        timestamp: Long,
        isRead: Boolean,
        isSent: Boolean,
        isDelivered: Boolean = false,
        isFailed: Boolean = false,
        senderUsername: String? = null,
        replyToMessageId: String? = null,
        profilePictureUrl: String? = null,
        replyPreviewSender: String? = null,
        replyPreviewText: String? = null,
        bubbleColorHex: String? = null
    ) : this(
        id = 0,
        messageId = messageId,
        clientMessageId = clientMessageId,
        chatId = chatId,
        senderId = senderId,
        content = content,
        timestamp = timestamp,
        isRead = isRead,
        isSent = isSent,
        isDelivered = isDelivered,
        isFailed = isFailed,
        senderUsername = senderUsername,
        replyToMessageId = replyToMessageId
    ) {
        this.profilePictureUrl = profilePictureUrl
        this.replyPreviewSender = replyPreviewSender
        this.replyPreviewText = replyPreviewText
        this.bubbleColorHex = bubbleColorHex
    }
}

// --- Network/Data models (unchanged) ---

data class Message(
    @SerializedName("id") val id: String,
    @SerializedName("content") val content: String,
    @SerializedName("timestamp") val timestamp: String,
    @SerializedName("senderId") val senderId: String,
    @SerializedName("chatId") val chatId: String,
    @SerializedName("isRead") val isRead: Boolean,
    @SerializedName("isSent") val isSent: Boolean,
    @SerializedName("isDelivered") val isDelivered: Boolean,
    @SerializedName("senderName") val senderName: String?
)

@Serializable
data class ChatMessageWrapper(
    val message: ChatMessage,
    val type: String
)

@Serializable
data class OutgoingChatMessage(
    @SerializedName("chat_id") val chatId: String,
    @SerializedName("content") val content: String
)

@Serializable
data class OutgoingChatMessageWrapper(
    val message: OutgoingChatMessage,
    @SerialName("client_message_id") val clientMessageId: String,
    val type: String
)

@Serializable
data class ChatMessage(
    @SerializedName("message_id") val messageId: String,
    @SerializedName("chat_id") val chatId: String,
    @SerializedName("sender_id") val senderId: String,
    @SerializedName("content") val messageText: String,
    @SerializedName("sent_at") val sentAt: String
)
//========== RESPONSES & STATUS ==========

data class LeaveChatResponse(
    @SerializedName("success") val success: Boolean
)

data class RegistrationResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?
)

data class ErrorResponse(
    @SerializedName("code") val code: Int,
    @SerializedName("message") val message: String
)

data class PublicKeyInfo(
    @SerializedName("userId") val userId: String,
    @SerializedName("key") val key: String
)

data class HealthStatus(
    @SerializedName("healthy") val healthy: Boolean
)

//========== WEBSOCKET MODELS ==========

data class ConnectionStatusMessage(
    @SerializedName("message") val message: ConnectionStatusPayload,
    @SerializedName("type") val type: String
)

data class ConnectionStatusPayload(
    @SerializedName("status") val status: String,
    @SerializedName("timestamp") val timestamp: String
)

data class MessageStatusMessage(
    @SerializedName("message") val message: MessageStatusPayload,
    @SerializedName("type") val type: String
)

data class MessageStatusPayload(
    @SerializedName("message_id") val messageId: String?,
    @SerializedName("client_message_id") val clientMessageId: String?,
    @SerializedName("status") val status: String,
    @SerializedName("chat_id") val chatId: String?,
    @SerializedName("sender_id") val senderId: String?,
    @SerializedName("recipient_id") val recipientId: String? = null,
    @SerializedName("timestamp") val timestamp: String,

    // za bulk 'read' status
    @SerializedName("message_ids") val messageIds: List<String>? = null
)


data class ErrorWebSocketMessage(
    @SerializedName("message") val message: String,
    @SerializedName("type") val type: String = "error"
)

data class InfoWebSocketMessage(
    @SerializedName("message") val message: String,
    @SerializedName("type") val type: String = "info"
)

//========== ENUMS ==========

enum class Role {
    ADMIN,
    MEMBER
}

@Entity(tableName = "user_keys")
data class KeyEntity(
    @PrimaryKey val userId: String,
    val key1: String,
    val key2: String,
    val key3: String,
    val key4: String,
    val privateKey1: String,
    val privateKey2: String,
    val privateKey3: String,
    val privateKey4: String
)

data class PublicKeysPayload(
    @SerializedName("key_1") val key1: String,
    @SerializedName("key_2") val key2: String,
    @SerializedName("key_3") val key3: String,
    @SerializedName("key_4") val key4: String
)