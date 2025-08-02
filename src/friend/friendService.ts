import { invoke } from '@tauri-apps/api/core';
import { databaseServiceAsync } from '../services/databaseServiceAsync';
import { Friend } from '../services/databaseServiceAsync';
import { sessionManager } from '../utils/sessionManager';
import { nativeApiService } from '../api/nativeApiService';
import { websocketService } from '../websocket/websocketService';

export class FriendService {
  private pendingRequestCount: number = 0;
  private requestNotificationHandlers: Set<() => void> = new Set();

  constructor() {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners() {
    // Listen for friend request notifications
    websocketService.onMessage((message: any) => {
      if (message.type === 'request-notification') {
        this.handleRequestNotification(message);
      }
    });
  }

  private async handleRequestNotification(message: any) {
    console.log('[FriendService] Received friend request notification:', message);
    
    const { status } = message.message;
    
    switch (status) {
      case 'pending':
        await this.updatePendingRequestCount();
        this.notifyRequestHandlers();
        break;
      case 'accepted':
        await this.performDeltaFriendSyncAndRefresh();
        break;
      case 'declined':
        // Handle declined request if needed
        break;
    }
  }

  private async updatePendingRequestCount() {
    try {
      const requests = await this.getFriendRequests();
      this.pendingRequestCount = requests.length;
      console.log(`[FriendService] Updated pending request count: ${this.pendingRequestCount}`);
    } catch (error) {
      console.error('[FriendService] Failed to update pending request count:', error);
    }
  }

  private async performDeltaFriendSyncAndRefresh() {
    try {
      await this.syncFriendsFromServer();
      this.notifyRequestHandlers();
    } catch (error) {
      console.error('[FriendService] Failed to perform delta friend sync:', error);
    }
  }

  private notifyRequestHandlers() {
    this.requestNotificationHandlers.forEach(handler => handler());
  }

  // Public methods for components to listen to request changes
  onRequestChange(handler: () => void): void {
    this.requestNotificationHandlers.add(handler);
  }

  offRequestChange(handler: () => void): void {
    this.requestNotificationHandlers.delete(handler);
  }

  getPendingRequestCount(): number {
    return this.pendingRequestCount;
  }
  async getAllFriends(): Promise<Friend[]> {
    try {
      const localFriends = await databaseServiceAsync.getAllFriends();
      
      if (!Array.isArray(localFriends)) {
        console.warn("Invalid friends data received:", localFriends);
        return [];
      }
      
      return localFriends.map(friend => ({
        id: friend.id,
        user_id: friend.user_id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        picture: friend.picture,
        status: friend.status || 'pending',
        is_favorite: friend.is_favorite || false,
        created_at: friend.created_at || Date.now(),
        updated_at: friend.updated_at || Date.now()
      }));
    } catch (error) {
      console.error("Failed to get all friends:", error);
      return [];
    }
  }

  async getFriendById(friendId: string): Promise<Friend | null> {
    try {
      const friend = await databaseServiceAsync.getFriendById(friendId);
      if (!friend) return null;

      return {
        id: friend.id,
        user_id: friend.user_id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        picture: friend.picture,
        status: friend.status || 'pending',
        is_favorite: friend.is_favorite || false,
        created_at: friend.created_at || Date.now(),
        updated_at: friend.updated_at || Date.now()
      };
    } catch (error) {
      console.error(`Failed to get friend by ID ${friendId}:`, error);
      return null;
    }
  }

  async addFriend(friend: Friend): Promise<void> {
    try {
      const dbFriend = {
        id: friend.id,
        user_id: friend.user_id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        picture: friend.picture,
        status: friend.status,
        is_favorite: friend.is_favorite,
        created_at: friend.created_at,
        updated_at: friend.updated_at
      };
      
      await databaseServiceAsync.insertFriend(dbFriend);
      console.log(`[FriendService] Friend added successfully: ${friend.username}`);
    } catch (error) {
      console.error(`[FriendService] Failed to add friend:`, error);
      throw error;
    }
  }

  async updateFriendStatus(friendId: string, status: string): Promise<void> {
    try {
      await databaseServiceAsync.updateFriendStatus(friendId, status);
      console.log(`[FriendService] Friend status updated: ${friendId} -> ${status}`);
    } catch (error) {
      console.error(`[FriendService] Failed to update friend status:`, error);
      throw error;
    }
  }

  async deleteFriend(friendId: string): Promise<boolean> {
    try {
      console.log(`[FriendService] Deleting friend: ${friendId}`);
      
      const token = sessionManager.getToken();
      
      if (!token) {
        console.error("No token available for deleting friend");
        return false;
      }
      
      // Call the API to delete the friend
      const response = await fetch(`https://dev.v1.terracrypt.cc/api/v1/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[FriendService] Failed to delete friend: ${response.status}`);
        return false;
      }

      // Remove from local database
      await databaseServiceAsync.deleteFriend(friendId);
      console.log(`[FriendService] Friend deleted successfully: ${friendId}`);
      return true;
    } catch (error) {
      console.error(`[FriendService] Failed to delete friend:`, error);
      return false;
    }
  }

