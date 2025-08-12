import { databaseServiceAsync } from './databaseServiceAsync';
import { invoke } from "@tauri-apps/api/core";
import { nativeApiService } from '../api/nativeApiService';
import { websocketService } from '../websocket/websocketService';
import { sessionManager } from '../utils/sessionManager';
import { Chat } from '../models/models';
import { apiService } from '../api/apiService';

interface ChatNotificationEvent {
  detail: {
    type: string;
    message: {
      action: string;
      chat_id: string;
      members: string[];
    };
  };
}

export class ChatService {
  private static instance: ChatService;
  private chatNotificationHandlers: Set<() => void> = new Set();

  constructor() {
    this.setupChatNotifications();
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private setupChatNotifications() {
    // REMOVED: Duplicate WebSocket message handler that was causing duplicate chats
    // MessageService is now the single source of truth for all WebSocket messages
    
    // Only listen to custom events from messageService
    window.addEventListener('chat-notification-received', ((event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[ChatService] Received chat notification from messageService:", customEvent.detail);
      this.handleChatNotification(customEvent.detail);
    }) as EventListener);
  }

  private async handleChatNotification(message: { type: string; message: { action: string; chat_id: string; members: string[] } }) {
    try {
      const { action, chat_id, members } = message.message;
      
      if (!action || !chat_id || !members) {
        console.warn("[ChatService] Invalid chat-notification format:", message);
        return;
      }

      const current_user_id = await sessionManager.getCurrentUserId();
      if (!current_user_id) {
        console.warn("[ChatService] No current user ID available");
        return;
      }

      const is_member = members.some((member_id: string) => 
        member_id.toLowerCase() === current_user_id.toLowerCase()
      );

      if (!is_member) {
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

  private async handleIncomingChatMessage(message: any) {
    try {
      if (message.type === 'chat' && message.message) {
        const chatMessage = message.message;
        console.log("[ChatService] Processing incoming chat message:", chatMessage);
        
        // Update chat last message and unread count
        if (chatMessage.chat_id && chatMessage.content) {
          const timestamp = new Date(chatMessage.sent_at).getTime();
          await this.updateChatLastMessage(chatMessage.chat_id, chatMessage.content, timestamp);
          // Get current unread count and increment it
          const currentChat = await this.getChatById(chatMessage.chat_id);
          if (currentChat) {
            const newUnreadCount = (currentChat.unread_count || 0) + 1;
            await this.updateChatUnreadCount(chatMessage.chat_id, newUnreadCount);
          }
        }
      }
    } catch (error) {
      console.error("[ChatService] Error handling incoming chat message:", error);
    }
  }

  private async handleMessageStatus(message: any) {
    try {
      if (message.type === 'message-status' && message.message) {
        const statusMessage = message.message;
        console.log("[ChatService] Processing message status:", statusMessage);
        
        // Handle message status updates if needed
        // This could include updating UI indicators, etc.
      }
    } catch (error) {
      console.error("[ChatService] Error handling message status:", error);
    }
  }

  private async handleChatCreated(chat_id: string) {
    try {
      console.log("[ChatService] Handling chat created for chat_id:", chat_id);
      
      // FIXED: Remove duplicate chats_delta_update call - MessageService already handles this
      // This prevents duplicate chat creation from multiple sync calls
      console.log("[ChatService] Chat creation handled by MessageService, no additional sync needed");
      
      // Just notify UI that chat was created
      this.notifyChatCreated();
      // Removed confusing console log message
    } catch (error) {
      console.error("[ChatService] Error handling chat created:", error);
    }
  }

  private async handleChatDeleted(chat_id: string) {
    try {
      await databaseServiceAsync.deleteChatById(chat_id);
      this.notifyChatDeleted();
    } catch (error) {
      console.error("[ChatService] Error handling chat deleted:", error);
    }
  }

  private notifyChatCreated() {
    this.chatNotificationHandlers.forEach(handler => handler());
  }

  private notifyChatDeleted() {
    this.chatNotificationHandlers.forEach(handler => handler());
  }

  onChatNotification(handler: () => void): void {
    this.chatNotificationHandlers.add(handler);
  }

  offChatNotification(handler: () => void): void {
    this.chatNotificationHandlers.delete(handler);
  }

  async getAllChats(): Promise<Chat[]> {
    try {
      const chats = await databaseServiceAsync.getAllChats();
      return chats || [];
    } catch (error) {
      console.error("[ChatService] Failed to get all chats:", error);
      return [];
    }
  }

  async getChatById(chat_id: string): Promise<Chat | null> {
    try {
      const chat = await databaseServiceAsync.getChatById(chat_id);
      return chat;
    } catch (error) {
      console.error(`[ChatService] Failed to get chat by ID ${chat_id}:`, error);
      return null;
    }
  }

  async sync_all_chats(): Promise<void> {
    try {
      const current_user_id = await sessionManager.getCurrentUserId();
      if (!current_user_id) {
        console.warn("[ChatService] No current user ID available for chat sync");
        return;
      }

      const token = await this.getToken();
      if (!token) {
        console.warn("[ChatService] No token available for chat sync");
        return;
      }

      // Use chats_delta_update instead of fetch_all_chats_and_save to avoid re-adding deleted chats
      await invoke("chats_delta_update", { token });
      console.log("[ChatService] All chats synced successfully");
    } catch (error) {
      console.error("[ChatService] Failed to sync all chats:", error);
    }
  }

  async sync_chats_delta(): Promise<void> {
    try {
      const current_user_id = await sessionManager.getCurrentUserId();
      if (!current_user_id) {
        console.warn("[ChatService] No current user ID available for chat sync");
        return;
      }

      const token = await this.getToken();
      if (!token) {
        console.warn("[ChatService] No token available for chat sync");
        return;
      }

      // Use chats_delta_update instead of fetch_all_chats_and_save to avoid re-adding deleted chats
      await invoke("chats_delta_update", { token });
      console.log("[ChatService] Chats delta sync completed successfully");
    } catch (error) {
      console.error("[ChatService] Failed to sync chats delta:", error);
    }
  }

  private async getToken(): Promise<string | null> {
    try {
      // Use the SessionManager's get_token method
      return await sessionManager.getToken();
    } catch (error) {
      console.error("[ChatService] Failed to get token:", error);
      return null;
    }
  }

  async updateChatLastMessage(chat_id: string, last_message: string, timestamp: number): Promise<void> {
    try {
      await databaseServiceAsync.updateChatLastMessage(chat_id, last_message, timestamp);
      console.log(`[ChatService] Chat last message updated for ${chat_id}`);
    } catch (error) {
      console.error(`[ChatService] Failed to update chat last message for ${chat_id}:`, error);
    }
  }

  async updateChatUnreadCount(chat_id: string, unread_count: number): Promise<void> {
    try {
      await databaseServiceAsync.updateChatUnreadCount(chat_id, unread_count);
      console.log(`[ChatService] Chat unread count updated for ${chat_id}: ${unread_count}`);
    } catch (error) {
      console.error(`[ChatService] Failed to update chat unread count for ${chat_id}:`, error);
    }
  }

  async deleteChat(chat_id: string): Promise<void> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // First try to delete from server (only works if user is creator/admin)
      try {
        await apiService.deleteChat(chat_id);
        console.log(`[ChatService] Chat successfully deleted from server: ${chat_id}`);
      } catch (serverError) {
        console.warn(`[ChatService] Server delete failed: ${serverError}`);
        // Continue with local cleanup even if server delete fails
      }

      // Always clean up locally
      await databaseServiceAsync.deleteChatById(chat_id);
      console.log(`[ChatService] Chat deleted locally: ${chat_id}`);
    } catch (error) {
      console.error(`[ChatService] Failed to delete chat ${chat_id}:`, error);
      throw error;
    }
  }

  async leaveChat(chat_id: string): Promise<void> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Try to leave chat on server
      try {
        await apiService.leaveChat(chat_id);
        console.log(`[ChatService] Successfully left chat on server: ${chat_id}`);
      } catch (serverError) {
        console.warn(`[ChatService] Server leave failed: ${serverError}`);
        // Continue with local cleanup even if server leave fails
      }

      // Clean up locally
      await databaseServiceAsync.deleteChatById(chat_id);
      console.log(`[ChatService] Chat removed locally after leaving: ${chat_id}`);
    } catch (error) {
      console.error(`[ChatService] Failed to leave chat ${chat_id}:`, error);
      throw error;
    }
  }

