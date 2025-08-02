import { databaseServiceAsync } from './databaseServiceAsync';
import { invoke } from "@tauri-apps/api/core";
import { nativeApiService } from '../api/nativeApiService';
import { websocketService } from '../websocket/websocketService';
import { sessionManager } from '../utils/sessionManager';
import { Chat } from '../models/models';

export class ChatService {
  private static instance: ChatService;
  private chatNotificationHandlers: Set<() => void> = new Set();

  constructor() {
    console.log("[ChatService] Constructor called - initializing ChatService");
    this.setupChatNotifications();
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      console.log("[ChatService] Creating new ChatService instance");
      ChatService.instance = new ChatService();
    } else {
      console.log("[ChatService] Returning existing ChatService instance");
    }
    return ChatService.instance;
  }

  private setupChatNotifications() {
    console.log("[ChatService] Setting up chat notifications...");
    websocketService.onMessage((message) => {
      console.log("[ChatService] Received WebSocket message:", message);
      if (message.type === 'chat-notification') {
        console.log("[ChatService] Processing chat notification:", message);
        this.handleChatNotification(message);
      }
    });
  }

  private async handleChatNotification(message: { type: string; message: { action: string; chat_id: string; members: string[] } }) {
    try {
      console.log("[ChatService] Starting to handle chat notification...");
      const { action, chat_id, members } = message.message;
      
      console.log("[ChatService] Parsed message:", { action, chat_id, members });
      
      if (!action || !chat_id || !members) {
        console.warn("[ChatService] Invalid chat-notification format:", message);
        return;
      }

      const currentUserId = await sessionManager.getCurrentUserId();
      console.log("[ChatService] Current user ID:", currentUserId);
      
      if (!currentUserId) {
        console.warn("[ChatService] No current user ID available");
        return;
      }

      const isMember = members.some((memberId: string) => 
        memberId.toLowerCase() === currentUserId.toLowerCase()
      );
      
      console.log("[ChatService] Is user a member?", isMember);
      console.log("[ChatService] Members:", members);
      console.log("[ChatService] Current user ID:", currentUserId);

      if (!isMember) {
        console.log("[ChatService] User is not a member of this chat, ignoring notification");
        return;
      }

      switch (action) {
        case "created":
          await this.handleChatCreated(chat_id);
          break;
        case "deleted":
          await this.handleChatDeleted(chat_id);
          break;
        default:
          console.warn("[ChatService] Unknown chat action:", action);
      }
    } catch (error) {
      console.error("[ChatService] Error handling chat notification:", error);
    }
  }

  private async handleChatCreated(chatId: string) {
    try {
      console.log("[ChatService] Chat created - syncing now");
      
      // Sync the new chat from server
      await this.syncChatsFromServer();
      
      // Check if chat was successfully added
      const newChat = await this.getChatById(chatId);
      if (newChat) {
        console.log("[ChatService] Chat is now saved locally:", newChat.name);
        this.notifyChatCreated();
      } else {
        console.warn("[ChatService] Warning: Chat still not found locally after sync");
      }
    } catch (error) {
      console.error("[ChatService] Error handling chat created:", error);
    }
  }

  private async handleChatDeleted(chatId: string) {
    try {
      console.log("[ChatService] Chat deleted - cleaning local");
      
      // Clear messages for this chat
      await databaseServiceAsync.clearMessagesForChat(chatId);
      
      // Remove participants for this chat
      await databaseServiceAsync.removeAllParticipantsForChat(chatId);
      
      // Delete the chat
      await databaseServiceAsync.deleteChat(chatId);
      
      this.notifyChatDeleted();
    } catch (error) {
      console.error("[ChatService] Error handling chat deleted:", error);
    }
  }

  private notifyChatCreated() {
    this.chatNotificationHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error("[ChatService] Error in chat created handler:", error);
      }
    });
  }

  private notifyChatDeleted() {
    this.chatNotificationHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error("[ChatService] Error in chat deleted handler:", error);
      }
    });
  }

  onChatNotification(handler: () => void): void {
    this.chatNotificationHandlers.add(handler);
  }

  offChatNotification(handler: () => void): void {
    this.chatNotificationHandlers.delete(handler);
  }

  async getAllChats(): Promise<Chat[]> {
    try {
      const localChats = await databaseServiceAsync.getAllChats();
      
      if (!Array.isArray(localChats)) {
        console.warn("Invalid chats data received:", localChats);
        return [];
      }
      
      return localChats.map(chat => ({
        chat_id: chat.chat_id,
        name: chat.name || 'Unnamed Chat',
        created_at: chat.created_at,
        unread_count: chat.unread_count,
        description: chat.description,
        group_name: chat.group_name,
        last_message_content: chat.last_message_content,
        last_message_timestamp: chat.last_message_timestamp,
        participants: chat.participants ? JSON.parse(chat.participants) : [],
        is_group: chat.is_group,
        creator_id: chat.creator_id
      }));
    } catch (error) {
      console.error("Failed to get all chats:", error);
      return [];
    }
  }

  async getChatById(chatId: string): Promise<Chat | null> {
    try {
      const chat = await databaseServiceAsync.getChatById(chatId);
      if (!chat) return null;

      return {
        chat_id: chat.chat_id,
        name: chat.name || 'Unnamed Chat',
        created_at: chat.created_at,
        unread_count: chat.unread_count,
        description: chat.description,
        group_name: chat.group_name,
        last_message_content: chat.last_message_content,
        last_message_timestamp: chat.last_message_timestamp,
        participants: chat.participants ? JSON.parse(chat.participants) : [],
        is_group: chat.is_group,
        creator_id: chat.creator_id
      };
    } catch (error) {
      console.error(`Failed to get chat by ID ${chatId}:`, error);
      return null;
    }
  }

  async syncChatsFromServer(): Promise<void> {
    try {
      console.log("[ChatService] Syncing chats from server...");
      
      // Use the new fetch_all_chats_and_save command that also fetches participants
      const token = await this.getToken();
      if (!token) {
        console.warn("[ChatService] No token available for chat sync");
        return;
      }
      
      const chats = await invoke<Chat[]>("fetch_all_chats_and_save", { token });
      console.log(`[ChatService] Synced ${chats.length} chats with participants from server`);
      
    } catch (error) {
      console.error("[ChatService] Failed to sync chats from server:", error);
    }
  }

  private async getToken(): Promise<string | null> {
    try {
      // This would need to be implemented based on your token management
      // For now, return null - the actual implementation should get the token from your session manager
      return null;
    } catch (error) {
      console.error("[ChatService] Failed to get token:", error);
      return null;
    }
  }

  async updateChatLastMessage(chatId: string, lastMessage: string, timestamp: number): Promise<void> {
    try {
      await databaseServiceAsync.updateChatLastMessage(chatId, lastMessage, timestamp);
    } catch (error) {
      console.error(`Failed to update chat last message for ${chatId}:`, error);
    }
  }

  async updateChatUnreadCount(chatId: string, unreadCount: number): Promise<void> {
    try {
      await databaseServiceAsync.updateChatUnreadCount(chatId, unreadCount);
    } catch (error) {
      console.error(`Failed to update chat unread count for ${chatId}:`, error);
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    try {
      await databaseServiceAsync.deleteChat(chatId);
    } catch (error) {
      console.error(`Failed to delete chat ${chatId}:`, error);
    }
  }

  async clearAllChats(): Promise<void> {
    try {
      await databaseServiceAsync.clearChatData();
    } catch (error) {
      console.error("Failed to clear all chats:", error);
    }
  }

  async getChatStats(): Promise<{ total: number; unread: number }> {
    try {
      const dbChats = await databaseServiceAsync.getAllChats();
      const total = dbChats.length;
      const unread = dbChats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
      
      return { total, unread };
    } catch (error) {
      console.error("Failed to get chat stats:", error);
      return { total: 0, unread: 0 };
    }
  }
}

