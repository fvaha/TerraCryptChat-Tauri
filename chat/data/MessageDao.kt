package xyz.terracrypt.chat.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.terracrypt.chat.models.MessageEntity

@Dao
interface MessageDao {

    // === INSERT / UPDATE ===

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<MessageEntity>) // Batch insert/update

    @Update
    suspend fun updateMessages(messages: List<MessageEntity>)

    @Update
    suspend fun updateMessage(message: MessageEntity)

    // === FETCH MESSAGES ===

    @Query("SELECT * FROM message WHERE chatId = :chatId ORDER BY timestamp ASC")
    suspend fun getMessagesForChat(chatId: String): List<MessageEntity>

    @Query("SELECT * FROM message WHERE chatId = :chatId AND timestamp < :beforeTimestamp ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getMessagesBeforeTimestamp(
        chatId: String,
        beforeTimestamp: Long,
        limit: Int
    ): List<MessageEntity>

    @Query("SELECT * FROM message WHERE chatId = :chatId ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLastMessage(chatId: String): MessageEntity?

    @Query("SELECT * FROM message WHERE chatId = :chatId ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getMessages(chatId: String, limit: Int): List<MessageEntity>

    // === FIND BY SERVER / CLIENT ID ===

    @Query("SELECT * FROM message WHERE messageId = :messageId LIMIT 1")
    suspend fun getMessageById(messageId: String): MessageEntity?

    @Query("SELECT * FROM message WHERE clientMessageId = :clientMessageId LIMIT 1")
    suspend fun getMessageByClientId(clientMessageId: String): MessageEntity?

    // === STATUS UPDATE ===

    @Query("UPDATE message SET isSent = :isSent WHERE clientMessageId = :clientMessageId")
    suspend fun updateMessageSentStatus(clientMessageId: String, isSent: Boolean)

    @Query("UPDATE message SET isDelivered = 1 WHERE messageId = :messageId")
    suspend fun markDeliveredByServerId(messageId: String)

    @Query("UPDATE message SET isRead = 1 WHERE messageId = :messageId")
    suspend fun markReadByServerId(messageId: String)

    @Query("UPDATE message SET isRead = 1 WHERE messageId IN (:messageIds)")
    suspend fun markMessagesReadByServerIds(messageIds: List<String>)

    // === UNREAD ===

    @Query("SELECT * FROM message WHERE chatId = :chatId AND isRead = 0")
    suspend fun getUnreadMessages(chatId: String): List<MessageEntity>

    @Query("SELECT COUNT(*) FROM message WHERE chatId = :chatId AND isRead = 0")
    suspend fun countUnreadMessages(chatId: String): Int

    @Query("UPDATE message SET isRead = 1 WHERE chatId = :chatId AND isRead = 0")
    suspend fun markMessagesAsRead(chatId: String)

    // === OBSERVE FOR UI ===

    @Query("SELECT * FROM message WHERE chatId = :chatId ORDER BY timestamp DESC")
    fun observeMessages(chatId: String): Flow<List<MessageEntity>>

    // === FIND LATEST MESSAGE FROM SENDER ===

    @Query("""
        SELECT * FROM message 
        WHERE chatId = :chatId AND senderId = :senderId 
        ORDER BY timestamp DESC 
        LIMIT 1
    """)
    suspend fun findLatestByChatAndSender(chatId: String, senderId: String): MessageEntity?

    // === DELETE ===

    @Query("DELETE FROM message WHERE messageId = :messageId")
    suspend fun deleteById(messageId: String)

    @Query("DELETE FROM message WHERE clientMessageId = :clientMessageId")
    suspend fun deleteByClientId(clientMessageId: String)

    // === SYNC UPDATE AFTER ACK ===

    @Query("""
        UPDATE message
        SET messageId = :serverId, isSent = 1, isFailed = 0
        WHERE clientMessageId = :clientMessageId
    """)
    suspend fun updateMessageIdByClient(clientMessageId: String, serverId: String)

    @Query("DELETE FROM message")
    suspend fun clearMessages()


}
