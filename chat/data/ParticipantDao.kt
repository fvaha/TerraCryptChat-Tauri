package xyz.terracrypt.chat.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import xyz.terracrypt.chat.models.ParticipantEntity

@Dao
interface ParticipantDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addParticipants(participants: List<ParticipantEntity>)

    @Query("DELETE FROM participant WHERE chatId = :chatId")
    suspend fun deleteAllParticipantsForChat(chatId: String): Int

    @Query("DELETE FROM participant")
    suspend fun clearParticipants()


    @Query("SELECT * FROM participant WHERE chatId = :chatId")
    suspend fun fetchParticipantsForChat(chatId: String): List<ParticipantEntity>

    @Query("SELECT * FROM participant WHERE chatId = :chatId AND userId = :userId LIMIT 1")
    suspend fun fetchParticipant(chatId: String, userId: String): ParticipantEntity?

    @Query("DELETE FROM participant WHERE participantId = :participantId AND chatId = :chatId")
    suspend fun deleteParticipant(participantId: String, chatId: String): Int

    @Query("UPDATE participant SET role = :newRole WHERE participantId = :participantId AND chatId = :chatId")
    suspend fun updateParticipantRole(participantId: String, newRole: String, chatId: String): Int
}
