import { invoke } from '@tauri-apps/api/core';
import { databaseServiceAsync } from '../services/databaseServiceAsync';
import { Friend } from '../services/databaseServiceAsync';
import { SessionManager } from '../utils/sessionManager';
import { nativeApiService } from '../api/nativeApiService';

export class FriendService {
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

  async deleteFriend(friendId: string): Promise<void> {
    try {
      await databaseServiceAsync.deleteFriend(friendId);
      console.log(`[FriendService] Friend deleted successfully: ${friendId}`);
    } catch (error) {
      console.error(`[FriendService] Failed to delete friend:`, error);
      throw error;
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
      console.log(`[FriendService] Searching users with query: ${query}`);
      
      // Get the current token from session manager
      const sessionManager = new SessionManager();
      const token = sessionManager.getToken();
      
      if (!token) {
        console.error("[FriendService] No token available for search");
        return [];
      }
      
      const response = await invoke<{ data: any[] }>("search_users", { token, query });
      
      if (!response || !response.data) {
        console.warn("[FriendService] No search results received");
        return [];
      }
      
      console.log(`[FriendService] Found ${response.data.length} users matching query`);
      return response.data;
    } catch (error) {
      console.error("[FriendService] Failed to search users:", error);
      return [];
    }
  }

  async sendFriendRequest(friendId: string): Promise<void> {
    try {
      console.log(`[FriendService] Sending friend request to: ${friendId}`);
      
      const response = await invoke("send_friend_request", { friendId });
      console.log("[FriendService] Friend request sent successfully");
    } catch (error) {
      console.error("[FriendService] Failed to send friend request:", error);
      throw error;
    }
  }

  async acceptFriendRequest(friendId: string): Promise<void> {
    try {
      console.log(`[FriendService] Accepting friend request from: ${friendId}`);
      
      const response = await invoke("accept_friend_request", { friendId });
      console.log("[FriendService] Friend request accepted successfully");
    } catch (error) {
      console.error("[FriendService] Failed to accept friend request:", error);
      throw error;
    }
  }

  async rejectFriendRequest(friendId: string): Promise<void> {
    try {
      console.log(`[FriendService] Rejecting friend request from: ${friendId}`);
      
      const response = await invoke("reject_friend_request", { friendId });
      console.log("[FriendService] Friend request rejected successfully");
    } catch (error) {
      console.error("[FriendService] Failed to reject friend request:", error);
      throw error;
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

  async getCachedFriendsForCurrentUser(): Promise<Friend[]> {
    try {
      console.log("[FriendService] Getting cached friends for current user...");
      
      // First get cached friends from database
      let friends = await databaseServiceAsync.getAllFriends();
      console.log(`[FriendService] Found ${friends.length} cached friends`);
      
      // Then try to fetch fresh data from API and save to database
      try {
        const sessionManager = new SessionManager();
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

export const friendService = new FriendService();