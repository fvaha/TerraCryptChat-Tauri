import { invoke } from '@tauri-apps/api/core';
import { User, Chat, Message, Friend, Participant, UserKeys } from '../services/databaseServiceAsync';

// Add interface for chat creation
export interface ParticipantSimple {
  user_id: string;
  is_admin?: boolean;
}

export class NativeApiService {
  // Database operations
  async initializeDatabase(): Promise<void> {
    return await invoke('db_initialize_database');
  }

  async ensureDatabaseInitialized(): Promise<void> {
    return await invoke('db_ensure_initialized');
  }

  async resetDatabaseInitialization(): Promise<void> {
    return await invoke('db_reset_initialization');
  }

  async clearAllData(): Promise<void> {
    return await invoke('db_clear_all_data');
  }

  async healthCheck(): Promise<boolean> {
    return await invoke('db_health_check');
  }

  async getDatabaseStats(): Promise<{ total_chats: number; total_messages: number; total_users: number }> {
    return await invoke('db_get_stats');
  }

  // User operations
  async insertUser(user: User): Promise<void> {
    return await invoke('db_insert_user', { user });
  }

  async get_user_by_id(user_id: string): Promise<User | null> {
    return await invoke('db_get_user_by_id', { user_id });
  }

  async get_user_by_token(token: string): Promise<User | null> {
    return await invoke('db_get_user_by_token', { token });
  }

  async get_most_recent_user(): Promise<User | null> {
    return await invoke('db_get_most_recent_user');
  }

  async update_user_token(user_id: string, token: string): Promise<void> {
    return await invoke('db_update_user_token', { user_id, token });
  }

  async clearUserData(): Promise<void> {
    return await invoke('db_clear_user_data');
  }

  async update_dark_mode(user_id: string, is_dark_mode: boolean): Promise<void> {
    return await invoke('db_update_dark_mode', { user_id, is_dark_mode });
  }

  async get_dark_mode(user_id: string): Promise<boolean> {
    return await invoke('db_get_dark_mode', { user_id });
  }

  async update_color_scheme(user_id: string, color_scheme: string): Promise<void> {
    return await invoke('db_update_color_scheme', { user_id, color_scheme });
  }

  async get_color_scheme(user_id: string): Promise<string> {
    return await invoke('db_get_color_scheme', { user_id });
  }

  // Chat operations
  async insertChat(chat: Chat): Promise<void> {
    return await invoke('db_insert_chat', { chat });
  }

  async insertOrUpdateChat(chat: Chat): Promise<void> {
    return await invoke('db_insert_or_update_chat', { chat });
  }

  async getChatById(chat_id: string): Promise<Chat | null> {
    return await invoke('db_get_chat_by_id', { chat_id });
  }

  async getAllChats(): Promise<Chat[]> {
    return await invoke('db_get_all_chats');
  }

  async getCachedChatsOnly(): Promise<Chat[]> {
    return await invoke('db_get_cached_chats_only');
  }

  async getCachedChatsForCurrentUserFiltered(token: string): Promise<Chat[]> {
    return await invoke('get_cached_chats_for_current_user_filtered', { token });
  }

  async updateChatUnreadCount(chat_id: string, unread_count: number): Promise<void> {
    return await invoke('db_update_chat_unread_count', { chat_id, unread_count });
  }

  async updateChatLastMessage(chat_id: string, content?: string, timestamp?: number): Promise<void> {
    return await invoke('db_update_chat_last_message', { chat_id, content, timestamp });
  }

  async deleteChat(chat_id: string): Promise<void> {
    return await invoke('db_delete_chat_by_id', { chat_id });
  }

  async leaveChat(chat_id: string): Promise<void> {
    await invoke('leave_chat', { chat_id });
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
    return await invoke('db_get_message_by_id', { message_id });
  }

  async getMessageByClientId(client_message_id: string): Promise<Message | null> {
    return await invoke('db_get_message_by_client_id', { client_message_id });
  }

  async getMessagesForChat(chat_id: string): Promise<Message[]> {
    return await invoke('db_get_messages_for_chat', { chat_id });
  }

  async getMessagesBeforeTimestamp(
    chat_id: string,
    before_timestamp: number,
    limit: number
  ): Promise<Message[]> {
    return await invoke('db_get_messages_before_timestamp', {
      chat_id,
      before_timestamp,
      limit
    });
  }

  async getLastMessage(chat_id: string): Promise<Message | null> {
    return await invoke('db_get_last_message', { chat_id });
  }

  async updateMessageSentStatus(client_message_id: string, is_sent: boolean): Promise<void> {
    return await invoke('db_update_message_sent_status', { client_message_id, is_sent });
  }