  async clearAllFriends(): Promise<void> {
    try {
      await databaseServiceAsync.clearFriendData();
      console.log(`[FriendService] All friends cleared successfully`);
    } catch (error) {
      console.error(`[FriendService] Failed to clear all friends:`, error);
      throw error;
    }
  }

  async syncFriendsFromServer(): Promise<void> {
    try {
      console.log("[FriendService] Syncing friends from server...");
      
      // Get friends from server
      const response = await invoke<{ data: any[] }>("get_friends", {});
      
      if (!response || !response.data) {
        console.warn("[FriendService] No friends data received from server");
        return;
      }
      
      console.log(`[FriendService] Received ${response.data.length} friends from server`);
      
      // Clear existing friends
      await this.clearAllFriends();
      
      // Add new friends
      for (const serverFriend of response.data) {
        const friend: Friend = {
          id: serverFriend.id || generateUUID(),
          user_id: serverFriend.user_id,
          username: serverFriend.username,
          name: serverFriend.name,
          email: serverFriend.email,
          picture: serverFriend.picture,
          status: serverFriend.status,
          created_at: new Date(serverFriend.created_at).getTime(),
          updated_at: new Date(serverFriend.updated_at).getTime(),
          is_favorite: false
        };
        
        await this.addFriend(friend);
      }
      
      console.log("[FriendService] Friend sync completed successfully");
    } catch (error) {
      console.error("[FriendService] Failed to sync friends from server:", error);
    }
  }

  async searchUsers(query: string): Promise<any[]> {
    try {
      console.log(`[FriendService] Searching users with query: '${query}'`);
      
      // Get token from session manager
      const token = sessionManager.getToken();
      
      if (!token) {
        throw new Error("No token available for search");
      }
      
      // Use nativeApiService instead of direct invoke
      const response = await nativeApiService.searchUsers(query, token);
      console.log(`[FriendService] Raw response received:`, response);
      
      if (Array.isArray(response)) {
        console.log(`[FriendService] Found ${response.length} users matching query`);
        
        // Get current user's friends and friend requests to filter them out
        const [friends, friendRequests] = await Promise.all([
          this.getCachedFriendsForCurrentUser().catch(() => []),
          this.getFriendRequests().catch(() => [])
        ]);
        
        console.log(`[FriendService] Found ${friends.length} current friends`);
        console.log(`[FriendService] Found ${friendRequests.length} pending friend requests`);
        
        // Create sets of user IDs to filter out
        const friendIds = new Set(friends.map(friend => friend.user_id));
        const requestIds = new Set(friendRequests.map(request => request.user_id));
        const currentUserId = sessionManager.getCurrentUser()?.user_id;
        
        // Filter out current user, existing friends, and users with pending requests
        const filteredUsers = response.filter(user => {
          const isCurrentUser = user.user_id === currentUserId;
          const isAlreadyFriend = friendIds.has(user.user_id);
          const hasPendingRequest = requestIds.has(user.user_id);
          
          return !isCurrentUser && !isAlreadyFriend && !hasPendingRequest;
        });
        
        console.log(`[FriendService] Filtered to ${filteredUsers.length} available users`);
        return filteredUsers;
      }
      
      return [];
    } catch (error) {
      console.error(`[FriendService] Search failed:`, error);
      throw error;
    }
  }

