package xyz.terracrypt.chat.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import xyz.terracrypt.chat.models.FriendEntity

@Dao
interface FriendDao {
    @Query("SELECT * FROM friend ORDER BY username ASC")
    suspend fun getAllFriends(): List<FriendEntity>

    @Query("SELECT * FROM friend WHERE friendId = :id LIMIT 1")
    suspend fun getFriendById(id: String): FriendEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFriend(friend: FriendEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFriends(friends: List<FriendEntity>)

    @Update
    suspend fun updateFriend(friend: FriendEntity)

    @Delete
    suspend fun deleteFriend(friend: FriendEntity)

    @Query("DELETE FROM friend WHERE friendId = :friendId")
    suspend fun deleteFriendById(friendId: String)

    @Query("DELETE FROM friend")
    suspend fun clearFriends()
}
