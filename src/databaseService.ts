import { invoke } from '@tauri-apps/api/core';

export interface User {
  user_id: string;
  username: string;
  email?: string;
  name?: string;
  password?: string;
  picture?: string;
  role?: string;
  token_hash?: string;
  verified: boolean;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
  is_dark_mode: boolean;
  last_seen: number;
}

export interface Chat {
  chat_id: string;
  chat_type?: string;
  chat_name?: string;
  created_at: number;
  admin_id?: string;
  unread_count: number;
  description?: string;
  group_name?: string;
  last_message_content?: string;
  last_message_timestamp?: number;
  participants?: string;
  is_group: boolean;
  creator_id?: string;
}

export interface Message {
  id?: number;
  message_id?: string;
  client_message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  timestamp: number;
  is_read: boolean;
  is_sent: boolean;
  is_delivered: boolean;
  is_failed: boolean;
  sender_username?: string;
  reply_to_message_id?: string;
}

export interface Friend {
  friend_id: string;
  username: string;
  email: string;
  name: string;
  picture?: string;
  created_at?: number;
  updated_at?: number;
  status?: string;
  is_favorite: boolean;
}

export interface Participant {
  participant_id: string;
  user_id: string;
  username: string;
  joined_at: number;
  role: string;
  chat_id: string;
}

export interface UserKeys {
  user_id: string;
  key1: string;
  key2: string;
  key3: string;
  key4: string;
  private_key1: string;
  private_key2: string;
  private_key3: string;
  private_key4: string;
}

class DatabaseService {
  // User operations
  async insertUser(user: User): Promise<void> {
    await invoke('db_insert_user', { user });
  }

  async getUserById(userId: string): Promise<User | null> {
    return await invoke('db_get_user_by_id', { userId });
  }

  async getUserByToken(token: string): Promise<User | null> {
    return await invoke('db_get_user_by_token', { token });
  }

  async getMostRecentUser(): Promise<User | null> {
    return await invoke('db_get_most_recent_user');
  }

  async updateUserToken(userId: string, token: string): Promise<void> {
    await invoke('db_update_user_token', { userId, token });
  }

  async clearUserData(): Promise<void> {
    await invoke('db_clear_user_data');
  }

  // Chat operations
  async insertChat(chat: Chat): Promise<void> {
    try {
      await invoke('db_insert_chat', { chat });
    } catch (error) {
      console.error('[DatabaseService] Failed to insert chat:', error);
      
      // Check if this is a schema issue
      if (error && typeof error === 'object' && 'toString' in error && error.toString().includes('table chat has no column named name')) {
        console.log('[DatabaseService] Detected database schema issue, attempting to fix...');
        try {
          await invoke('db_reset_database');
          console.log('[DatabaseService] Database schema fixed, retrying chat insertion...');
          // Retry the insertion
          await invoke('db_insert_chat', { chat });
          console.log('[DatabaseService] Chat inserted successfully after schema fix');
        } catch (fixError) {
          console.error('[DatabaseService] Failed to fix database schema:', fixError);
          throw fixError;
        }
      } else {
        throw error;
      }
    }
  }

  async getChatById(chatId: string): Promise<Chat | null> {
    return await invoke('db_get_chat_by_id', { chatId });
  }

  async getAllChats(): Promise<Chat[]> {
    return await invoke('db_get_all_chats');
  }

  async updateChatUnreadCount(chatId: string, unreadCount: number): Promise<void> {
    await invoke('db_update_chat_unread_count', { chatId, unreadCount });
  }

  async updateChatLastMessage(chatId: string, content?: string, timestamp?: number): Promise<void> {
    await invoke('db_update_chat_last_message', { chat_id: chatId, content, timestamp });
  }

  async deleteChatById(chatId: string): Promise<void> {
    await invoke('db_delete_chat_by_id', { chat_id: chatId });
  }

  async clearChatData(): Promise<void> {
    await invoke('db_clear_chat_data');
  }

  // Message operations
  async insertMessage(message: Message): Promise<void> {
    await invoke('db_insert_message', { message });
  }

  async insertMessages(messages: Message[]): Promise<void> {
    await invoke('db_insert_messages', { messages });
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    return await invoke('db_get_message_by_id', { messageId });
  }

  async getMessageByClientId(clientMessageId: string): Promise<Message | null> {
    return await invoke('db_get_message_by_client_id', { clientMessageId });
  }

