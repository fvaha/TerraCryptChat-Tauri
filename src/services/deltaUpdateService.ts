
import { invoke } from '@tauri-apps/api/core';
import { databaseServiceAsync } from "./databaseServiceAsync";

interface ChatData {
  chat_id: string;
  name?: string;
  created_at: string | number;
  creator_id?: string;
  last_message?: string;
  last_message_timestamp?: number;
  unread_count?: number;
  is_group?: boolean;
  participants?: Array<{ user_id: string; username: string; role: string }>;
}

interface MessageData {
  message_id?: string;
  client_message_id?: string;
  chat_id: string;
  sender_id: string;
  sender_username?: string;
  content: string;
  sent_at?: string | number;
  timestamp?: string | number;
  is_read?: boolean;
  is_sent?: boolean;
  is_delivered?: boolean;
  is_failed?: boolean;
  reply_to_message_id?: string;
}

interface FriendData {
  id?: string;
  user_id?: string;
  friend_id?: string;
  status: string;
  created_at?: string | number;
  username?: string;
  name?: string;
  email?: string;
  picture?: string;
  is_favorite?: boolean;
}

interface ParticipantData {
  participant_id?: string;
  chat_id: string;
  user_id: string;
  role: string;
  created_at?: string | number;
  username?: string;
  name?: string;
  picture?: string;
}

export class DeltaUpdateService {
  async performChatsDeltaUpdate(): Promise<void> {
    try {
      console.log("[DeltaUpdateService] Performing chats delta update...");
      
      const response = await invoke<{ data: ChatData[] }>("get_chats", {});
      
      if (!response || !response.data) {
        console.warn("[DeltaUpdateService] No chats data received");
        return;
      }
      
      console.log(`[DeltaUpdateService] Processing ${response.data.length} chats`);
      
      for (const chat of response.data) {
        const chatEntity = {
          chat_id: chat.chat_id,
          name: chat.name || null,
          chat_type: chat.is_group ? 'group' : 'direct',
          created_at: new Date(chat.created_at).toISOString(),
          updated_at: new Date(chat.created_at).toISOString(),
          creator_id: chat.creator_id,
          last_message_content: chat.last_message || null,
          last_message_timestamp: chat.last_message_timestamp || null,
          unread_count: chat.unread_count || 0,
          is_group: Boolean(chat.is_group),
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
      
      const response = await invoke<{ data: MessageData[] }>("get_messages", {});
      
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
      
      const response = await invoke<{ data: FriendData[] }>("get_friends", {});
      
      if (!response || !response.data) {
        console.warn("[DeltaUpdateService] No friends data received");
        return;
      }
      
      console.log(`[DeltaUpdateService] Processing ${response.data.length} friends`);
      
      for (const friend of response.data) {
        const friendEntity = {
          friend_id: friend.id || `temp_${Date.now()}`,
          user_id: friend.user_id || friend.friend_id,
          friend_user_id: friend.user_id || friend.friend_id,
          status: friend.status,
          created_at: new Date(friend.created_at).toISOString(),
          updated_at: new Date(friend.updated_at).toISOString(),
          friend_username: friend.username,
          friend_name: friend.name,
          friend_picture: friend.picture
        };
        
        await databaseServiceAsync.insert_friend(friendEntity);
      }
      
      console.log("[DeltaUpdateService] Friends delta update completed");
    } catch (error) {
      console.error("[DeltaUpdateService] Failed to perform friends delta update:", error);
    }
  }

  async performParticipantsDeltaUpdate(): Promise<void> {
    try {
      console.log("[DeltaUpdateService] Performing participants delta update...");
      
      const response = await invoke<{ data: ParticipantData[] }>("get_participants", {});
      
      if (!response || !response.data) {
        console.warn("[DeltaUpdateService] No participants data received");
        return;
      }
      
      console.log(`[DeltaUpdateService] Processing ${response.data.length} participants`);
      
      for (const participant of response.data) {
        const participantEntity = {
          participant_id: participant.participant_id,
          chat_id: participant.chat_id,
          user_id: participant.user_id,
          role: participant.role,
          created_at: new Date(participant.created_at).toISOString(),
          updated_at: new Date(participant.created_at).toISOString(),
          username: participant.username,
          name: participant.name,
          picture: participant.picture
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
