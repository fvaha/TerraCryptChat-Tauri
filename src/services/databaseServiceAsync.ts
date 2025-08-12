import { invoke } from '@tauri-apps/api/core';
import { Chat, User, Message, Friend, Participant, UserKeys } from '../models/models';

// Database service for async operations
export class DatabaseServiceAsync {
  // User operations
  async insertUser(user: User): Promise<void> {
    return await invoke('db_insert_user', { user });
  }

  async getUserById(user_id: string): Promise<User | null> {
    return await invoke<User | null>('db_get_user_by_id', { user_id });
  }

  async get_user_by_token(token: string): Promise<User | null> {
    return await invoke<User | null>('db_get_user_by_token', { token });
  }

  async get_most_recent_user(): Promise<User | null> {
    return await invoke<User | null>('db_get_most_recent_user');
  }

  async update_user_token(user_id: string, token: string): Promise<void> {
    return await invoke('db_update_user_token', { userId: user_id, token });
  }

  async update_color_scheme(user_id: string, color_scheme: string): Promise<void> {
    return await invoke('db_update_color_scheme', { userId: user_id, colorScheme: color_scheme });
  }

  async get_color_scheme(user_id: string): Promise<string> {
    return await invoke<string>('db_get_color_scheme', { userId: user_id });
  }

  async update_dark_mode(user_id: string, is_dark_mode: boolean): Promise<void> {
    return await invoke('db_update_dark_mode', { userId: user_id, isDarkMode: is_dark_mode });
  }

  async get_dark_mode(user_id: string): Promise<boolean> {
    return await invoke<boolean>('db_get_dark_mode', { userId: user_id });
  }

  async clearUserData(): Promise<void> {
    return await invoke('db_clear_user_data');
  }

  // Chat operations
  async insertChat(chat: Chat): Promise<void> {
    return await invoke('db_insert_chat', { chat });
  }

  async getChatById(chat_id: string): Promise<Chat | null> {
    return await invoke<Chat | null>('db_get_chat_by_id', { chatId: chat_id });
  }

  async getAllChats(): Promise<Chat[]> {
    return await invoke<Chat[]>('db_get_all_chats');
  }

  async updateChatUnreadCount(chat_id: string, unread_count: number): Promise<void> {
    await invoke('db_update_chat_unread_count', { chatId: chat_id, unreadCount: unread_count });
  }

  async updateChatLastMessage(chat_id: string, content?: string, timestamp?: number): Promise<void> {
    await invoke('db_update_chat_last_message', { chatId: chat_id, content, timestamp });
  }

  async deleteChatById(chat_id: string): Promise<void> {
    await invoke('db_delete_chat_by_id', { chatId: chat_id });
  }

  async clearChatData(): Promise<void> {
    return await invoke('db_clear_chat_data');
  }

  // Message operations
  async insertMessage(message: Message): Promise<void> {
    return await invoke('db_insert_message', { message });
  }

  async insertMessages(messages: Message[]): Promise<void> {
    return await invoke('db_insert_messages', { messages });
  }

  async getMessageById(message_id: string): Promise<Message | null> {
    return await invoke<Message | null>('db_get_message_by_id', { messageId: message_id });
  }

  async getMessageByClientId(client_message_id: string): Promise<Message | null> {
    return await invoke<Message | null>('db_get_message_by_client_id', { clientMessageId: client_message_id });
  }

  async getMessagesForChat(chat_id: string): Promise<Message[]> {
    return await invoke<Message[]>('db_get_messages_for_chat', { chatId: chat_id });
  }

  async getMessagesBeforeTimestamp(
    chat_id: string,
    before_timestamp: number,
    limit: number
  ): Promise<Message[]> {
    return await invoke<Message[]>('db_get_messages_before_timestamp', {
      chatId: chat_id,
      beforeTimestamp: before_timestamp,
      limit
    });
  }

  async getLastMessage(chat_id: string): Promise<Message | null> {
    return await invoke<Message | null>('db_get_last_message', { chatId: chat_id });
  }

  async updateMessageSentStatus(client_message_id: string, is_sent: boolean): Promise<void> {
    console.log("[DatabaseService] updateMessageSentStatus called with:", { client_message_id, is_sent });
    console.log("[DatabaseService] Invoking with parameters:", { clientMessageId: client_message_id, isSent: is_sent });
    await invoke('db_update_message_sent_status', { clientMessageId: client_message_id, isSent: is_sent });
  }

  async updateMessageSentStatusByServerId(server_id: string, is_sent: boolean): Promise<void> {
    console.log("[DatabaseService] updateMessageSentStatusByServerId called with:", { server_id, is_sent });
    console.log("[DatabaseService] Invoking with parameters:", { serverId: server_id, isSent: is_sent });
    await invoke('db_update_message_sent_status_by_server_id', { serverId: server_id, isSent: is_sent });
  }

  async markMessageDeliveredByServerId(server_id: string): Promise<void> {
    await invoke('db_mark_message_delivered_by_server_id', { serverId: server_id });
  }