  async clearAllChats(): Promise<void> {
    try {
      await databaseServiceAsync.clearChatData();
      console.log("[ChatService] All chats cleared successfully");
    } catch (error) {
      console.error("[ChatService] Failed to clear all chats:", error);
      throw error;
    }
  }

  async getChatStats(): Promise<{ total: number; unread: number }> {
    try {
      const chats = await this.getAllChats();
      const total = chats.length;
      const unread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
      
      return { total, unread };
    } catch (error) {
      console.error("[ChatService] Failed to get chat stats:", error);
      return { total: 0, unread: 0 };
    }
  }

  async getChats(): Promise<Chat[]> {
    try {
      const chats = await this.getAllChats();
      return chats.sort((a, b) => {
        const a_timestamp = a.last_message_timestamp || 0;
        const b_timestamp = b.last_message_timestamp || 0;
        return b_timestamp - a_timestamp;
      });
    } catch (error) {
      console.error("[ChatService] Failed to get sorted chats:", error);
      return [];
    }
  }

  async createChat(name: string, is_group: boolean, participants: string[]): Promise<Chat> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Convert string participant IDs to ParticipantSimple objects
      const members = participants.map(user_id => ({ user_id }));

      const chat = await nativeApiService.createChat(token, name, members);
      console.log(`[ChatService] Chat created successfully: ${name}`);
      return chat;
    } catch (error) {
      console.error("[ChatService] Failed to create chat:", error);
      throw error;
    }
  }
}

export const chatService = ChatService.getInstance(); 
