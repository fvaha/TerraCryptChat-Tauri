package xyz.terracrypt.chat.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import xyz.terracrypt.chat.data.SafeSyncDatabase
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SafeSyncDatabase {
        return Room.databaseBuilder(
            context,
            SafeSyncDatabase::class.java,
            "safe_sync_database"
        )
            .fallbackToDestructiveMigration(true)
            .fallbackToDestructiveMigrationOnDowngrade(true)
            .build()
    }

    @Provides fun provideUserDao(db: SafeSyncDatabase) = db.userDao()
    @Provides fun provideChatDao(db: SafeSyncDatabase) = db.chatDao()
    @Provides fun provideMessageDao(db: SafeSyncDatabase) = db.messageDao()
    @Provides fun provideParticipantDao(db: SafeSyncDatabase) = db.participantDao()
    @Provides fun provideFriendDao(db: SafeSyncDatabase) = db.friendDao()
    @Provides fun provideKeyDao(db: SafeSyncDatabase) = db.keyDao()   // <-- ADD THIS LINE
}
