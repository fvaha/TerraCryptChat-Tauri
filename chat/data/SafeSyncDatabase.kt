package xyz.terracrypt.chat.data

import androidx.room.Database
import androidx.room.RoomDatabase
import xyz.terracrypt.chat.models.ChatEntity
import xyz.terracrypt.chat.models.FriendEntity
import xyz.terracrypt.chat.models.KeyEntity
import xyz.terracrypt.chat.models.MessageEntity
import xyz.terracrypt.chat.models.ParticipantEntity
import xyz.terracrypt.chat.models.UserEntity

@Database(
    entities = [
        UserEntity::class,
        ChatEntity::class,
        MessageEntity::class,
        ParticipantEntity::class,
        FriendEntity::class,
        KeyEntity::class
    ],
    version = 14,
    exportSchema = true
)
abstract class SafeSyncDatabase : RoomDatabase() {

    abstract fun userDao(): UserDao
    abstract fun chatDao(): ChatDao
    abstract fun messageDao(): MessageDao
    abstract fun participantDao(): ParticipantDao
    abstract fun friendDao(): FriendDao
    abstract fun keyDao(): KeyDao

    companion object {

    }
}
