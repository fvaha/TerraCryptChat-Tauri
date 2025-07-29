import { invoke } from '@tauri-apps/api/core';

export interface UserData {
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  verified: boolean;
}

export interface Friend {
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  status?: string;
  is_favorite?: boolean;
}

export interface FriendRequest {
  request_id: string;
  receiver_id: string;
  status: string;
  created_at?: string;
  sender: Friend;
}

export interface ChatMember {
  user: Friend;
  is_admin: boolean;
  joined_at: string;
}

export interface ChatMemberResponse {
  data: ChatMember[];
  limit: number;
  offset: number;
}

export interface Chat {
  chat_id: string;
  chat_name: string;
  creator_id: string;
  is_group: boolean;
  description?: string;
  group_name?: string;
  last_message_content?: string;
  last_message_timestamp?: number;
  unread_count: number;
  created_at: number;
}

export interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  timestamp: number;
  sender_username: string;
  reply_to_message_id?: string;
}

export interface SendMessageResponse {
  message_id: string;
  timestamp: number;
}

class NativeApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async makeRequest<T>(command: string, args: Record<string, any> = {}): Promise<T> {
    if (!this.token) {
      throw new Error('No token available');
    }

    try {
      const result = await invoke(command, { token: this.token, ...args });
      return result as T;
    } catch (error) {
      console.error(`Native API ${command} failed:`, error);
      throw error;
    }
  }

  // User API
  async getCurrentUser(): Promise<UserData> {
    console.log('Getting current user via native API...');
    return this.makeRequest<UserData>('get_current_user');
  }

  // Chats API
  async getChats(): Promise<Chat[]> {
    console.log('Getting chats via native API...');
    return this.makeRequest<Chat[]>('get_chats_with_token');
  }

  // Cached chats with delta updates
  async getCachedChatsWithDelta(): Promise<Chat[]> {
    console.log('Getting cached chats with delta updates...');
    return this.makeRequest<Chat[]>('get_cached_chats_with_delta');
  }

  // Cached chats only (no API call)
  async getCachedChatsOnly(): Promise<Chat[]> {
    console.log('Getting cached chats only...');
    return this.makeRequest<Chat[]>('get_cached_chats_only');
  }

  // Friends API
  async getFriends(): Promise<Friend[]> {
    console.log('Getting friends via native API...');
    return this.makeRequest<Friend[]>('get_friends_with_token');
  }

  // Cached friends with delta updates
  async getCachedFriendsWithDelta(): Promise<Friend[]> {
    console.log('Getting cached friends with delta updates...');
    return this.makeRequest<Friend[]>('get_cached_friends_with_delta');
  }

  // Cached friends only (no API call)
  async getCachedFriendsOnly(): Promise<Friend[]> {
    console.log('Getting cached friends only...');
    return this.makeRequest<Friend[]>('get_cached_friends_only');
  }

  // Cached messages for chat
  async getCachedMessagesForChat(chatId: string): Promise<ChatMessage[]> {
    console.log(`Getting cached messages for chat ${chatId}...`);
    return this.makeRequest<ChatMessage[]>('get_cached_messages_for_chat', { chat_id: chatId });
  }

  // Cached participants for chat
  async getCachedParticipantsForChat(chatId: string): Promise<ChatMember[]> {
    console.log(`Getting cached participants for chat ${chatId}...`);
    return this.makeRequest<ChatMember[]>('get_cached_participants_for_chat', { chat_id: chatId });
  }

  // New database-first service methods
  async fetchAllChatsAndSave(token: string): Promise<Chat[]> {
    console.log('Fetching all chats from API and saving to database...');
    return this.makeRequest<Chat[]>('fetch_all_chats_and_save', { token });
  }

  async fetchAllFriendsAndSave(token: string): Promise<Friend[]> {
    console.log('Fetching all friends from API and saving to database...');
    return this.makeRequest<Friend[]>('fetch_all_friends_and_save', { token });
  }

  async chatsDeltaUpdate(token: string): Promise<Chat[]> {
    console.log('Performing delta update for chats...');
    return this.makeRequest<Chat[]>('chats_delta_update', { token });
  }

  async friendsDeltaUpdate(token: string): Promise<Friend[]> {
    console.log('Performing delta update for friends...');
    return this.makeRequest<Friend[]>('friends_delta_update', { token });
  }

  async getCachedChatsForCurrentUser(): Promise<Chat[]> {
    console.log('Getting cached chats for current user...');
    return this.makeRequest<Chat[]>('get_cached_chats_for_current_user');
  }

  async getCachedFriendsForCurrentUser(): Promise<Friend[]> {
    console.log('Getting cached friends for current user...');
    return this.makeRequest<Friend[]>('get_cached_friends_for_current_user');
  }

  async deleteChatFromDatabase(chatId: string): Promise<void> {
    console.log(`Deleting chat ${chatId} from database...`);
    return this.makeRequest<void>('delete_chat_from_database', { chat_id: chatId });
  }

  async deleteFriendFromDatabase(userId: string): Promise<void> {
    console.log(`Deleting friend ${userId} from database...`);
    return this.makeRequest<void>('delete_friend_from_database', { user_id: userId });
  }

  // Additional methods needed by ChatService
  async deleteChat(chatId: string, token: string): Promise<void> {
    console.log(`Deleting chat ${chatId} from server...`);
    return this.makeRequest<void>('delete_chat', { chat_id: chatId, token });
  }

  async leaveChat(chatId: string, token: string): Promise<void> {
    console.log(`Leaving chat ${chatId}...`);
    return this.makeRequest<void>('leave_chat', { chat_id: chatId, token });
  }

  async resetUnreadCount(chatId: string): Promise<void> {
    console.log(`Resetting unread count for chat ${chatId}...`);
    return this.makeRequest<void>('reset_unread_count', { chat_id: chatId });
  }

  // Additional methods needed by FriendService
  async deleteFriend(userId: string, token: string): Promise<void> {
    console.log(`Deleting friend ${userId} from server...`);
    return this.makeRequest<void>('delete_friend', { user_id: userId, token });
  }

  async searchFriends(query: string, token: string): Promise<Friend[]> {
    console.log(`Searching friends with query: ${query}...`);
    return this.makeRequest<Friend[]>('search_friends', { query, token });
  }

  async sendFriendRequest(userId: string, token: string): Promise<void> {
    console.log(`Sending friend request to ${userId}...`);
    return this.makeRequest<void>('send_friend_request', { user_id: userId, token });
  }

  async acceptFriendRequest(requestId: string, token: string): Promise<void> {
    console.log(`Accepting friend request ${requestId}...`);
    return this.makeRequest<void>('accept_friend_request', { request_id: requestId, token });
  }

  async rejectFriendRequest(requestId: string, token: string): Promise<void> {
    console.log(`Rejecting friend request ${requestId}...`);
    return this.makeRequest<void>('reject_friend_request', { request_id: requestId, token });
  }



  async getChatById(chatId: string): Promise<any> {
    console.log(`Getting chat by ID ${chatId}...`);
    return this.makeRequest<any>('get_chat_by_id', { chat_id: chatId });
  }

  async addChatMember(chatId: string, userId: string, isAdmin: boolean, token: string): Promise<void> {
    console.log(`Adding chat member ${userId} to chat ${chatId}...`);
    return this.makeRequest<void>('add_chat_member', { chat_id: chatId, user_id: userId, is_admin: isAdmin, token });
  }

  async removeChatMember(chatId: string, userId: string, token: string): Promise<void> {
    console.log(`Removing chat member ${userId} from chat ${chatId}...`);
    return this.makeRequest<void>('remove_chat_member', { chat_id: chatId, user_id: userId, token });
  }

  async insertOrUpdateParticipant(participant: any): Promise<void> {
    console.log(`Inserting/updating participant ${participant.participant_id}...`);
    return this.makeRequest<void>('db_insert_participant', { participant });
  }

  async insertOrUpdateFriend(friend: any): Promise<void> {
    console.log(`Inserting/updating friend ${friend.user_id}...`);
    return this.makeRequest<void>('db_insert_friend', { friend });
  }

  async insertOrUpdateChat(chat: any): Promise<void> {
    console.log(`Inserting/updating chat ${chat.chat_id}...`);
    return this.makeRequest<void>('db_insert_chat', { chat });
  }

  async clearAllFriends(): Promise<void> {
    console.log(`Clearing all friends...`);
    return this.makeRequest<void>('db_clear_friend_data');
  }

  async resetDatabase(): Promise<void> {
    console.log('Resetting database with new schema...');
    return this.makeRequest<void>('db_reset_database');
  }

  async fixDatabaseSchema(): Promise<void> {
    console.log('Fixing database schema issues...');
    try {
      await this.resetDatabase();
      console.log('Database schema fixed successfully');
    } catch (error) {
      console.error('Failed to fix database schema:', error);
      throw error;
    }
  }

  async getUserById(userId: string, token: string): Promise<any> {
    console.log(`Getting user by ID ${userId}...`);
    return this.makeRequest<any>('get_user_by_id', { user_id: userId, token });
  }

  async updateFriendFavoriteStatus(friendId: string, isFavorite: boolean): Promise<void> {
    console.log(`Updating favorite status for friend ${friendId}...`);
    return this.makeRequest<void>('update_friend_favorite_status', { friend_id: friendId, is_favorite: isFavorite });
  }

  async getFriendRequests(): Promise<FriendRequest[]> {
    console.log('Getting friend requests via native API...');
    return this.makeRequest<FriendRequest[]>('get_friend_requests_with_token');
  }

  async getChatMembers(chatId: string): Promise<ChatMemberResponse> {
    console.log(`Getting chat members for chat ${chatId} via native API...`);
    return this.makeRequest<ChatMemberResponse>('get_chat_members_with_token', { chat_id: chatId });
  }

  // Messages API
  async getMessages(chatId: string): Promise<ChatMessage[]> {
    console.log(`Getting messages for chat ${chatId} via native API...`);
    return this.makeRequest<ChatMessage[]>('get_messages', { chat_id: chatId });
  }

  async sendMessage(
    content: string,
    chatId: string,
    replyToMessageId?: string
  ): Promise<SendMessageResponse> {
    console.log(`Sending message to chat ${chatId} via native API...`);
    return this.makeRequest<SendMessageResponse>('send_message', {
      content,
      chat_id: chatId,
      reply_to_message_id: replyToMessageId
    });
  }

  // User search API
  async searchUsers(query: string): Promise<UserData[]> {
    console.log(`Searching users with query: ${query} via native API...`);
    return this.makeRequest<UserData[]>('search_users', { query });
  }

  // Window management
  async resizeWindow(width: number, height: number): Promise<void> {
    try {
      await invoke('resize_window', { width, height });
    } catch (error) {
      console.error('Failed to resize window:', error);
      throw error;
    }
  }
}

export const nativeApiService = new NativeApiService(); 