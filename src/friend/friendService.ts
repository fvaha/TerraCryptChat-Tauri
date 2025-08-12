import { invoke } from '@tauri-apps/api/core';
import { databaseServiceAsync } from '../services/databaseServiceAsync';
import { sessionManager } from '../utils/sessionManager';
import { apiService } from '../api/apiService';
import { websocketService } from '../websocket/websocketService';

interface RequestNotificationMessage {
  type: string;
  message: {
    status: string;
    [key: string]: unknown;
  };
}

interface UserDetails {
  user_id: string;
  username: string;
  name?: string;
  email?: string;
  picture?: string;
  status?: string;
}

export interface FriendRequest {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

export interface FriendUser {
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  status?: string;
  is_favorite?: boolean;
}

export class FriendService {
  private pendingRequestCount: number = 0;
  private requestNotificationHandlers: Set<() => void> = new Set();
  private eventListener: ((event: Event) => void) | null = null;

  constructor() {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners() {
    // REMOVED: WebSocket message handler - MessageService is now single source of truth
    
    // Listen to custom events from MessageService instead
    this.eventListener = ((event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[FriendService] Received friend request notification from MessageService:", customEvent.detail);
      this.handleRequestNotification(customEvent.detail);
    }) as EventListener;
    
    window.addEventListener('friend-request-notification-received', this.eventListener);
  }

  // Cleanup method to remove event listeners
  cleanup() {
    if (this.eventListener) {
      window.removeEventListener('friend-request-notification-received', this.eventListener);
      this.eventListener = null;
    }
  }

  private async handleRequestNotification(messageData: any) {
    try {
      console.log("[FriendService] Processing friend request notification:", messageData);
      
      // Extract the message payload from the wrapper
      const payload = messageData.message || messageData;
      const { status } = payload;
      
      if (!status) {
        console.warn("[FriendService] Invalid friend request notification format:", messageData);
        return;
      }
      
      switch (status) {
        case 'pending':
          await this.updatePendingRequestCount();
          this.notifyRequestHandlers();
          break;
        case 'accepted':
          await this.perform_delta_friend_sync_and_refresh();
          break;
        case 'declined':
          // Handle declined request if needed
          break;
        default:
          console.warn("[FriendService] Unknown friend request status:", status);
      }
    } catch (error) {
      console.error("[FriendService] Error handling friend request notification:", error);
    }
  }

  private async updatePendingRequestCount() {
    try {
      const requests = await this.get_friend_requests();
      this.pendingRequestCount = requests.length;
    } catch (error) {
      console.error('[FriendService] Failed to update pending request count:', error);
    }
  }

  private async perform_delta_friend_sync_and_refresh() {
    try {
      await this.perform_delta_friend_sync();
      const requests = await this.get_friend_requests();
      this.pendingRequestCount = requests.length;
      this.notifyRequestHandlers();
    } catch (error) {
      console.error('[FriendService] Failed to perform delta friend sync and refresh:', error);
    }
  }

  private async perform_delta_friend_sync(): Promise<void> {
    try {
      console.log('[FriendService] Performing delta friend sync...');
      const token = await sessionManager.getToken();
      if (token) {
        // Use the existing sync method
        await this.syncFriendsFromServer();
        console.log('[FriendService] Delta friend sync completed successfully');
      } else {
        console.warn('[FriendService] No token available for delta friend sync');
      }
    } catch (error) {
      console.error('[FriendService] Failed to perform delta friend sync:', error);
    }
  }

  private notifyRequestHandlers() {
    this.requestNotificationHandlers.forEach(handler => handler());
  }

  on_request_change(handler: () => void): void {
    this.requestNotificationHandlers.add(handler);
  }

  off_request_change(handler: () => void): void {
    this.requestNotificationHandlers.delete(handler);
  }

  get_pending_request_count(): number {
    return this.pendingRequestCount;
  }

  async get_all_friends(): Promise<FriendUser[]> {
    try {
      const allFriends = await invoke<FriendUser[]>('db_get_all_friends');
      
      if (!allFriends) {
        return [];
      }

      // Filter out the current user from the friends list
      const currentUserId = sessionManager.getCurrentUser()?.user_id;
      if (!currentUserId) {
        return allFriends;
      }

      return allFriends.filter(friend => friend.user_id !== currentUserId);
    } catch (error) {
      console.error('[FriendService] Failed to get all friends:', error);
      return [];
    }
  }

  async getFriendById(friendId: string): Promise<FriendUser | null> {
    try {
      const friend = await databaseServiceAsync.getFriendById(friendId);
      return friend;
    } catch (error) {
      console.error('[FriendService] Failed to get friend by ID:', error);
      return null;
    }
  }

  async addFriend(friend: FriendUser): Promise<void> {
    try {
      await databaseServiceAsync.insert_friend(friend);
    } catch (error) {
      console.error('[FriendService] Failed to add friend:', error);
      throw error;
    }
  }

  async updateFriendStatus(friendId: string, status: string): Promise<void> {
    try {
      await databaseServiceAsync.updateFriendStatus(friendId, status);
    } catch (error) {
      console.error('[FriendService] Failed to update friend status:', error);
      throw error;
    }
  }

  async deleteFriend(friendId: string): Promise<boolean> {
    try {
      await databaseServiceAsync.deleteFriend(friendId);
      return true;
    } catch (error) {
      console.error('[FriendService] Failed to delete friend:', error);
      return false;
    }
  }

  async clearAllFriends(): Promise<void> {
    try {
      await databaseServiceAsync.clearFriendData();
    } catch (error) {
      console.error('[FriendService] Failed to clear all friends:', error);
      throw error;
    }
  }

  async syncFriendsFromServer(): Promise<void> {
    try {
      const token = await sessionManager.getToken();
      if (!token) {
        console.warn('[FriendService] No token available for friend sync');
        return;
      }

      await invoke('fetch_all_friends_and_save', { token });
    } catch (error) {
      console.error('[FriendService] Failed to sync friends from server:', error);
    }
  }

  async search_users(query: string): Promise<FriendUser[]> {
    try {
      const token = await sessionManager.getToken();
      if (!token) {
        console.warn('[FriendService] No token available for user search');
        return [];
      }

      const response = await invoke('search_users', { query, token });
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[FriendService] Failed to search users:', error);
      return [];
    }
  }

  async send_friend_request(user_id: string): Promise<void> {
    try {
      const current_user_id = sessionManager.getCurrentUser()?.user_id;
      if (!current_user_id) {
        throw new Error("No current user ID available");
      }

      if (current_user_id === user_id) {
        throw new Error("Cannot send friend request to yourself");
      }

      // Check if already friends or request exists
      const existing_friends = await this.get_all_friends();
      const existing_friend = existing_friends.find(user => user.user_id === user_id);
      if (existing_friend) {
        throw new Error("Already friends with this user");
      }

      const existing_requests = await this.get_friend_requests();
      const existing_request = existing_requests.find(request => request.sender_id === user_id);
      if (existing_request) {
        throw new Error("Friend request already exists");
      }

      await apiService.send_friend_request(user_id);
      console.log(`[FriendService] Friend request sent to ${user_id}`);
    } catch (error) {
      console.error(`[FriendService] Failed to send friend request to ${user_id}:`, error);
      throw error;
    }
  }

  async accept_friend_request(request_id: string, sender_id?: string): Promise<boolean> {
    try {
      if (sender_id) {
        await this.add_friend_to_database(sender_id);
        console.log(`[FriendService] Friend request accepted for ${sender_id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[FriendService] Failed to accept friend request:`, error);
      return false;
    }
  }

  private async add_friend_to_database(sender_id: string): Promise<void> {
    try {
      const user_details = await this.get_user_details(sender_id);
      if (!user_details) {
        throw new Error("User details not found");
      }

      const friend_data = {
        user_id: sessionManager.getCurrentUser()?.user_id || '',
        username: user_details.username,
        name: user_details.name,
        email: user_details.email,
        picture: user_details.picture,
        status: 'accepted',
        is_favorite: false
      };

      await databaseServiceAsync.insert_friend(friend_data);
      console.log(`[FriendService] Friend added to database: ${sender_id}`);
    } catch (error) {
      console.error(`[FriendService] Failed to add friend to database:`, error);
      throw error;
    }
  }

  async reject_friend_request(requestId: string): Promise<boolean> {
    try {
      const token = await sessionManager.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      await invoke('reject_friend_request', { request_id: requestId, token });
      return true;
    } catch (error) {
      console.error('[FriendService] Failed to reject friend request:', error);
      return false;
    }
  }

  async get_user_details(user_id: string): Promise<UserDetails | null> {
    try {
      const user_details = await databaseServiceAsync.get_user_by_id(user_id);
      if (!user_details) {
        console.error(`[FriendService] User details not found for ${user_id}`);
        return null;
      }
      return user_details;
    } catch (error) {
      console.error(`[FriendService] Failed to get user details for ${user_id}:`, error);
      return null;
    }
  }

  async get_pending_requests(): Promise<FriendUser[]> {
    try {
      const allFriends = await this.get_all_friends();
      return allFriends.filter(friend => friend.status === 'pending');
    } catch (error) {
      console.error('[FriendService] Failed to get pending requests:', error);
      return [];
    }
  }

  async get_friend_requests(): Promise<FriendRequest[]> {
    try {
      // This would typically fetch from the database or API
      // For now, return an empty array
      return [];
    } catch (error) {
      console.error('[FriendService] Failed to get friend requests:', error);
      return [];
    }
  }

  async get_friend_requests_count(): Promise<number> {
    try {
      const requests = await this.get_friend_requests();
      return requests.length;
    } catch (error) {
      console.error('[FriendService] Failed to get friend requests count:', error);
      return 0;
    }
  }

  async get_cached_friends_for_current_user(): Promise<FriendUser[]> {
    try {
      const currentUserId = sessionManager.getCurrentUser()?.user_id;
      if (!currentUserId) {
        return [];
      }

      const allFriends = await this.get_all_friends();
      return allFriends.filter(friend => friend.user_id !== currentUserId);
    } catch (error) {
      console.error('[FriendService] Failed to get cached friends for current user:', error);
      return [];
    }
  }
}

export const friendService = new FriendService();
