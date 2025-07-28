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
  status: string;
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
  created_at: number;
  creator_id: string;
  is_group: boolean;
  participants: string[];
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

  private async makeRequest<T>(command: string, args: any[] = []): Promise<T> {
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

  // Friends API
  async getFriends(): Promise<Friend[]> {
    console.log('Getting friends via native API...');
    return this.makeRequest<Friend[]>('get_friends_with_token');
  }

  async getFriendRequests(): Promise<FriendRequest[]> {
    console.log('Getting friend requests via native API...');
    return this.makeRequest<FriendRequest[]>('get_friend_requests_with_token');
  }

  async getChatMembers(chatId: string): Promise<ChatMemberResponse> {
    console.log(`Getting chat members for chat ${chatId} via native API...`);
    return this.makeRequest<ChatMemberResponse>('get_chat_members_with_token', [chatId]);
  }

  // Chats API
  async getChats(): Promise<Chat[]> {
    console.log('Getting chats via native API...');
    return this.makeRequest<Chat[]>('get_chats_with_token');
  }

  // Messages API
  async getMessages(chatId: string): Promise<ChatMessage[]> {
    console.log(`Getting messages for chat ${chatId} via native API...`);
    return this.makeRequest<ChatMessage[]>('get_messages', [chatId]);
  }

  async sendMessage(
    content: string,
    chatId: string,
    replyToMessageId?: string
  ): Promise<SendMessageResponse> {
    console.log(`Sending message to chat ${chatId} via native API...`);
    return this.makeRequest<SendMessageResponse>('send_message', [
      content,
      chatId,
      replyToMessageId
    ]);
  }

  // User search API
  async searchUsers(query: string): Promise<UserData[]> {
    console.log(`Searching users with query: ${query} via native API...`);
    return this.makeRequest<UserData[]>('search_users', [query]);
  }
}

export const nativeApiService = new NativeApiService(); 