package xyz.terracrypt.chat.services

import dagger.Lazy
import xyz.terracrypt.chat.managers.ParticipantManager
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.AddParticipantRequest
import xyz.terracrypt.chat.models.ChatMember
import xyz.terracrypt.chat.models.ParticipantEntity
import xyz.terracrypt.chat.models.ParticipantUserResponse
import xyz.terracrypt.chat.network.ApiService
import xyz.terracrypt.chat.utils.ISO8601DateFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ParticipantService @Inject constructor(
    private val participantManager: ParticipantManager,
    private val apiService: ApiService,
    private val chatService: Lazy<ChatService>,
    private val sessionManager: SessionManager
) {

    suspend fun addParticipants(
        chatId: String,
        participantIds: List<String>,
        adminIds: List<String> = emptyList()
    ) {
        try {
            val filtered = participantIds.filterNot {
                participantManager.isParticipantInChat(chatId, it)
            }

            if (filtered.isEmpty()) return

            val members = filtered.map { userId ->
                ChatMember(
                    userId = userId,
                    isAdmin = adminIds.contains(userId)
                )
            }


            val result = apiService.addParticipantToChat(chatId, AddParticipantRequest(members))
            if (result.isFailure) {
                throw Exception("API add failed: ${result.exceptionOrNull()?.message}")
            }

            val participants = filtered.map { userId ->
                userId to getUsernameForUserId(userId)
            }

            participantManager.addParticipants(participants, chatId, adminIds)
            syncParticipantsWithAPI(chatId)

        } catch (e: Exception) {
            throw Exception("Failed to add participants: ${e.localizedMessage}", e)
        }
    }

    suspend fun removeParticipant(chatId: String, userId: String) {
        try {
            val result = apiService.removeParticipantFromChat(chatId, userId)
            if (result.isFailure) {
                throw Exception("API remove failed: ${result.exceptionOrNull()?.message}")
            }

            participantManager.deleteParticipant(userId, chatId)
            syncParticipantsWithAPI(chatId)

        } catch (e: Exception) {
            throw Exception("Failed to remove participant: ${e.localizedMessage}", e)
        }
    }

    suspend fun fetchParticipants(chatId: String): List<ParticipantEntity> {
        return participantManager.fetchParticipants(chatId)
    }

    suspend fun fetchParticipant(chatId: String, userId: String): ParticipantEntity? {
        return participantManager.fetchParticipant(chatId, userId)
    }

    suspend fun updateParticipantRole(chatId: String, userId: String, newRole: String): Boolean {
        try {
            // Correct: Fetch by userId
            val participant = participantManager.fetchParticipant(chatId, userId)
                ?: throw Exception("Participant not found")

            val removeResult = apiService.removeParticipantFromChat(chatId, userId)
            if (removeResult.isFailure) {
                throw Exception("Failed to remove user for role change: ${removeResult.exceptionOrNull()?.message}")
            }

            val addResult = apiService.addParticipantToChat(
                chatId,
                AddParticipantRequest(
                    members = listOf(ChatMember(userId = userId, isAdmin = newRole == "admin"))
                )
            )
            if (addResult.isFailure) {
                throw Exception("Failed to re-add user with new role: ${addResult.exceptionOrNull()?.message}")
            }

            val updated = participantManager.updateParticipantRole(participant.participantId, newRole, chatId)
            syncParticipantsWithAPI(chatId)
            return updated

        } catch (e: Exception) {
            throw Exception("Failed to update participant role: ${e.localizedMessage}", e)
        }
    }


    suspend fun leaveChat(chatId: String) {
        val userId = sessionManager.getCurrentUserId() ?: throw Exception("User not logged in")

        val participants = participantManager.fetchParticipants(chatId)
        val adminCount = participants.count { it.role == "admin" }
        val isCurrentUserAdmin = participants.any { it.userId == userId && it.role == "admin" }

        if (adminCount == 1 && isCurrentUserAdmin) {
            throw Exception("You are the only admin. Promote another user before leaving.")
        }

        val result = apiService.leaveChat(chatId)
        if (result.isFailure) {
            throw Exception("Failed to leave chat: ${result.exceptionOrNull()?.message}")
        }

        participantManager.deleteParticipant(userId, chatId)
        chatService.get().deleteChat(chatId)
    }

    suspend fun syncParticipantsWithAPI(chatId: String) {
        try {
            val response = apiService.getChatMembers(chatId)
            if (!response.isSuccessful) {
                throw Exception("API failed: ${response.errorBody()?.string()}")
            }

            val body = response.body() ?: throw Exception("Response body is null")
            val participants = body.data

            val superAdminId = participants
                .filter { it.isAdmin }
                .minByOrNull { ISO8601DateFormatter.parseIsoToMillis(it.joinedAt) }
                ?.user?.userId

            val transformed = participants
                .distinctBy { it.user.userId }
                .map {
                    ParticipantUserResponse(
                        userId = it.user.userId,
                        username = it.user.username,
                        role = if (it.isAdmin) "admin" else "member"
                    )
                }

            participantManager.syncParticipantsFromAPI(chatId, transformed)

            val uniqueUsernames = transformed.map { it.username }.distinct().joinToString(",")

            chatService.get().updateChatWithAdmin(chatId, superAdminId, uniqueUsernames)

        } catch (e: Exception) {
            throw Exception("Failed to sync participants from API: ${e.localizedMessage}", e)
        }
    }

    suspend fun syncAllParticipants() {
        val chatList = chatService.get().chats.value

        for (chat in chatList) {
            try {
                syncParticipantsWithAPI(chat.chatId)
            } catch (e: Exception) {
                // Optional: you can log error if needed
            }
        }
    }

    suspend fun getOtherUsernameInDirectChat(chatId: String, currentUserId: String): String? {
        // Pokušaj iz cache-a za brzinu
        val cached = getCachedParticipants(chatId)
        val otherCached = cached.firstOrNull { it.userId != currentUserId }
        if (otherCached != null) return otherCached.username

        // Ako nema u cache-u, fetchuj iz baze/networka
        val participants = fetchParticipants(chatId)
        return participants.firstOrNull { it.userId != currentUserId }?.username
    }


    private suspend fun getUsernameForUserId(userId: String): String {
        return try {
            val result = apiService.getUserById(userId)
            result.getOrNull()?.username ?: userId
        } catch (_: Exception) {
            userId // fallback
        }
    }

    // New: Get cached participants
    fun getCachedParticipants(chatId: String): List<ParticipantEntity> {
        return participantManager.getCachedParticipants(chatId)
    }

    // New: Get single cached participant
    fun getCachedParticipant(chatId: String, userId: String): ParticipantEntity? {
        return participantManager.getCachedParticipants(chatId).firstOrNull { it.userId == userId }
    }

    // New: Get map of userId to participant
    fun getCachedParticipantMap(chatId: String): Map<String, ParticipantEntity> {
        return participantManager.getCachedParticipants(chatId).associateBy { it.userId }
    }

    // New: Check if a participant is in chat (cache-based)
    fun isCachedParticipant(chatId: String, userId: String): Boolean {
        return participantManager.getCachedParticipants(chatId).any { it.userId == userId }
    }

    // New: Clear cached participants
    fun clearCachedParticipants(chatId: String) {
        participantManager.clearCachedParticipants(chatId)
    }

}