  async sendFriendRequest(userId: string): Promise<void> {
    try {
      console.log(`[FriendService] Starting friend request process for user ID: ${userId}`);
      
      // Get token from session manager
      const token = sessionManager.getToken();
      
      if (!token) {
        throw new Error("No token available for sending friend request");
      }
      
      // Check if we already have a pending request or are already friends
      const [friends, friendRequests] = await Promise.all([
        this.getCachedFriendsForCurrentUser().catch(() => []),
        this.getFriendRequests().catch(() => [])
      ]);
      
      const friendIds = new Set(friends.map(friend => friend.user_id));
      const requestIds = new Set(friendRequests.map(request => request.user_id));
      
      if (friendIds.has(userId)) {
        throw new Error("User is already your friend");
      }
      
      if (requestIds.has(userId)) {
        throw new Error("Friend request already sent");
      }
      
      // Use nativeApiService instead of direct invoke
      await nativeApiService.sendFriendRequest(userId, token);
      console.log(`[FriendService] Friend request sent successfully!`);
    } catch (error) {
      console.error(`[FriendService] Failed to send friend request:`, error);
      throw error;
    }
  }

  async acceptFriendRequest(requestId: string, senderId?: string): Promise<boolean> {
    try {
      console.log(`[FriendService] Accepting friend request: ${requestId}`);
      
      const token = sessionManager.getToken();
      
      if (!token) {
        console.error("No token available for accepting friend request");
        return false;
      }
      
      // Call the API to accept the friend request
      const response = await fetch(`https://dev.v1.terracrypt.cc/api/v1/friends/request/${requestId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[FriendService] Failed to accept friend request: ${response.status}`);
        return false;
      }

              // If senderId is provided, add the friend to the database
        if (senderId) {
          await this.addFriendToDatabase(senderId);
        }

      console.log("[FriendService] Friend request accepted successfully");
      return true;
    } catch (error) {
      console.error("[FriendService] Failed to accept friend request:", error);
      return false;
    }
  }

  private async addFriendToDatabase(senderId: string): Promise<void> {
    try {
      // Get user details from the server
      const userDetails = await this.getUserDetails(senderId);
      if (!userDetails) {
        console.error('[FriendService] Could not get user details for friend');
        return;
      }

      const newFriend: Friend = {
        id: userDetails.id || generateUUID(),
        user_id: userDetails.user_id || senderId,
        username: userDetails.username || 'Unknown',
        name: userDetails.name || 'Unknown',
        email: userDetails.email || '',
        picture: userDetails.picture || '',
        status: 'accepted',
        is_favorite: false,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      await this.addFriend(newFriend);
      console.log(`[FriendService] Friend added to database: ${newFriend.username}`);
    } catch (error) {
      console.error('[FriendService] Failed to add friend to database:', error);
    }
  }

  async rejectFriendRequest(requestId: string): Promise<boolean> {
    try {
      console.log(`[FriendService] Rejecting friend request: ${requestId}`);
      
      const token = sessionManager.getToken();
      
      if (!token) {
        console.error("No token available for rejecting friend request");
        return false;
      }
      
      // Call the API to decline the friend request
      const response = await fetch(`https://dev.v1.terracrypt.cc/api/v1/friends/request/${requestId}/decline`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[FriendService] Failed to reject friend request: ${response.status}`);
        return false;
      }

      console.log("[FriendService] Friend request rejected successfully");
      return true;
    } catch (error) {
      console.error("[FriendService] Failed to reject friend request:", error);
      return false;
    }
  }

  async getUserDetails(userId: string): Promise<any> {
    try {
      const userDetails = await databaseServiceAsync.getUserById(userId);
      return userDetails;
    } catch (error) {
      console.error(`[FriendService] Failed to get user details for ${userId}:`, error);
      return null;
    }
  }

  async getPendingRequests(): Promise<Friend[]> {
    try {
      const allFriends = await databaseServiceAsync.getAllFriends();
      return allFriends
        .filter(friend => friend.status === 'pending')
        .map(friend => ({
          id: friend.id,
          user_id: friend.user_id,
          username: friend.username,
          name: friend.name,
          email: friend.email,
          picture: friend.picture,
          status: friend.status,
          created_at: friend.created_at,
          updated_at: friend.updated_at,
          is_favorite: friend.is_favorite || false
        }));
    } catch (error) {
      console.error("[FriendService] Failed to get pending requests:", error);
      return [];
    }
  }

  async getFriendRequests(): Promise<any[]> {
    try {
      console.log("[FriendService] Getting friend requests from local database...");
      
      // Use local pending requests instead of API call since the endpoint doesn't exist yet
      const pendingRequests = await this.getPendingRequests();
      
      // Convert to the expected format for friend requests
      const friendRequests = pendingRequests.map(friend => ({
        request_id: friend.id,
        receiver_id: friend.user_id,
        status: friend.status,
        created_at: friend.created_at?.toString(),
        sender: {
          user_id: friend.user_id,
          username: friend.username,
          name: friend.name,
          email: friend.email,
          picture: friend.picture,
          is_favorite: friend.is_favorite
        }
      }));
      
      console.log(`[FriendService] Found ${friendRequests.length} friend requests from local database`);
      return friendRequests;
    } catch (error) {
      console.error("[FriendService] Failed to get friend requests:", error);
      return [];
    }
  }

  async getFriendRequestsCount(): Promise<number> {
    try {
      const requests = await this.getFriendRequests();
      return requests.length;
    } catch (error) {
      console.error("[FriendService] Failed to get friend requests count:", error);
      return 0;
    }
  }

  async getCachedFriendsForCurrentUser(): Promise<Friend[]> {
    try {
      console.log("[FriendService] Getting cached friends for current user...");
      
      // First get cached friends from database
      let friends = await databaseServiceAsync.getAllFriends();
      console.log(`[FriendService] Found ${friends.length} cached friends`);
      
      // Then try to fetch fresh data from API and save to database
      try {
        const token = sessionManager.getToken();
        
        if (token) {
          try {
            const freshFriends = await nativeApiService.fetchAllFriendsAndSave(token);
            console.log("[FriendService] Fresh friends loaded and saved:", freshFriends);
            friends = freshFriends.map(friend => ({
              id: friend.user_id,
              user_id: friend.user_id,
              username: friend.username,
              name: friend.name,
              email: friend.email,
              picture: friend.picture,
              status: (friend.status as "pending" | "accepted" | "rejected" | "blocked") || "accepted",
              created_at: Date.now(),
              updated_at: Date.now(),
              is_favorite: friend.is_favorite || false
            }));
          } catch (error) {
            console.warn("[FriendService] Failed to fetch fresh friends, using cached data:", error);
          }
        }
      } catch (error) {
        console.warn("[FriendService] Failed to fetch fresh friends, using cached data:", error);
      }
      
      return friends.map(friend => ({
        id: friend.id,
        user_id: friend.user_id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        picture: friend.picture,
        status: friend.status || 'pending',
        is_favorite: friend.is_favorite || false,
        created_at: friend.created_at || Date.now(),
        updated_at: friend.updated_at || Date.now()
      }));
    } catch (error) {
      console.error("[FriendService] Failed to get cached friends:", error);
      return [];
    }
  }

  async performDeltaFriendSync(): Promise<void> {
    try {
      console.log("[FriendService] Performing delta friend sync...");
      await this.syncFriendsFromServer();
      console.log("[FriendService] Delta friend sync completed");
    } catch (error) {
      console.error("[FriendService] Delta friend sync failed:", error);
      throw error;
    }
  }


}

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create singleton instance
export const friendService = new FriendService();