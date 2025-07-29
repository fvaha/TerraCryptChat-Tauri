import { nativeApiService } from './nativeApiService';
import { Chat, ChatMember } from './models';

// Helper function to convert NativeChat to Chat
const convertNativeChatToChat = (nativeChat: any): Chat => ({
  chat_id: nativeChat.chat_id,
  name: nativeChat.chat_name || nativeChat.name, // Map chat_name to name
  creator_id: nativeChat.creator_id,
  is_group: nativeChat.is_group,
  description: nativeChat.description,
  group_name: nativeChat.group_name,
  last_message_content: nativeChat.last_message_content,
  last_message_timestamp: nativeChat.last_message_timestamp,
  unread_count: nativeChat.unread_count,
  created_at: nativeChat.created_at
});

export class ChatService {
    private static instance: ChatService;
    private isLoadingChats: boolean = false;
    private isOffline: boolean = false;
    private activeChatId: string | null = null;
    private localDeletes: Set<string> = new Set();

    static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    // MARK: - Fetch All Chats And Save
    async fetchAllChatsAndSave(token: string): Promise<Chat[]> {
        console.log('[ChatService] Fetching all chats from API and saving to database...');
        
        this.isLoadingChats = true;
        
        try {
            const chats = await nativeApiService.fetchAllChatsAndSave(token);
            
            // Convert and filter chats
            const convertedChats = chats.map(convertNativeChatToChat);
            const serverChatIds = new Set(convertedChats.map(chat => chat.chat_id));
            const filteredChats = convertedChats.filter(chat => !this.localDeletes.has(chat.chat_id));
            
            // Clean up localDeletes for chats not present on the server
            this.localDeletes = new Set(
                Array.from(this.localDeletes).filter(id => serverChatIds.has(id))
            );
            
            console.log('[ChatService] Successfully fetched and saved chats');
            return filteredChats;
        } catch (error) {
            console.error('[ChatService] Failed to fetch all chats:', error);
            throw error;
        } finally {
            this.isLoadingChats = false;
        }
    }

    // MARK: - Chats Delta Updates
    async chatsDeltaUpdate(token: string): Promise<Chat[]> {
        console.log('[ChatService] Performing delta update for chats...');
        
        this.isLoadingChats = true;
        this.isOffline = false;
        
        try {
            const chats = await nativeApiService.chatsDeltaUpdate(token);
            
            // Convert and filter chats
            const convertedChats = chats.map(convertNativeChatToChat);
            const serverChatIds = new Set(convertedChats.map(chat => chat.chat_id));
            const filteredChats = convertedChats.filter(chat => !this.localDeletes.has(chat.chat_id));
            
            // Clean up localDeletes for chats not present on the server
            this.localDeletes = new Set(
                Array.from(this.localDeletes).filter(id => serverChatIds.has(id))
            );
            
            console.log('[ChatService] Successfully performed delta update');
            return filteredChats;
        } catch (error) {
            console.error('[ChatService] Delta update failed:', error);
            this.isOffline = true;
            throw error;
        } finally {
            this.isLoadingChats = false;
        }
    }

    // MARK: - Get Cached Chats
    async getCachedChatsForCurrentUser(): Promise<Chat[]> {
        console.log('[ChatService] Getting cached chats for current user...');
        
        try {
            const chats = await nativeApiService.getCachedChatsForCurrentUser();
            
            // Convert and filter chats
            const convertedChats = chats.map(convertNativeChatToChat);
            const filteredChats = convertedChats.filter(chat => !this.localDeletes.has(chat.chat_id));
            
            console.log('[ChatService] Retrieved cached chats:', filteredChats.length);
            return filteredChats;
        } catch (error) {
            console.error('[ChatService] Failed to get cached chats:', error);
            throw error;
        }
    }

    // MARK: - Delete Chat
    async deleteChat(chatId: string, token: string): Promise<void> {
        console.log('[ChatService] Deleting chat:', chatId);
        
        // Add to localDeletes immediately (before server response!)
        this.localDeletes.add(chatId);
        
        const performLocalCleanup = async () => {
            try {
                await nativeApiService.deleteChatFromDatabase(chatId);
                console.log('[ChatService] Local cleanup completed for chat:', chatId);
            } catch (error) {
                console.error('[ChatService] Local cleanup failed:', error);
            }
        };
        
        try {
            // Try to delete from server first
            await nativeApiService.deleteChat(chatId, token);
            await performLocalCleanup();
        } catch (error: any) {
            console.error('[ChatService] Server delete failed:', error);
            
            // If it's a 403, try to leave the chat instead
            if (error.message?.includes('403')) {
                try {
                    await nativeApiService.leaveChat(chatId, token);
                    console.log('[ChatService] Successfully left chat:', chatId);
                } catch (leaveError) {
                    console.error('[ChatService] Leave failed but proceeding with cleanup:', leaveError);
                }
            }
            
            await performLocalCleanup();
        }
        
        // Do not clean localDeletes here! It will be cleaned during fetch/delta updates
    }

    // MARK: - Leave Chat
    async leaveChat(chatId: string, token: string): Promise<void> {
        console.log('[ChatService] Leaving chat:', chatId);
        
        try {
            await nativeApiService.leaveChat(chatId, token);
            await nativeApiService.deleteChatFromDatabase(chatId);
            console.log('[ChatService] Successfully left chat:', chatId);
        } catch (error) {
            console.error('[ChatService] Leave chat failed:', error);
            throw error;
        }
    }

    // MARK: - Set Active Chat
    setActiveChat(chatId: string | null): void {
        this.activeChatId = chatId;
        console.log('[ChatService] Set active chat:', chatId);
        
        // Reset unread count and mark messages as read for the active chat
        if (chatId) {
            this.resetUnreadCount(chatId);
        }
    }

    // MARK: - Check If Chat Is Active
    isChatActive(chatId: string): boolean {
        return this.activeChatId === chatId;
    }

    // MARK: - Reset Unread Count
    async resetUnreadCount(chatId: string): Promise<void> {
        try {
            await nativeApiService.resetUnreadCount(chatId);
            console.log('[ChatService] Reset unread count for chat:', chatId);
        } catch (error) {
            console.error('[ChatService] Failed to reset unread count:', error);
        }
    }

    // MARK: - Get Participants
    async getParticipants(chatId: string): Promise<ChatMember[]> {
        try {
            return await nativeApiService.getCachedParticipantsForChat(chatId);
        } catch (error) {
            console.error('[ChatService] Failed to get participants:', error);
            throw error;
        }
    }

    // MARK: - Get Last Message Content
    getLastMessageContent(forUsername: string, chats: Chat[]): string | undefined {
        return chats.find(chat => !chat.is_group && chat.name === forUsername)?.last_message_content;
    }

    // MARK: - Getters
    getIsLoadingChats(): boolean {
        return this.isLoadingChats;
    }

    getIsOffline(): boolean {
        return this.isOffline;
    }

    getActiveChatId(): string | null {
        return this.activeChatId;
    }

    getLocalDeletes(): Set<string> {
        return this.localDeletes;
    }
}

export const chatService = ChatService.getInstance();