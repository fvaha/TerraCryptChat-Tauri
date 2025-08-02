import { databaseServiceAsync, Chat } from './databaseServiceAsync';
import { invoke } from "@tauri-apps/api/core";
import { nativeApiService } from '../api/nativeApiService';

export class ChatService {
  async getAllChats(): Promise<Chat[]> {
    try {
      const localChats = await databaseServiceAsync.getAllChats();
      
      if (!Array.isArray(localChats)) {
        console.warn("Invalid chats data received:", localChats);
        return [];
      }
      
      return localChats.map(chat => ({
        chat_id: chat.chat_id,
        chat_type: chat.chat_type,
        chat_name: chat.chat_name,
        created_at: chat.created_at,
        admin_id: chat.admin_id,
        unread_count: chat.unread_count,
        description: chat.description,
        group_name: chat.group_name,
        last_message_content: chat.last_message_content,
        last_message_timestamp: chat.last_message_timestamp,
        participants: chat.participants,
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
        chat_type: chat.chat_type,
        chat_name: chat.chat_name,
        created_at: chat.created_at,
        admin_id: chat.admin_id,
        unread_count: chat.unread_count,
        description: chat.description,
        group_name: chat.group_name,
        last_message_content: chat.last_message_content,
        last_message_timestamp: chat.last_message_timestamp,
        participants: chat.participants,
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
      
      const chats = await invoke<any[]>("fetch_all_chats_and_save", { token });
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
        participants: chat.participants || [],
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
      const chat = await nativeApiService.createChat(name, isGroup, participants);
      return {
        chat_id: chat.chat_id,
        name: chat.name,
        created_at: chat.created_at,
        creator_id: chat.creator_id,
        is_group: chat.is_group,
        participants: chat.participants || [],
        unread_count: chat.unread_count,
        last_message_content: chat.last_message_content,
        last_message_timestamp: chat.last_message_timestamp
      };
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    }
  }
}; 