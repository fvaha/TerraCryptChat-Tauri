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
  name?: string;
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
  message_text: string;
  content: string; // Make content required to match MessageEntity
  timestamp: number;
  is_read: boolean;
  is_sent: boolean;
  is_delivered: boolean;
  is_failed: boolean;
  sender_username?: string;
  reply_to_message_id?: string;
  reply_to_username?: string;
  reply_to_content?: string;
}

export interface Friend {
  id: string;
  user_id: string;
  username: string;
  email: string;
  name: string;
  picture?: string;
  created_at: number;
  updated_at: number;
  status: "pending" | "accepted" | "rejected" | "blocked";
  is_favorite: boolean;
}

export interface Participant {
  id: string;
  participant_id: string;
  user_id: string;
  chat_id: string;
  username: string;
  name?: string;
  email?: string;
  picture?: string;
  role?: string;
  joined_at: number;
  left_at?: number;
  is_active: boolean;
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

class DatabaseServiceAsync {
  // User operations
  async insertUser(user: User): Promise<void> {
    await invoke('db_async_insert_user', { user });
  }

  async getUserById(userId: string): Promise<User | null> {
    return await invoke<User | null>('db_async_get_user_by_id', { userId });
  }

  async getUserByToken(token: string): Promise<User | null> {
    return await invoke<User | null>('db_async_get_user_by_token', { token });
  }

  async getMostRecentUser(): Promise<User | null> {
    return await invoke<User | null>('db_async_get_most_recent_user');
  }

  async updateUserToken(userId: string, token: string): Promise<void> {
    await invoke('db_async_update_user_token', { userId, token });
  }

  async clearUserData(): Promise<void> {
    await invoke('db_async_clear_user_data');
  }

  // Chat operations
  async insertChat(chat: Chat): Promise<void> {
    await invoke('db_async_insert_chat', { chat });
  }

  async getChatById(chatId: string): Promise<Chat | null> {
    return await invoke<Chat | null>('db_async_get_chat_by_id', { chatId });
  }

  async getAllChats(): Promise<Chat[]> {
    return await invoke<Chat[]>('db_async_get_all_chats');
  }

  async updateChatUnreadCount(chatId: string, unreadCount: number): Promise<void> {
    await invoke('db_async_update_chat_unread_count', { chatId, unreadCount });
  }

  async updateChatLastMessage(chatId: string, content?: string, timestamp?: number): Promise<void> {
    await invoke('db_async_update_chat_last_message', { chatId, content, timestamp });
  }

  async deleteChatById(chatId: string): Promise<void> {
    await invoke('db_async_delete_chat_by_id', { chatId });
  }

  async deleteChat(chatId: string): Promise<void> {
    await invoke('db_async_delete_chat', { chatId });
  }

  async clearChatData(): Promise<void> {
    await invoke('db_async_clear_chat_data');
  }

  // Message operations
  async insertMessage(message: Message): Promise<void> {
    await invoke('db_async_insert_message', { message });
  }

  async insertMessages(messages: Message[]): Promise<void> {
    await invoke('db_async_insert_messages', { messages });
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    return await invoke<Message | null>('db_async_get_message_by_id', { messageId });
  }

  async getMessageByClientId(clientMessageId: string): Promise<Message | null> {
    return await invoke<Message | null>('db_async_get_message_by_client_id', { clientMessageId });
  }

  async getMessagesForChat(chatId: string): Promise<Message[]> {
    return await invoke<Message[]>('db_async_get_messages_for_chat', { chatId });
  }

  async getMessagesBeforeTimestamp(chatId: string, beforeTimestamp: number, limit: number): Promise<Message[]> {
    return await invoke<Message[]>('db_async_get_messages_before_timestamp', { 
      chatId, 
      beforeTimestamp, 
      limit 
    });
  }

  async getLastMessage(chatId: string): Promise<Message | null> {
    return await invoke<Message | null>('db_async_get_last_message', { chatId });
  }

  async updateMessageSentStatus(clientMessageId: string, isSent: boolean): Promise<void> {
    await invoke('db_async_update_message_sent_status', { clientMessageId, isSent });
  }

  async updateMessageSentStatusByServerId(serverId: string, isSent: boolean): Promise<void> {
    await invoke('db_async_update_message_sent_status_by_server_id', { serverId, isSent });
  }

  async markMessageDeliveredByServerIdNew(serverId: string): Promise<void> {
    await invoke('db_async_mark_message_delivered_by_server_id_new', { serverId });
  }

  async markMessageReadByServerIdNew(serverId: string): Promise<void> {
    await invoke('db_async_mark_message_read_by_server_id_new', { serverId });
  }

  async markMessagesReadByServerIds(messageIds: string[]): Promise<void> {
    await invoke('db_async_mark_messages_read_by_server_ids', { messageIds });
  }

  async getUnreadMessages(chatId: string): Promise<Message[]> {
    return await invoke<Message[]>('db_async_get_unread_messages', { chatId });
  }