export const chatService = {
  async getChats(): Promise<Chat[]> {
    try {
      const chats = await nativeApiService.getCachedChatsOnly();
      return chats.map(chat => ({
        chat_id: chat.chat_id,
        name: chat.name,
        created_at: chat.created_at,
        creator_id: chat.creator_id,
        is_group: chat.is_group,
        unread_count: chat.unread_count,
        last_message_content: chat.last_message_content,
        last_message_timestamp: chat.last_message_timestamp
      }));
    } catch (error) {
      console.error('Failed to get chats:', error);
      throw error;
    }
  },

  async getChatById(chatId: string): Promise<Chat | null> {
    try {
      const chats = await this.getChats();
      return chats.find(chat => chat.chat_id === chatId) || null;
    } catch (error) {
      console.error('Failed to get chat by ID:', error);
      throw error;
    }
  },

  async createChat(name: string, isGroup: boolean, participants: string[]): Promise<Chat> {
    try {
      // Convert string[] to the expected format
      const members = participants.map(userId => ({ user_id: userId, is_admin: false }));
      const chatId = await nativeApiService.createChat(name, isGroup, members);
      
      // Create a basic chat object since createChat only returns the chat_id
      return {
        chat_id: chatId,
        name: name,
        created_at: Date.now(),
        creator_id: '', // Will be filled by the server
        is_group: isGroup,

        unread_count: 0,
        last_message_content: undefined,
        last_message_timestamp: undefined
      };
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    }
  }
}; 