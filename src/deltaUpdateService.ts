
import { messageService } from "./messageService";
import { databaseService } from "./databaseService";

export class DeltaUpdateService {
  private static instance: DeltaUpdateService;
  private lastSyncTimestamp: number = 0;
  private isSyncing: boolean = false;
  private syncInterval: number | null = null;

  static get shared(): DeltaUpdateService {
    if (!DeltaUpdateService.instance) {
      DeltaUpdateService.instance = new DeltaUpdateService();
    }
    return DeltaUpdateService.instance;
  }

  constructor() {
    this.initializeSync();
  }

  private async initializeSync() {
    try {
      const stored = localStorage.getItem('last_sync_timestamp');
      this.lastSyncTimestamp = stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error("[DeltaUpdateService] Failed to load last sync timestamp:", error);
    }
  }

  // MARK: - Chat Delta Updates

  async performChatsDeltaUpdate(): Promise<void> {
    if (this.isSyncing) {
      console.log("[DeltaUpdateService] Chat delta sync already in progress, skipping");
      return;
    }

    this.isSyncing = true;
    try {
      console.log("[DeltaUpdateService] Starting chat delta sync from timestamp:", this.lastSyncTimestamp);

      // TODO: Implement actual delta API call
      // For now, this is a placeholder that simulates the delta response
      const deltaData = {
        new_chats: [],
        updated_chats: [],
        deleted_chat_ids: []
      };

      // Process new chats
      if (deltaData.new_chats && Array.isArray(deltaData.new_chats)) {
        await this.processNewChats(deltaData.new_chats);
      }

      // Process updated chats
      if (deltaData.updated_chats && Array.isArray(deltaData.updated_chats)) {
        await this.processUpdatedChats(deltaData.updated_chats);
      }

      // Process deleted chats
      if (deltaData.deleted_chat_ids && Array.isArray(deltaData.deleted_chat_ids)) {
        await this.processDeletedChats(deltaData.deleted_chat_ids);
      }

      // Update sync timestamp
      this.lastSyncTimestamp = Date.now();
      localStorage.setItem('last_sync_timestamp', this.lastSyncTimestamp.toString());

      console.log("[DeltaUpdateService] Chat delta sync completed successfully");
    } catch (error) {
      console.error("[DeltaUpdateService] Chat delta sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processNewChats(chats: any[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${chats.length} new chats`);
    
    for (const chat of chats) {
      try {
        const chatEntity = {
          chatId: chat.chat_id,
          chatType: chat.is_group ? "group" : "direct",
          chatName: chat.chat_name,
          createdAt: chat.created_at,
          adminId: chat.creator_id,
          unreadCount: chat.unread_count,
          description: chat.description,
          groupName: chat.group_name,
          lastMessageContent: chat.last_message_content,
          lastMessageTimestamp: chat.last_message_timestamp,
          participants: "",
          isGroup: chat.is_group,
          creatorId: chat.creator_id
        };

        await databaseService.insertChat(chatEntity);
        console.log(`[DeltaUpdateService] Inserted new chat: ${chat.chat_name}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to insert chat ${chat.chat_id}:`, error);
      }
    }
  }

  private async processUpdatedChats(chats: any[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${chats.length} updated chats`);
    
    for (const chat of chats) {
      try {
        await databaseService.updateChatLastMessage(
          chat.chat_id,
          chat.last_message_content || "",
          chat.last_message_timestamp || 0
        );
        
        await databaseService.updateChatUnreadCount(chat.chat_id, chat.unread_count);
        console.log(`[DeltaUpdateService] Updated chat: ${chat.chat_name}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to update chat ${chat.chat_id}:`, error);
      }
    }
  }

  private async processDeletedChats(chatIds: string[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${chatIds.length} deleted chats`);
    
    for (const chatId of chatIds) {
      try {
        await databaseService.deleteChatById(chatId);
        await messageService.clearMessages(chatId);
        console.log(`[DeltaUpdateService] Deleted chat: ${chatId}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to delete chat ${chatId}:`, error);
      }
    }
  }

  // MARK: - Message Delta Updates

  async performMessagesDeltaUpdate(chatId: string): Promise<void> {
    if (this.isSyncing) {
      console.log("[DeltaUpdateService] Message delta sync already in progress, skipping");
      return;
    }

    this.isSyncing = true;
    try {
      console.log(`[DeltaUpdateService] Starting message delta sync for chat ${chatId}`);

      // TODO: Implement actual message delta API call
      const deltaData = {
        new_messages: [],
        status_updates: []
      };

      // Process new messages
      if (deltaData.new_messages && Array.isArray(deltaData.new_messages)) {
        await this.processNewMessages(deltaData.new_messages);
      }

      // Process message status updates
      if (deltaData.status_updates && Array.isArray(deltaData.status_updates)) {
        await this.processMessageStatusUpdates(deltaData.status_updates);
      }

      console.log(`[DeltaUpdateService] Message delta sync completed for chat ${chatId}`);
    } catch (error) {
      console.error(`[DeltaUpdateService] Message delta sync failed for chat ${chatId}:`, error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processNewMessages(messages: any[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${messages.length} new messages`);
    
    for (const message of messages) {
      try {
        const messageEntity = {
          messageId: message.message_id,
          clientMessageId: message.client_message_id || message.message_id,
          chatId: message.chat_id,
          senderId: message.sender_id,
          content: message.content,
          timestamp: new Date(message.sent_at).getTime(),
          isRead: message.is_read || false,
          isSent: true,
          isDelivered: message.is_delivered || false,
          isFailed: false,
          senderUsername: message.sender_username || "Unknown",
          replyToMessageId: message.reply_to_message_id
        };

        await databaseService.insertMessage(messageEntity);
        console.log(`[DeltaUpdateService] Inserted new message: ${message.message_id}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to insert message ${message.message_id}:`, error);
      }
    }
  }

  private async processMessageStatusUpdates(statusUpdates: any[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${statusUpdates.length} status updates`);
    
    for (const update of statusUpdates) {
      try {
        switch (update.status) {
          case "sent":
            await messageService.updateMessageStatus(update.message_id, update.client_message_id, "sent");
            break;
          case "delivered":
            await messageService.updateMessageStatus(update.message_id, undefined, "delivered");
            break;
          case "read":
            await messageService.updateMessageStatus(update.message_id, undefined, "read");
            break;
        }
        console.log(`[DeltaUpdateService] Updated message status: ${update.message_id} -> ${update.status}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to update message status ${update.message_id}:`, error);
      }
    }
  }

  // MARK: - Friend Delta Updates

  async performFriendsDeltaUpdate(): Promise<void> {
    if (this.isSyncing) {
      console.log("[DeltaUpdateService] Friend delta sync already in progress, skipping");
      return;
    }

    this.isSyncing = true;
    try {
      console.log("[DeltaUpdateService] Starting friend delta sync");

      // TODO: Implement actual friend delta API call
      const deltaData = {
        new_friends: [],
        updated_friends: [],
        deleted_friend_ids: []
      };

      // Process new friends
      if (deltaData.new_friends && Array.isArray(deltaData.new_friends)) {
        await this.processNewFriends(deltaData.new_friends);
      }

      // Process updated friends
      if (deltaData.updated_friends && Array.isArray(deltaData.updated_friends)) {
        await this.processUpdatedFriends(deltaData.updated_friends);
      }

      // Process deleted friends
      if (deltaData.deleted_friend_ids && Array.isArray(deltaData.deleted_friend_ids)) {
        await this.processDeletedFriends(deltaData.deleted_friend_ids);
      }

      console.log("[DeltaUpdateService] Friend delta sync completed successfully");
    } catch (error) {
      console.error("[DeltaUpdateService] Friend delta sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processNewFriends(friends: any[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${friends.length} new friends`);
    
    for (const friend of friends) {
      try {
        const friendEntity = {
          friendId: friend.user_id,
          username: friend.username,
          email: friend.email,
          name: friend.name,
          picture: friend.picture,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: friend.status || "active",
          isFavorite: friend.is_favorite || false
        };

        await databaseService.insertFriend(friendEntity);
        console.log(`[DeltaUpdateService] Inserted new friend: ${friend.username}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to insert friend ${friend.user_id}:`, error);
      }
    }
  }

  private async processUpdatedFriends(friends: any[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${friends.length} updated friends`);
    
    for (const friend of friends) {
      try {
        // TODO: Add updateFriend method to databaseService
        console.log(`[DeltaUpdateService] Updated friend: ${friend.username}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to update friend ${friend.user_id}:`, error);
      }
    }
  }

  private async processDeletedFriends(friendIds: string[]): Promise<void> {
    console.log(`[DeltaUpdateService] Processing ${friendIds.length} deleted friends`);
    
    for (const friendId of friendIds) {
      try {
        // TODO: Add deleteFriend method to databaseService
        console.log(`[DeltaUpdateService] Deleted friend: ${friendId}`);
      } catch (error) {
        console.error(`[DeltaUpdateService] Failed to delete friend ${friendId}:`, error);
      }
    }
  }

  // MARK: - Full Sync

  async performFullSync(): Promise<void> {
    console.log("[DeltaUpdateService] Starting full sync");
    
    try {
      // Reset sync timestamp
      this.lastSyncTimestamp = 0;
      localStorage.setItem('last_sync_timestamp', '0');

      // Perform full sync for all data types
      await this.performChatsDeltaUpdate();
      await this.performFriendsDeltaUpdate();

      console.log("[DeltaUpdateService] Full sync completed successfully");
    } catch (error) {
      console.error("[DeltaUpdateService] Full sync failed:", error);
      throw error;
    }
  }

  // MARK: - Periodic Sync

  startPeriodicSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      this.stopPeriodicSync();
    }

    console.log(`[DeltaUpdateService] Starting periodic sync every ${intervalMs}ms`);
    
    this.syncInterval = window.setInterval(async () => {
      try {
        await this.performChatsDeltaUpdate();
        await this.performFriendsDeltaUpdate();
      } catch (error) {
        console.error("[DeltaUpdateService] Periodic sync failed:", error);
      }
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("[DeltaUpdateService] Stopped periodic sync");
    }
  }

  // MARK: - Utility Methods

  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  async forceSync(): Promise<void> {
    console.log("[DeltaUpdateService] Force sync requested");
    await this.performFullSync();
  }
}

// Export singleton instance
export const deltaUpdateService = DeltaUpdateService.shared; 