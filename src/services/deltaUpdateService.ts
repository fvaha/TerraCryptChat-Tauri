
import { invoke } from '@tauri-apps/api/core';
import { databaseServiceAsync } from "./databaseServiceAsync";

export class DeltaUpdateService {
  async performChatsDeltaUpdate(): Promise<void> {
    try {
      console.log("[DeltaUpdateService] Performing chats delta update...");
      
      const response = await invoke<{ data: any[] }>("get_chats", {});
      
      if (!response || !response.data) {
        console.warn("[DeltaUpdateService] No chats data received");
        return;
      }
      
      console.log(`[DeltaUpdateService] Processing ${response.data.length} chats`);
      
      for (const chat of response.data) {
        const chatEntity = {
          chat_id: chat.chat_id,
          name: chat.name || null,
          is_group: Boolean(chat.is_group),
          created_at: new Date(chat.created_at).getTime(),
          creator_id: chat.creator_id,
          last_message_content: chat.last_message || null,
          last_message_timestamp: chat.last_message_timestamp || null,
          unread_count: chat.unread_count || 0,
          participants: chat.participants ? JSON.stringify(chat.participants) : undefined
        };
        
        await databaseServiceAsync.insertChat(chatEntity);
      }
      
      console.log("[DeltaUpdateService] Chats delta update completed");
    } catch (error) {
      console.error("[DeltaUpdateService] Failed to perform chats delta update:", error);
    }
  }

  async performMessagesDeltaUpdate(): Promise<void> {
    try {
      console.log("[DeltaUpdateService] Performing messages delta update...");
      
      const response = await invoke<{ data: any[] }>("get_messages", {});
      
      if (!response || !response.data) {
        console.warn("[DeltaUpdateService] No messages data received");
        return;
      }
      
      console.log(`[DeltaUpdateService] Processing ${response.data.length} messages`);
      
      for (const message of response.data) {
        const messageEntity = {
          message_id: message.message_id || undefined,
          client_message_id: message.client_message_id || `temp_${Date.now()}`,
          chat_id: message.chat_id,
          sender_id: message.sender_id,
          sender_username: message.sender_username,
          message_text: message.content,
          content: message.content,
          timestamp: new Date(message.sent_at || message.timestamp).getTime(),
          is_read: Boolean(message.is_read),
          is_sent: Boolean(message.is_sent),
          is_delivered: Boolean(message.is_delivered),
          is_failed: Boolean(message.is_failed),
          reply_to_message_id: message.reply_to_message_id || undefined
        };
        
        await databaseServiceAsync.insertMessage(messageEntity);
      }
      
      console.log("[DeltaUpdateService] Messages delta update completed");
    } catch (error) {
      console.error("[DeltaUpdateService] Failed to perform messages delta update:", error);
    }
  }

  async performFriendsDeltaUpdate(): Promise<void> {
    try {
      console.log("[DeltaUpdateService] Performing friends delta update...");
      
      const response = await invoke<{ data: any[] }>("get_friends", {});
      
      if (!response || !response.data) {
        console.warn("[DeltaUpdateService] No friends data received");
        return;
      }
      
      console.log(`[DeltaUpdateService] Processing ${response.data.length} friends`);
      
      for (const friend of response.data) {
        const friendEntity = {
          id: friend.id || `temp_${Date.now()}`,
          user_id: friend.user_id || friend.friend_id,
          username: friend.username,
          email: friend.email,
          name: friend.name,
          picture: friend.picture,
          status: friend.status,
          created_at: new Date(friend.created_at).getTime(),
          updated_at: new Date(friend.updated_at).getTime(),
          is_favorite: Boolean(friend.is_favorite)
        };
        
        await databaseServiceAsync.insertFriend(friendEntity);
      }
      
      console.log("[DeltaUpdateService] Friends delta update completed");
    } catch (error) {
      console.error("[DeltaUpdateService] Failed to perform friends delta update:", error);
    }
  }

  async performParticipantsDeltaUpdate(): Promise<void> {
    try {
      console.log("[DeltaUpdateService] Performing participants delta update...");
      
      const response = await invoke<{ data: any[] }>("get_participants", {});
      
      if (!response || !response.data) {
        console.warn("[DeltaUpdateService] No participants data received");
        return;
      }
      
      console.log(`[DeltaUpdateService] Processing ${response.data.length} participants`);
      
      for (const participant of response.data) {
        const participantEntity = {
          id: participant.id || `temp_${Date.now()}`,
          participant_id: participant.id,
          user_id: participant.user_id,
          chat_id: participant.chat_id,
          username: participant.username,
          joined_at: new Date(participant.joined_at).getTime(),
          role: participant.role,
          is_active: true
        };
        
        await databaseServiceAsync.insertParticipant(participantEntity);
      }
      
      console.log("[DeltaUpdateService] Participants delta update completed");
    } catch (error) {
      console.error("[DeltaUpdateService] Failed to perform participants delta update:", error);
    }
  }

  async performFullDeltaUpdate(): Promise<void> {
    try {
      console.log("[DeltaUpdateService] Performing full delta update...");
      
      await Promise.all([
        this.performChatsDeltaUpdate(),
        this.performMessagesDeltaUpdate(),
        this.performFriendsDeltaUpdate(),
        this.performParticipantsDeltaUpdate()
      ]);
      
      console.log("[DeltaUpdateService] Full delta update completed");
    } catch (error) {
      console.error("[DeltaUpdateService] Failed to perform full delta update:", error);
    }
  }
}

export const deltaUpdateService = new DeltaUpdateService(); 