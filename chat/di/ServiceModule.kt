package xyz.terracrypt.chat.di

import dagger.Lazy
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import xyz.terracrypt.chat.data.MessageDao
import xyz.terracrypt.chat.managers.ChatManager
import xyz.terracrypt.chat.managers.FriendManager
import xyz.terracrypt.chat.managers.MessageLinkingManager
import xyz.terracrypt.chat.managers.MessageManager
import xyz.terracrypt.chat.managers.ParticipantManager
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.managers.TokenManager
import xyz.terracrypt.chat.managers.UserManager
import xyz.terracrypt.chat.network.ApiInterface
import xyz.terracrypt.chat.network.ApiService
import xyz.terracrypt.chat.network.WebSocketManager
import xyz.terracrypt.chat.services.ChatService
import xyz.terracrypt.chat.services.CryptoService
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.MessageService
import xyz.terracrypt.chat.services.MessageServiceInterface
import xyz.terracrypt.chat.services.ParticipantService
import xyz.terracrypt.chat.services.SaveMessageCallback
import xyz.terracrypt.chat.services.UserService
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ServiceModule {

    @Provides
    @Singleton
    fun provideUserService(
        userManager: UserManager,
        tokenManager: Lazy<TokenManager>,
        apiService: Lazy<ApiService>
    ): UserService {
        return UserService(userManager, tokenManager, apiService)
    }

    @Provides
    @Singleton
    fun provideFriendService(
        apiService: ApiService,
        friendManager: FriendManager,
        userService: UserService
    ): FriendService {
        return FriendService(apiService, friendManager, userService)
    }

    @Provides
    @Singleton
    fun provideParticipantService(
        participantManager: ParticipantManager,
        apiService: ApiService,
        chatService: Lazy<ChatService>,
        sessionManager: SessionManager
    ): ParticipantService {
        return ParticipantService(participantManager, apiService, chatService, sessionManager)
    }

    @Provides
    @Singleton
    fun provideChatService(
        chatManager: ChatManager,
        apiService: ApiService,
        userService: UserService,
        participantService: ParticipantService,
        sessionManager: SessionManager
    ): ChatService {
        return ChatService(chatManager, apiService, userService, participantService, sessionManager)
    }

    @Provides
    @Singleton
    fun provideMessageManager(
        messageDao: MessageDao
    ): MessageManager = MessageManager(messageDao)

    @Provides
    @Singleton
    fun provideMessageLinkingManager(
        messageManager: MessageManager
    ): MessageLinkingManager = MessageLinkingManager(messageManager)


    @Provides
    @Singleton
    fun provideMessageService(
        messageManager: MessageManager,
        messageLinkingManager: MessageLinkingManager,
        cryptoService: CryptoService,
        chatManager: ChatManager,
        participantService: ParticipantService,
        webSocketManager: Lazy<WebSocketManager>,
        chatService: ChatService,
        userService: UserService,
        sessionManager: SessionManager,
        friendService: FriendService
    ): MessageService {
        return MessageService(
            messageManager,
            messageLinkingManager,
            cryptoService,
            chatManager,
            participantService,
            webSocketManager,
            userService,
            sessionManager,
            friendService,
            chatService
        )
    }

    @Provides
    @Singleton
    fun provideMessageServiceInterface(
        messageService: MessageService
    ): MessageServiceInterface {
        return messageService
    }

    @Provides
    @Singleton
    fun provideSaveMessageCallback(
        messageManager: MessageManager
    ): SaveMessageCallback {
        return object : SaveMessageCallback {
            override suspend fun saveMessage(
                chatId: String,
                content: String,
                senderId: String,
                timestamp: Long
            ): String {
                return messageManager.saveMessage(chatId, content, senderId, timestamp)
            }
        }
    }

    @Provides
    @Singleton
    fun provideCryptoService(): CryptoService {
        return CryptoService()
    }

    @Provides
    @Singleton
    fun provideApiService(
        apiInterface: ApiInterface
    ): ApiService {
        return ApiService(apiInterface)
    }
}
