import { environment_config, get_api_base_url } from '../config/environment';

// API Models
export interface User {
  user_id?: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  picture?: string;
  role?: string;
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
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
  participants?: string[];
}

export interface Message {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  timestamp: number;
  is_read: boolean;
  is_sent: boolean;
  is_delivered: boolean;
  sender_username?: string;
  reply_to_message_id?: string;
  client_message_id?: string;
}

export interface FriendRequest {
  request_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
}

export interface ChatRequest {
  request_id: string;
  from_user_id: string;
  to_user_id: string;
  chat_id: string;
  status: string;
  created_at: string;
}

export interface PublicKeysPayload {
  public_key: string;
  created_at: string;
}

export class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    // Use provided baseUrl or get from environment config
    this.baseUrl = baseUrl || get_api_base_url();
  }

  setToken(token: string): void {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[ApiService] Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User operations
  async registerUser(userData: User): Promise<{ access_token: string }> {
    return this.makeRequest<{ access_token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginUser(credentials: { username: string; password: string }): Promise<{ access_token: string }> {
    return this.makeRequest<{ access_token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.makeRequest<User>('/users/me');
  }

  async updateUser(user_id: string, updates: Partial<User>): Promise<User> {
    return this.makeRequest<User>(`/users/${user_id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async get_user_by_id(user_id: string): Promise<User> {
    return this.makeRequest<User>(`/users/${user_id}`);
  }

  async deleteUser(user_id: string): Promise<void> {
    return this.makeRequest<void>(`/users/${user_id}`, {
      method: 'DELETE',
    });
  }

  // Chat operations
  async getAllChats(): Promise<{ data: Chat[]; limit: number; offset: number }> {
    return this.makeRequest<{ data: Chat[]; limit: number; offset: number }>('/chats');
  }

  async getChatById(chat_id: string): Promise<Chat> {
    return this.makeRequest<Chat>(`/chats/${chat_id}`);
  }

  async createChat(chatData: { name: string; is_group: boolean; members: Array<{ user_id: string; is_admin: boolean }> }): Promise<Chat> {
    const response = await this.makeRequest<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify({
        name: chatData.name,
        is_group: chatData.is_group,
        members: chatData.members,
      }),
    });
    return response;
  }

  async updateChat(chat_id: string, updates: Partial<Chat>): Promise<Chat> {
    return this.makeRequest<Chat>(`/chats/${chat_id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChat(chat_id: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chat_id}`, {
      method: 'DELETE',
    });
  }

  async getChatMembers(chat_id: string): Promise<{ members: User[] }> {
    return this.makeRequest<{ members: User[] }>(`/chats/${chat_id}/members`);
  }

  async getChatMembersFromServer(chat_id: string): Promise<{ data: any[]; limit: number; offset: number }> {
    return this.makeRequest<{ data: any[]; limit: number; offset: number }>(`/chats/${chat_id}/members`);
  }

  async removeChatMember(chat_id: string, user_id: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chat_id}/members/${user_id}`, {
      method: 'DELETE'
    });
  }

  async addChatMembers(chat_id: string, members: Array<{ user_id: string; is_admin: boolean }>): Promise<void> {
    return this.makeRequest<void>(`/chats/${chat_id}/members`, {
      method: 'POST',
      body: JSON.stringify({ members })
    });
  }

  async leaveChat(chat_id: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chat_id}/leave`, {
      method: 'DELETE',
    });
  }

  async addParticipantToChat(chat_id: string, user_id: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chat_id}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
  }

  async removeParticipantFromChat(chat_id: string, user_id: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chat_id}/members/${user_id}`, {
      method: 'DELETE',
    });
  }

  // Chat requests
  async sendChatRequest(to_user_id: string, chat_id: string): Promise<void> {
    return this.makeRequest<void>('/chat-requests', {
      method: 'POST',
      body: JSON.stringify({
        to_user_id,
        chat_id,
      }),
    });
  }

  async getChatRequests(): Promise<ChatRequest[]> {
    return this.makeRequest<ChatRequest[]>('/chat-requests');
  }

  async acceptChatRequest(request_id: string): Promise<void> {
    return this.makeRequest<void>(`/chat-requests/${request_id}/accept`, {
      method: 'POST',
    });
  }

  async declineChatRequest(request_id: string): Promise<void> {
    return this.makeRequest<void>(`/chat-requests/${request_id}/decline`, {
      method: 'POST',
    });
  }

  // Message operations
  async getMessages(chat_id: string, limit?: number, before?: string): Promise<Message[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);

    return this.makeRequest<Message[]>(`/messages/${chat_id}?${params.toString()}`);
  }

  async sendMessage(chat_id: string, content: string, reply_to_message_id?: string): Promise<Message> {
    return this.makeRequest<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({
        chat_id,
        content,
        reply_to_message_id,
      }),
    });
  }

  async updateMessage(message_id: string, updates: Partial<Message>): Promise<Message> {
    return this.makeRequest<Message>(`/messages/${message_id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMessage(message_id: string): Promise<void> {
    return this.makeRequest<void>(`/messages/${message_id}`, {
      method: 'DELETE',
    });
  }

  // Friend operations
  async send_friend_request(to_user_id: string): Promise<void> {
    return this.makeRequest<void>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ to_user_id })
    });
  }

  async get_friend_requests(): Promise<FriendRequest[]> {
    return this.makeRequest<FriendRequest[]>('/friends/requests');
  }

  async accept_friend_request(request_id: string): Promise<void> {
    return this.makeRequest<void>('/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ request_id })
    });
  }

  async declineFriendRequest(request_id: string): Promise<void> {
    return this.makeRequest<void>(`/friend-requests/${request_id}/decline`, {
      method: 'POST',
    });
  }

  // Encryption operations
  async getOtherUserPublicKeys(user_id: string): Promise<PublicKeysPayload> {
    return this.makeRequest<PublicKeysPayload>(`/users/${user_id}/public-keys`);
  }

  async exchangeKeys(): Promise<void> {
    return this.makeRequest<void>('/keys/exchange', {
      method: 'POST',
    });
  }

  // Utility methods
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest<{ status: string; timestamp: string }>('/health');
  }

  async getServerInfo(): Promise<{ version: string; features: string[] }> {
    return this.makeRequest<{ version: string; features: string[] }>('/info');
  }
}

export const apiService = new ApiService(); 
