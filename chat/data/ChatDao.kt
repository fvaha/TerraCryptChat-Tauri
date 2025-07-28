package xyz.terracrypt.chat.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.terracrypt.chat.models.ChatEntity

@Dao
interface ChatDao {

    // MARK: - Insert
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChat(chat: ChatEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChats(chats: List<ChatEntity>)

    // MARK: - Update
    @Update
    suspend fun updateChat(chat: ChatEntity)

    @Query("UPDATE chat SET unreadCount = :unreadCount WHERE chatId = :chatId")
    suspend fun updateUnreadCount(chatId: String, unreadCount: Int)

    @Query("UPDATE chat SET lastMessageContent = :content, lastMessageTimestamp = :timestamp WHERE chatId = :chatId")
    suspend fun updateLastMessage(chatId: String, content: String?, timestamp: Long?)

    // MARK: - Delete
    @Delete
    suspend fun deleteChat(chat: ChatEntity)

    @Query("DELETE FROM chat WHERE chatId = :chatId")
    suspend fun deleteById(chatId: String)

    // MARK: - Queries
    @Query("SELECT * FROM chat WHERE chatId = :chatId")
    suspend fun getChatById(chatId: String): ChatEntity?

    @Query("SELECT * FROM chat")
    suspend fun getAllChats(): List<ChatEntity>

    @Query("SELECT * FROM chat ORDER BY lastMessageTimestamp DESC")
    fun getAllChatsFlow(): Flow<List<ChatEntity>>

    @Query("DELETE FROM chat")
    suspend fun clearChats()


}
