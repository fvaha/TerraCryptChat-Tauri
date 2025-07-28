package xyz.terracrypt.chat.di

import android.content.Context
import android.content.SharedPreferences
import androidx.preference.PreferenceManager
import dagger.Lazy
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import xyz.terracrypt.chat.data.UserDao
import xyz.terracrypt.chat.data.ChatDao
import xyz.terracrypt.chat.data.FriendDao
import xyz.terracrypt.chat.data.MessageDao
import xyz.terracrypt.chat.data.ParticipantDao
import xyz.terracrypt.chat.data.KeyDao
import xyz.terracrypt.chat.managers.CacheManager
import xyz.terracrypt.chat.managers.DeleteManager
import xyz.terracrypt.chat.managers.FriendManager
import xyz.terracrypt.chat.managers.ParticipantManager
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.managers.TokenManager
import xyz.terracrypt.chat.managers.UserManager
import xyz.terracrypt.chat.network.WebSocketManager
import xyz.terracrypt.chat.services.ChatService
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.MessageService
import xyz.terracrypt.chat.services.ParticipantService
import xyz.terracrypt.chat.services.UserService
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideSharedPreferences(@ApplicationContext context: Context): SharedPreferences {
        return PreferenceManager.getDefaultSharedPreferences(context)
    }

    @Provides
    @Singleton
    fun provideTokenManager(sharedPreferences: SharedPreferences): TokenManager =
        TokenManager(sharedPreferences)

    @Provides
    @Singleton
    fun provideUserManager(userDao: UserDao): UserManager =
        UserManager(userDao)

    @Provides
    @Singleton
    fun provideWebSocketManager(
        userService: Lazy<UserService>,
        @Named("WebSocketOkHttpClient") client: OkHttpClient
    ): WebSocketManager = WebSocketManager(userService, client)


    @Provides
    @Singleton
    fun provideDeleteManager(
        userDao: UserDao,
        chatDao: ChatDao,
        friendDao: FriendDao,
        messageDao: MessageDao,
        participantDao: ParticipantDao,
        keyDao: KeyDao
    ): DeleteManager = DeleteManager(
        userDao,
        chatDao,
        friendDao,
        messageDao,
        participantDao,
        keyDao
    )


    @Provides
    @Singleton
    fun provideSessionManager(
        userService: UserService,
        tokenManager: TokenManager,
        webSocketManager: WebSocketManager,
        cacheManager: CacheManager,
        userDao: UserDao,
        friendService: Lazy<FriendService>,
        chatService: Lazy<ChatService>,
        messageService: Lazy<MessageService>,
        participantService: Lazy<ParticipantService>,
        deleteManager: DeleteManager // DODAJ OVO
    ): SessionManager = SessionManager(
        userService,
        tokenManager,
        webSocketManager,
        cacheManager,
        userDao,
        friendService,
        chatService,
        messageService,
        participantService,
        deleteManager // DODAJ OVO
    )


    @Provides
    @Singleton
    fun provideCacheManager(
        participantManager: ParticipantManager,
        friendManager: FriendManager,
        userManager: UserManager
    ): CacheManager = CacheManager(participantManager, friendManager, userManager)


}
