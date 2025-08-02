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
  name: string;
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
    try {
      const result = await invoke('get_cached_chats_only');
      return result as Chat[];
    } catch (error) {
      console.error('Get cached chats failed:', error);
      throw error;
    }
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
    try {
      const result = await invoke('get_cached_friends_only');
      return result as Friend[];
    } catch (error) {
      console.error('Get cached friends failed:', error);
      throw error;
    }
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
    try {
      const result = await invoke<Chat[]>('fetch_all_chats_and_save', { token });
      return result;
    } catch (error) {
      console.error('Fetch all chats and save failed:', error);
      throw error;
    }
  }

  async fetchAllFriendsAndSave(token: string): Promise<Friend[]> {
    console.log('Fetching all friends from API and saving to database...');
    try {
      const result = await invoke<Friend[]>('fetch_all_friends_and_save', { token });
      return result;
    } catch (error) {
      console.error('Fetch all friends and save failed:', error);
      throw error;
    }
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

  async clearMessagesForChat(chatId: string): Promise<void> {
    console.log(`Clearing messages for chat ${chatId}...`);
    return this.makeRequest<void>('db_async_clear_messages_for_chat', { chat_id: chatId });
  }

  async removeAllParticipantsForChat(chatId: string): Promise<void> {
    console.log(`Removing all participants for chat ${chatId}...`);
    return this.makeRequest<void>('db_async_remove_all_participants_for_chat', { chat_id: chatId });
  }

  async deleteFriendFromDatabase(userId: string): Promise<void> {
    console.log(`Deleting friend ${userId} from database...`);
    return this.makeRequest<void>('delete_friend_from_database', { user_id: userId });
  }

  // Additional methods needed by ChatService
  async deleteChat(chatId: string, token: string): Promise<void> {
    console.log(`Deleting chat ${chatId} from server...`);
    try {
      const result = await invoke('delete_chat', { chat_id: chatId, token });
      return result as void;
    } catch (error) {
      console.error('Delete chat failed:', error);
      throw error;
    }
  }

  async leaveChat(chatId: string, token: string): Promise<void> {
    console.log(`Leaving chat ${chatId}...`);
    try {
      const result = await invoke('leave_chat', { chat_id: chatId, token });
      return result as void;
    } catch (error) {
      console.error('Leave chat failed:', error);
      throw error;
    }
  }

  async resetUnreadCount(chatId: string): Promise<void> {
    console.log(`Resetting unread count for chat ${chatId}...`);
    return this.makeRequest<void>('reset_unread_count', { chat_id: chatId });
  }

  // Additional methods needed by FriendService
  async deleteFriend(userId: string, token: string): Promise<void> {
    console.log(`Deleting friend ${userId} from server...`);
    try {
      const result = await invoke('delete_friend', { user_id: userId, token });
      return result as void;
    } catch (error) {
      console.error('Delete friend failed:', error);
      throw error;
    }
  }

  async searchFriends(query: string, token: string): Promise<Friend[]> {
    console.log(`Searching friends with query: ${query}...`);
    try {
      const result = await invoke('search_friends', { query, token });
      return result as Friend[];
    } catch (error) {
      console.error('Search friends failed:', error);
      throw error;
    }
  }

  async sendFriendRequest(userId: string, token: string): Promise<void> {
    console.log(`Sending friend request to ${userId}...`);
    try {
      const result = await invoke('send_friend_request', { receiverId: userId, token });
      return result as void;
    } catch (error) {
      console.error('Send friend request failed:', error);
      throw error;
    }
  }

  async acceptFriendRequest(requestId: string, token: string): Promise<void> {
    console.log(`Accepting friend request ${requestId}...`);
    try {
      const result = await invoke('accept_friend_request', { userId: requestId, token });
      return result as void;
    } catch (error) {
      console.error('Accept friend request failed:', error);
      throw error;
    }
  }

  async rejectFriendRequest(requestId: string, token: string): Promise<void> {
    console.log(`Rejecting friend request ${requestId}...`);
    try {
      const result = await invoke('reject_friend_request', { userId: requestId, token });
      return result as void;
    } catch (error) {
      console.error('Reject friend request failed:', error);
      throw error;
    }
  }



  async getChatById(chatId: string): Promise<any> {
    console.log(`Getting chat by ID ${chatId}...`);
    return this.makeRequest<any>('get_chat_by_id', { chat_id: chatId });
  }

  async createChat(name: string, isGroup: boolean, members: Array<{ user_id: string; is_admin: boolean }>): Promise<string> {
    console.log(`Creating chat with name: ${name}, isGroup: ${isGroup}, members: ${members.length}...`);
    return this.makeRequest<string>('create_chat', { 
      name, 
      is_group: isGroup, 
      members 
    });
  }

  async addChatMember(chatId: string, userId: string, isAdmin: boolean, token: string): Promise<void> {
    console.log(`Adding chat member ${userId} to chat ${chatId}...`);
    try {
      const result = await invoke('add_chat_member', { chat_id: chatId, user_id: userId, is_admin: isAdmin, token });
      return result as void;
    } catch (error) {
      console.error('Add chat member failed:', error);
      throw error;
    }
  }

  async removeChatMember(chatId: string, userId: string, token: string): Promise<void> {
    console.log(`Removing chat member ${userId} from chat ${chatId}...`);
    try {
      const result = await invoke('remove_chat_member', { chat_id: chatId, user_id: userId, token });
      return result as void;
    } catch (error) {
      console.error('Remove chat member failed:', error);
      throw error;
    }
  }

  async insertOrUpdateParticipant(participant: any): Promise<void> {
    console.log(`Inserting/updating participant ${participant.participant_id}...`);
    try {
      await invoke('db_insert_participant', { participant });
    } catch (error) {
      console.error('Insert participant failed:', error);
      throw error;
    }
  }

  async insertOrUpdateFriend(friend: any): Promise<void> {
    console.log(`Inserting/updating friend ${friend.user_id}...`);
    try {
      await invoke('db_insert_friend', { friend });
    } catch (error) {
      console.error('Insert friend failed:', error);
      throw error;
    }
  }

  async insertOrUpdateChat(chat: any): Promise<void> {
    console.log(`Inserting/updating chat ${chat.chat_id}...`);
    try {
      await invoke('db_insert_or_update_chat', { chat });
    } catch (error) {
      console.error('Insert chat failed:', error);
      throw error;
    }
  }

  async clearAllFriends(): Promise<void> {
    console.log(`Clearing all friends...`);
    try {
      await invoke('db_clear_friend_data');
    } catch (error) {
      console.error('Clear friends failed:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    console.log('Clearing all database data...');
    try {
      await invoke('db_clear_all_data');
    } catch (error) {
      console.error('Clear all data failed:', error);
      throw error;
    }
  }

  async fixDatabaseSchema(): Promise<void> {
    console.log('Fixing database schema issues...');
    try {
      await invoke('db_clear_all_data');
      console.log('Database cleared successfully');
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<any> {
    console.log(`Getting user by ID ${userId}...`);
    try {
      return await invoke('db_async_get_user_by_id', { userId });
    } catch (error) {
      console.error('Get user by ID failed:', error);
      throw error;
    }
  }



  async getFriendRequests(): Promise<FriendRequest[]> {
    console.log('Getting friend requests via native API...');
    try {
      const result = await invoke('get_friend_requests_with_token', { token: this.token });
      return result as FriendRequest[];
    } catch (error) {
      console.error('Get friend requests failed:', error);
      throw error;
    }
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
  async searchUsers(query: string, token?: string): Promise<UserData[]> {
    console.log(`Searching users with query: ${query} via native API...`);
    const searchToken = token || this.token;
    if (!searchToken) {
      throw new Error('No token available');
    }
    try {
      const result = await invoke('search_users', { token: searchToken, query });
      return result as UserData[];
    } catch (error) {
      console.error('Search users failed:', error);
      throw error;
    }
  }

  // Window management
  async resizeWindow(width: number, height: number): Promise<void> {
    console.log('Resizing window via native API...');
    try {
      await invoke('resize_window', { width, height });
    } catch (error) {
      console.error('Window resize failed:', error);
      throw error;
    }
  }

  async centerWindow(): Promise<void> {
    console.log('Centering window via native API...');
    try {
      await invoke('center_window');
    } catch (error) {
      console.error('Window center failed:', error);
      throw error;
    }
  }

  async minimizeWindow(): Promise<void> {
    console.log('Minimizing window via native API...');
    try {
      await invoke('minimize_window');
    } catch (error) {
      console.error('Window minimize failed:', error);
      throw error;
    }
  }

  async maximizeWindow(): Promise<void> {
    console.log('Maximizing window via native API...');
    try {
      await invoke('maximize_window');
    } catch (error) {
      console.error('Window maximize failed:', error);
      throw error;
    }
  }


}

export const nativeApiService = new NativeApiService(); 