  async markMessageReadByServerId(server_id: string): Promise<void> {
    await invoke('db_mark_message_read_by_server_id', { serverId: server_id });
  }

  async markMessagesReadByServerIds(message_ids: string[]): Promise<void> {
    await invoke('db_mark_messages_read_by_server_ids', { messageIds: message_ids });
  }

  async getUnreadMessages(chat_id: string): Promise<Message[]> {
    return await invoke<Message[]>('db_get_unread_messages', { chatId: chat_id });
  }

  async countUnreadMessages(chat_id: string): Promise<number> {
    return await invoke<number>('db_count_unread_messages', { chatId: chat_id });
  }

  async markMessagesAsRead(chat_id: string): Promise<void> {
    await invoke('db_mark_messages_as_read', { chatId: chat_id });
  }

  async updateMessageIdByClient(client_message_id: string, server_id: string): Promise<void> {
    await invoke('db_update_message_id_by_client', { clientMessageId: client_message_id, serverId: server_id });
  }

  async deleteMessageById(message_id: string): Promise<void> {
    await invoke('db_delete_message_by_id', { messageId: message_id });
  }

  async deleteMessageByClientId(client_message_id: string): Promise<void> {
    await invoke('db_delete_message_by_client_id', { clientMessageId: client_message_id });
  }

  async clearMessageData(): Promise<void> {
    return await invoke('db_clear_message_data');
  }

  async clearMessagesForChat(chat_id: string): Promise<void> {
    await invoke('db_clear_messages_for_chat', { chatId: chat_id });
  }

  async removeAllParticipantsForChat(chat_id: string): Promise<void> {
    await invoke('db_remove_all_participants_for_chat', { chatId: chat_id });
  }

  // Friend operations
  async insert_friend(friend: Friend): Promise<void> {
    return await invoke('db_insert_friend', { friend });
  }

  async get_all_friends(): Promise<Friend[]> {
    return await invoke<Friend[]>('db_get_all_friends');
  }

  async getFriendById(friend_id: string): Promise<Friend | null> {
    return await invoke<Friend | null>('db_get_friend_by_id', { friendId: friend_id });
  }

  async updateFriendStatus(friend_id: string, status: string): Promise<void> {
    await invoke('db_update_friend_status', { friendId: friend_id, status });
  }

  async deleteFriend(user_id: string): Promise<void> {
    await invoke('db_delete_friend', { userId: user_id });
  }

  async clearFriendData(): Promise<void> {
    await invoke('db_clear_friend_data');
  }

  // Participant operations
  async insertParticipant(participant: Participant): Promise<void> {
    return await invoke('db_insert_participant', { participant });
  }

  async get_participants_for_chat(chat_id: string): Promise<Participant[]> {
    return await invoke<Participant[]>('db_get_participants_for_chat', { chatId: chat_id });
  }

  async getParticipantById(participant_id: string): Promise<Participant | null> {
    return await invoke<Participant | null>('db_get_participant_by_id', { participantId: participant_id });
  }

  async deleteParticipant(participant_id: string): Promise<void> {
    await invoke('db_delete_participant', { participantId: participant_id });
  }

  async updateParticipantRole(participant_id: string, role: string): Promise<void> {
    await invoke('db_update_participant_role', { participantId: participant_id, role });
  }

  async getParticipantByUserIdAndChatId(user_id: string, chat_id: string): Promise<Participant | null> {
    return await invoke<Participant | null>('db_get_participant_by_user_id_and_chat_id', { userId: user_id, chatId: chat_id });
  }

  async clearParticipantData(): Promise<void> {
    return await invoke('db_clear_participant_data');
  }

  // User keys operations
  async insertUserKeys(keys: UserKeys): Promise<void> {
    return await invoke('db_insert_user_keys', { keys });
  }

  async getUserKeys(user_id: string): Promise<UserKeys | null> {
    return await invoke<UserKeys | null>('db_get_user_keys', { userId: user_id });
  }



  // Utility operations
  async clearAllData(): Promise<void> {
    return await invoke('db_clear_all_data');
  }

  async healthCheck(): Promise<boolean> {
    return await invoke<boolean>('db_health_check');
  }

  async getStats(): Promise<DatabaseStats> {
    return await invoke<DatabaseStats>('db_get_stats');
  }

  async performHealthCheck(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      console.log('[DatabaseServiceAsync] Health check result:', result);
      return result;
    } catch (error) {
      console.error('[DatabaseServiceAsync] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseServiceAsync = new DatabaseServiceAsync();

// Test function for native connection
export async function test_native_connection(): Promise<boolean> {
  try {
    const result = await invoke<boolean>('db_health_check');
    console.log('[DatabaseServiceAsync] Native connection test result:', result);
    return result;
  } catch (error) {
    console.error('[DatabaseServiceAsync] Native connection test failed:', error);
    return false;
  }
}

// WebSocket message interfaces
export interface DatabaseStats {
  total_users: number;
  total_chats: number;
  total_messages: number;
  total_friends: number;
  total_participants: number;
}

export interface IncomingWSMessage {
  type: string;
  payload: unknown;
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
