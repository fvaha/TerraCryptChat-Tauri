package xyz.terracrypt.chat.managers

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.data.ParticipantDao
import xyz.terracrypt.chat.models.ParticipantEntity
import xyz.terracrypt.chat.models.ParticipantUserResponse
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ParticipantManager @Inject constructor(
    private val participantDao: ParticipantDao
) {

    private val participantsCache = mutableMapOf<String, List<ParticipantEntity>>() // In-memory cache

    suspend fun addParticipants(
        participants: List<Pair<String, String>>,
        chatId: String,
        adminIds: List<String> = emptyList()
    ) {
        val entities = participants.map { (userId, username) ->
            ParticipantEntity(
                participantId = UUID.randomUUID().toString(),
                userId = userId,
                username = username,
                joinedAt = System.currentTimeMillis(),
                role = if (adminIds.contains(userId)) "admin" else "member",
                chatId = chatId
            )
        }
        withContext(Dispatchers.IO) {
            participantDao.addParticipants(entities)
        }
        participantsCache[chatId] = fetchParticipantsInternal(chatId) // refresh cache from DB
    }

    suspend fun syncParticipantsFromAPI(chatId: String, apiParticipants: List<ParticipantUserResponse>) {
        try {
            val local = fetchParticipantsInternal(chatId)

            val incoming = apiParticipants.map {
                ParticipantEntity(
                    participantId = UUID.randomUUID().toString(),
                    userId = it.userId,
                    username = it.username,
                    joinedAt = System.currentTimeMillis(),
                    role = it.role,
                    chatId = chatId
                )
            }

            val hasChanged = local.size != incoming.size || local.any { localP ->
                incoming.none {
                    it.userId == localP.userId &&
                            it.role == localP.role &&
                            it.username == localP.username
                }
            }

            if (hasChanged) {
                withContext(Dispatchers.IO) {
                    participantDao.deleteAllParticipantsForChat(chatId)
                    participantDao.addParticipants(incoming)
                }
                participantsCache[chatId] = incoming
                Log.d("ParticipantManager", "Synced ${incoming.size} participants for chat $chatId")
            } else {
                Log.d("ParticipantManager", "No changes in participants for chat $chatId")
            }

        } catch (e: Exception) {
            throw Exception("Failed to sync participants from API: ${e.localizedMessage}", e)
        }
    }

    suspend fun fetchParticipants(chatId: String): List<ParticipantEntity> {
        val fromDb = fetchParticipantsInternal(chatId)
        participantsCache[chatId] = fromDb
        return fromDb
    }

    private suspend fun fetchParticipantsInternal(chatId: String): List<ParticipantEntity> {
        return withContext(Dispatchers.IO) {
            participantDao.fetchParticipantsForChat(chatId)
        }
    }

    fun getCachedParticipants(chatId: String): List<ParticipantEntity> {
        return participantsCache[chatId] ?: emptyList()
    }

    fun clearCachedParticipants(chatId: String) {
        participantsCache.remove(chatId)
    }

    fun clearAllCache() {
        participantsCache.clear()
    }

    suspend fun deleteAllParticipantsForChat(chatId: String) {
        withContext(Dispatchers.IO) {
            participantDao.deleteAllParticipantsForChat(chatId)
        }
        participantsCache.remove(chatId)
    }

    suspend fun deleteParticipant(userId: String, chatId: String): Boolean {
        val deleted = withContext(Dispatchers.IO) {
            participantDao.deleteParticipant(userId, chatId) > 0
        }
        if (deleted) {
            participantsCache.remove(chatId)
        }
        return deleted
    }

    suspend fun updateParticipantRole(participantId: String, newRole: String, chatId: String): Boolean {
        val updated = withContext(Dispatchers.IO) {
            participantDao.updateParticipantRole(participantId, newRole, chatId) > 0
        }
        if (updated) {
            participantsCache.remove(chatId)
        }
        return updated
    }

    suspend fun isParticipantInChat(chatId: String, userId: String): Boolean {
        return withContext(Dispatchers.IO) {
            participantDao.fetchParticipant(chatId, userId) != null
        }
    }

    suspend fun fetchParticipant(chatId: String, userId: String): ParticipantEntity? {
        return withContext(Dispatchers.IO) {
            participantDao.fetchParticipant(chatId, userId)
        }
    }
}
