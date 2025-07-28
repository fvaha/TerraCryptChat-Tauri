// API service for communicating with the backend

// Base API configuration
const API_BASE_URL = "https://dev.v1.terracrypt.cc/api/v1";

// Types matching Kotlin models
export interface User {
  user_id?: string;
  email: string;
  name: string;
  username: string;
  role: string;
  picture?: string;
  verified: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface SignInCredentials {
  username: string;
  password: string;
}

export interface SignUpParams {
  email: string;
  password: string;
  username: string;
  name?: string;
}

export interface SignInResponse {
  access_token: string;
}

export interface SignUpResponse {
  access_token: string;
}

export interface Chat {
  chat_id: string;
  name: string;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  participants: User[];
}

export interface Message {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  is_read: boolean;
  is_sent: boolean;
  is_delivered: boolean;
}

export interface Friend {
  friend_id: string;
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  created_at: string;
}

export interface FriendRequest {
  request_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  from_user: User;
}

export interface ChatRequest {
  request_id: string;
  from_user_id: string;
  to_user_id: string;
  chat_id: string;
  status: string;
  created_at: string;
  from_user: User;
  chat: Chat;
}

export interface PublicKeyInfo {
  key_id: string;
  public_key: string;
  algorithm: string;
  created_at: string;
}

export interface PublicKeysPayload {
  keys: PublicKeyInfo[];
}

export interface HealthStatus {
  status: string;
  timestamp: string;
}

// API Service class
class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please check your internet connection');
      }
      throw error;
    }
  }

  // Auth endpoints
  async signIn(credentials: SignInCredentials): Promise<SignInResponse> {
    return this.makeRequest<SignInResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signUp(params: SignUpParams): Promise<SignUpResponse> {
    return this.makeRequest<SignUpResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.makeRequest<User>('/users/me');
  }

  async searchUsers(username: string): Promise<User[]> {
    return this.makeRequest<User[]>(`/users/search?username=${encodeURIComponent(username)}`);
  }

  async updateUser(user: Partial<User>): Promise<User> {
    return this.makeRequest<User>('/users', {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async getUserById(userId: string): Promise<User> {
    return this.makeRequest<User>(`/users/${userId}`);
  }

  // Chat endpoints
  async getMyChats(): Promise<{ chats: Chat[] }> {
    return this.makeRequest<{ chats: Chat[] }>('/chats');
  }

  async deleteChat(chatId: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  async getChatMembers(chatId: string): Promise<{ members: User[] }> {
    return this.makeRequest<{ members: User[] }>(`/chats/${chatId}/members`);
  }

  async createChat(name: string, isGroup: boolean, memberIds: string[]): Promise<Chat> {
    return this.makeRequest<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify({
        name,
        is_group: isGroup,
        member_ids: memberIds,
      }),
    });
  }

  async leaveChat(chatId: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chatId}/leave`, {
      method: 'DELETE',
    });
  }

  async addParticipantToChat(chatId: string, userId: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chatId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async removeParticipantFromChat(chatId: string, userId: string): Promise<void> {
    return this.makeRequest<void>(`/chats/${chatId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Chat request endpoints
  async sendChatRequest(toUserId: string, chatId: string): Promise<void> {
    return this.makeRequest<void>('/chat/request', {
      method: 'POST',
      body: JSON.stringify({
        to_user_id: toUserId,
        chat_id: chatId,
      }),
    });
  }

  async getPendingChatRequests(): Promise<ChatRequest[]> {
    return this.makeRequest<ChatRequest[]>('/chat/request/pending');
  }

  async changeChatRequestStatus(requestId: string, status: 'accept' | 'reject'): Promise<void> {
    return this.makeRequest<void>('/chat/request/status', {
      method: 'PUT',
      body: JSON.stringify({
        request_id: requestId,
        status,
      }),
    });
  }

  // Message endpoints
  async getMessages(chatId: string, limit?: number, before?: string): Promise<Message[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    
    return this.makeRequest<Message[]>(`/messages/${chatId}?${params.toString()}`);
  }

  // Friend endpoints
  async getFriendsList(): Promise<Friend[]> {
    return this.makeRequest<Friend[]>('/friends');
  }

  async getPendingFriendRequests(): Promise<FriendRequest[]> {
    return this.makeRequest<FriendRequest[]>('/friends/request/pending');
  }

  async sendFriendRequest(toUserId: string): Promise<void> {
    return this.makeRequest<void>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({
        to_user_id: toUserId,
      }),
    });
  }

  async acceptFriendRequest(requestId: string): Promise<void> {
    return this.makeRequest<void>(`/friends/request/${requestId}/accept`, {
      method: 'PUT',
    });
  }

  async declineFriendRequest(requestId: string): Promise<void> {
    return this.makeRequest<void>(`/friends/request/${requestId}/reject`, {
      method: 'PUT',
    });
  }

  async deleteFriend(friendId: string): Promise<void> {
    return this.makeRequest<void>(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  // Key management endpoints
  async getUserPublicKeys(): Promise<PublicKeyInfo[]> {
    return this.makeRequest<PublicKeyInfo[]>('/user/public-key');
  }

  async getUserKeys(): Promise<PublicKeysPayload> {
    return this.makeRequest<PublicKeysPayload>('/users/keys');
  }

  async addUserKeys(payload: PublicKeysPayload): Promise<void> {
    return this.makeRequest<void>('/users/keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUserKeys(payload: PublicKeysPayload): Promise<void> {
    return this.makeRequest<void>('/users/keys', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getOtherUserPublicKeys(userId: string): Promise<PublicKeysPayload> {
    return this.makeRequest<PublicKeysPayload>(`/users/${userId}/public-keys`);
  }

  // Health check
  async checkDbHealth(): Promise<HealthStatus> {
    return this.makeRequest<HealthStatus>('/db-health');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Types are already exported above with their definitions 