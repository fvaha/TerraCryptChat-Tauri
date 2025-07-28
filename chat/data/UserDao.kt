package xyz.terracrypt.chat.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.terracrypt.chat.models.UserEntity

@Dao
interface UserDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: UserEntity)

    @Query("SELECT * FROM user WHERE userId = :id")
    suspend fun getUserById(id: String): UserEntity?

    @Query("SELECT * FROM user LIMIT 1")
    suspend fun getFirstUser(): UserEntity?

    @Query("SELECT * FROM user")
    suspend fun getAllUsers(): List<UserEntity>

    @Query("SELECT * FROM user")
    fun getAllUsersFlow(): Flow<List<UserEntity>>

    @Query("UPDATE user SET tokenHash = :token WHERE userId = :userId")
    suspend fun updateToken(userId: String, token: String)

    @Update
    suspend fun update(user: UserEntity)

    @Query("DELETE FROM user")
    suspend fun clearUsers()

    @Query("UPDATE user SET isDarkMode = :isDarkMode WHERE userId = :userId")
    suspend fun updateDarkMode(userId: String, isDarkMode: Boolean)
}