  async updateMessageSentStatusByServerId(server_id: string, is_sent: boolean): Promise<void> {
    return await invoke('db_update_message_sent_status_by_server_id', { server_id, is_sent });
  }

  async markMessageDeliveredByServerId(server_id: string): Promise<void> {
    return await invoke('db_mark_message_delivered_by_server_id', { server_id });
  }

  async markMessageReadByServerId(server_id: string): Promise<void> {
    return await invoke('db_mark_message_read_by_server_id', { server_id });
  }

  async markMessagesReadByServerIds(message_ids: string[]): Promise<void> {
    return await invoke('db_mark_messages_read_by_server_ids', { message_ids });
  }

  async getUnreadMessages(chat_id: string): Promise<Message[]> {
    return await invoke('db_get_unread_messages', { chat_id });
  }

  async countUnreadMessages(chat_id: string): Promise<number> {
    return await invoke('db_count_unread_messages', { chat_id });
  }

  async markMessagesAsRead(chat_id: string): Promise<void> {
    return await invoke('db_mark_messages_as_read', { chat_id });
  }

  async updateMessageIdByClient(client_message_id: string, server_id: string): Promise<void> {
    return await invoke('db_update_message_id_by_client', { client_message_id, server_id });
  }

  async deleteMessageById(message_id: string): Promise<void> {
    return await invoke('db_delete_message_by_id', { message_id });
  }

  async deleteMessageByClientId(client_message_id: string): Promise<void> {
    return await invoke('db_delete_message_by_client_id', { client_message_id });
  }

  async clearMessageData(): Promise<void> {
    return await invoke('db_clear_message_data');
  }

  async clearMessagesForChat(chat_id: string): Promise<void> {
    return await invoke('db_clear_messages_for_chat', { chat_id });
  }

  async removeAllParticipantsForChat(chat_id: string): Promise<void> {
    return await invoke('db_remove_all_participants_for_chat', { chat_id });
  }

  // Friend operations
  async insert_friend(friend: Friend): Promise<void> {
    return await invoke('db_insert_friend', { friend });
  }

  async insert_or_update_friend(friend: Friend): Promise<void> {
    return await invoke('db_insert_or_update_friend', { friend });
  }

  async get_all_friends(): Promise<Friend[]> {
    return await invoke('db_get_all_friends');
  }

  async getCachedFriendsOnly(): Promise<Friend[]> {
    return await invoke('db_get_cached_friends_only');
  }

  async getFriendById(friend_id: string): Promise<Friend | null> {
    return await invoke('db_get_friend_by_id', { friend_id });
  }

  async deleteFriend(user_id: string): Promise<void> {
    return await invoke('db_delete_friend', { user_id });
  }

  async updateFriendStatus(friend_id: string, status: string): Promise<void> {
    return await invoke('db_update_friend_status', { friend_id, status });
  }

  async clearFriendData(): Promise<void> {
    return await invoke('db_clear_friend_data');
  }

  // Participant operations
  async insertParticipant(participant: Participant): Promise<void> {
    return await invoke('db_insert_participant', { participant });
  }

  async get_participants_for_chat(chat_id: string): Promise<Participant[]> {
    return await invoke('db_get_participants_for_chat', { chat_id });
  }

  async getParticipantById(participant_id: string): Promise<Participant | null> {
    return await invoke('db_get_participant_by_id', { participant_id });
  }

  async getParticipantByUserIdAndChatId(user_id: string, chat_id: string): Promise<Participant | null> {
    return await invoke('db_get_participant_by_user_id_and_chat_id', { user_id, chat_id });
  }

  async updateParticipantRole(participant_id: string, role: string): Promise<void> {
    return await invoke('db_update_participant_role', { participant_id, role });
  }

  async deleteParticipant(participant_id: string): Promise<void> {
    return await invoke('db_delete_participant', { participant_id });
  }

  async clearParticipantData(): Promise<void> {
    return await invoke('db_clear_participant_data');
  }

  // User keys operations
  async insertUserKeys(keys: UserKeys): Promise<void> {
    return await invoke('db_insert_user_keys', { keys });
  }

  async getUserKeys(user_id: string): Promise<UserKeys | null> {
    return await invoke('db_get_user_keys', { user_id });
  }

  // Utility operations
  async resetDatabase(): Promise<void> {
    return await invoke('db_reset_database');
  }

  async performHealthCheck(): Promise<boolean> {
    return await invoke('db_health_check');
  }

  // Chat creation
  async createChat(token: string, name: string, members: ParticipantSimple[]): Promise<Chat> {
    return await invoke('create_chat', { token, name, members });
  }

  async resizeWindow(width: number, height: number): Promise<void> {
    return await invoke('resize_window', { width, height });
  }
}

export const nativeApiService = new NativeApiService(); 