  async getMessagesForChat(chatId: string): Promise<Message[]> {
    return await invoke('db_get_messages_for_chat', { chat_id: chatId });
  }

  async getMessagesBeforeTimestamp(chatId: string, beforeTimestamp: number, limit: number): Promise<Message[]> {
    return await invoke('db_get_messages_before_timestamp', { chat_id: chatId, before_timestamp: beforeTimestamp, limit });
  }

  async getLastMessage(chatId: string): Promise<Message | null> {
    return await invoke('db_get_last_message', { chatId });
  }

  async updateMessageSentStatus(clientMessageId: string, isSent: boolean): Promise<void> {
    await invoke('db_update_message_sent_status', { clientMessageId, isSent });
  }

  async markMessageDeliveredByServerId(messageId: string): Promise<void> {
    await invoke('db_mark_message_delivered_by_server_id', { messageId });
  }

  async markMessageReadByServerId(messageId: string): Promise<void> {
    await invoke('db_mark_message_read_by_server_id', { messageId });
  }

  async markMessagesReadByServerIds(messageIds: string[]): Promise<void> {
    await invoke('db_mark_messages_read_by_server_ids', { messageIds });
  }

  async getUnreadMessages(chatId: string): Promise<Message[]> {
    return await invoke('db_get_unread_messages', { chat_id: chatId });
  }

  async countUnreadMessages(chatId: string): Promise<number> {
    return await invoke('db_count_unread_messages', { chat_id: chatId });
  }

  async markMessagesAsRead(chatId: string): Promise<void> {
    await invoke('db_mark_messages_as_read', { chat_id: chatId });
  }

  async updateMessageIdByClient(clientMessageId: string, serverId: string): Promise<void> {
    await invoke('db_update_message_id_by_client', { client_message_id: clientMessageId, server_id: serverId });
  }

  async deleteMessageById(messageId: string): Promise<void> {
    await invoke('db_delete_message_by_id', { message_id: messageId });
  }

  async deleteMessageByClientId(clientMessageId: string): Promise<void> {
    await invoke('db_delete_message_by_client_id', { client_message_id: clientMessageId });
  }

  async clearMessageData(): Promise<void> {
    await invoke('db_clear_message_data');
  }

  // Friend operations
  async insertFriend(friend: Friend): Promise<void> {
    try {
      await invoke('db_insert_friend', { friend });
    } catch (error) {
      console.error('[DatabaseService] Failed to insert friend:', error);
      
      // Check if this is a schema issue
      if (error && typeof error === 'object' && 'toString' in error && error.toString().includes('table friend has no column named user_id')) {
        console.log('[DatabaseService] Detected database schema issue, attempting to fix...');
        try {
          await invoke('db_reset_database');
          console.log('[DatabaseService] Database schema fixed, retrying friend insertion...');
          // Retry the insertion
          await invoke('db_insert_friend', { friend });
          console.log('[DatabaseService] Friend inserted successfully after schema fix');
        } catch (fixError) {
          console.error('[DatabaseService] Failed to fix database schema:', fixError);
          throw fixError;
        }
      } else {
        throw error;
      }
    }
  }

  async getAllFriends(): Promise<Friend[]> {
    return await invoke('db_get_all_friends');
  }

  async clearFriendData(): Promise<void> {
    await invoke('db_clear_friend_data');
  }

  // Participant operations
  async insertParticipant(participant: Participant): Promise<void> {
    await invoke('db_insert_participant', { participant });
  }

  async getParticipantsForChat(chatId: string): Promise<Participant[]> {
    return await invoke('db_get_participants_for_chat', { chat_id: chatId });
  }

  async clearParticipantData(): Promise<void> {
    await invoke('db_clear_participant_data');
  }

  // User keys operations
  async insertUserKeys(keys: UserKeys): Promise<void> {
    await invoke('db_insert_user_keys', { keys });
  }

  async getUserKeys(userId: string): Promise<UserKeys | null> {
    return await invoke('db_get_user_keys', { userId });
  }

  // Settings operations
  async updateDarkMode(userId: string, isDarkMode: boolean): Promise<void> {
    await invoke('db_update_dark_mode', { userId, isDarkMode });
  }

  async getDarkMode(userId: string): Promise<boolean> {
    return await invoke('db_get_dark_mode', { userId });
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    await invoke('db_clear_all_data');
  }
}

export const databaseService = new DatabaseService(); 