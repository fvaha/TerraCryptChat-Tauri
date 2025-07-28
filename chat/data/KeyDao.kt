package xyz.terracrypt.chat.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.terracrypt.chat.models.KeyEntity

@Dao
interface KeyDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(keys: KeyEntity)

    @Query("SELECT * FROM user_keys WHERE userId = :userId")
    suspend fun getKeysByUserId(userId: String): KeyEntity?

    @Query("SELECT * FROM user_keys")
    suspend fun getAllKeys(): List<KeyEntity>

    @Query("SELECT * FROM user_keys")
    fun getAllKeysFlow(): Flow<List<KeyEntity>>

    @Update
    suspend fun update(keys: KeyEntity)

    @Query("DELETE FROM user_keys")
    suspend fun clearKeys()

    @Query("DELETE FROM user_keys WHERE userId = :userId")
    suspend fun deleteKeysByUserId(userId: String)
}