  async countUnreadMessages(chatId: string): Promise<number> {
    return await invoke<number>('db_async_count_unread_messages', { chatId });
  }

  async markMessagesAsRead(chatId: string): Promise<void> {
    await invoke('db_async_mark_messages_as_read', { chatId });
  }

  async updateMessageIdByClient(clientMessageId: string, serverId: string): Promise<void> {
    await invoke('db_async_update_message_id_by_client', { clientMessageId, serverId });
  }

  async deleteMessageById(messageId: string): Promise<void> {
    await invoke('db_async_delete_message_by_id', { messageId });
  }

  async deleteMessageByClientId(clientMessageId: string): Promise<void> {
    await invoke('db_async_delete_message_by_client_id', { clientMessageId });
  }

  async clearMessageData(): Promise<void> {
    await invoke('db_async_clear_message_data');
  }

  // Friend operations
  async insertFriend(friend: Friend): Promise<void> {
    await invoke('db_async_insert_friend', { friend });
  }

  async getAllFriends(): Promise<Friend[]> {
    return await invoke<Friend[]>('db_async_get_all_friends');
  }

  async getFriendById(friendId: string): Promise<Friend | null> {
    return await invoke<Friend | null>('db_async_get_friend_by_id', { friendId });
  }

  async updateFriendStatus(friendId: string, status: string): Promise<void> {
    await invoke('db_async_update_friend_status', { friendId, status });
  }

  async deleteFriend(friendId: string): Promise<void> {
    await invoke('db_async_delete_friend', { friendId });
  }

  async clearFriendData(): Promise<void> {
    await invoke('db_async_clear_friend_data');
  }

  // Participant operations
  async insertParticipant(participant: Participant): Promise<void> {
    await invoke('db_async_insert_participant', { participant });
  }

  async getParticipantsForChat(chatId: string): Promise<Participant[]> {
    return await invoke<Participant[]>('db_async_get_participants_for_chat', { chatId });
  }

  async getParticipantById(participantId: string): Promise<Participant | null> {
    return await invoke<Participant | null>('db_async_get_participant_by_id', { participantId });
  }

  async deleteParticipant(participantId: string): Promise<void> {
    await invoke('db_async_delete_participant', { participantId });
  }

  async updateParticipantRole(participantId: string, role: string): Promise<void> {
    await invoke('db_async_update_participant_role', { participantId, role });
  }

  async getParticipantByUserIdAndChatId(userId: string, chatId: string): Promise<Participant | null> {
    return await invoke<Participant | null>('db_async_get_participant_by_user_id_and_chat_id', { userId, chatId });
  }

  async clearParticipantData(): Promise<void> {
    await invoke('db_async_clear_participant_data');
  }

  async clearMessagesForChat(chatId: string): Promise<void> {
    await invoke('db_async_clear_messages_for_chat', { chatId });
  }

  async removeAllParticipantsForChat(chatId: string): Promise<void> {
    await invoke('db_async_remove_all_participants_for_chat', { chatId });
  }

  // User keys operations
  async insertUserKeys(keys: UserKeys): Promise<void> {
    await invoke('db_async_insert_user_keys', { keys });
  }

  async getUserKeys(userId: string): Promise<UserKeys | null> {
    return await invoke<UserKeys | null>('db_async_get_user_keys', { userId });
  }

  // Settings operations
  async updateDarkMode(userId: string, isDarkMode: boolean): Promise<void> {
    await invoke('db_async_update_dark_mode', { userId, isDarkMode });
  }

  async getDarkMode(userId: string): Promise<boolean> {
    return await invoke<boolean>('db_async_get_dark_mode', { userId });
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    await invoke('db_async_clear_all_data');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await invoke('db_async_health_check');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Performance monitoring
  async getDatabaseStats(): Promise<{
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    totalFriends: number;
  }> {
    return await invoke('db_async_get_stats');
  }
}

// Export singleton instance
export const databaseServiceAsync = new DatabaseServiceAsync();

// Simple connection test function
export async function test_native_connection(): Promise<boolean> {
  try {
    console.log('[Database] Testing native connection...');
    const result = await invoke('db_async_health_check');
    console.log('[Database] Native connection test successful:', result);
    return true;
  } catch (error) {
    console.error('[Database] Native connection test failed:', error);
    return false;
  }
}

// Additional interfaces for message service
export interface IncomingWSMessage {
  type: string;
  payload: any;
}

export interface MessageStatusMessage {
  message: MessageStatusPayload;
}

export interface MessageStatusPayload {
  message_id?: string;
  client_message_id?: string;
  status: "sent" | "delivered" | "read";
  chat_id?: string;
  sender_id?: string;
  recipient_id?: string;
  timestamp: string;
  message_ids?: string[]; // For bulk read status
}

export interface ChatMessage {
  message_id: string;
  client_message_id?: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  timestamp?: string;
  sender_username?: string;
}

export interface ChatMessageWrapper {
  message: ChatMessage;
  type: "chat";
  client_message_id?: string;
}



export enum MessageSendStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed"
} 