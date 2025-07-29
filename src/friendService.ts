import { nativeApiService } from './nativeApiService';
import { Friend } from './models';

export class FriendService {
    private static instance: FriendService;
    private isLoadingFriends: boolean = false;
    private isOffline: boolean = false;
    private localDeletes: Set<string> = new Set();
    private pendingRequestCount: number = 0;

    static getInstance(): FriendService {
        if (!FriendService.instance) {
            FriendService.instance = new FriendService();
        }
        return FriendService.instance;
    }

    // MARK: - Initial Fetch And Store Friends (matches Swift initialFetchAndStoreFriends)
    async initialFetchAndStoreFriends(): Promise<void> {
        console.log('[FriendService] Initial fetch and store friends...');
        
        try {
            const token = await this.getToken();
            if (!token) return;
            const serverFriends = await nativeApiService.fetchAllFriendsAndSave(token);
            
            if (serverFriends.length === 0) {
                console.log('[FriendService] No friends returned from server');
                return;
            }

            // Filter out current user (Swift pattern)
            const currentUserId = await this.getCurrentUserId();
            const filtered = serverFriends.filter(friend => friend.user_id !== currentUserId);

            // Clear and add friends (Swift pattern)
            await this.clearFriends();
            await this.addFriends(filtered);
            await this.refreshLiveFriends();

            console.log('[FriendService] Initial fetch completed successfully');
        } catch (error) {
            console.error('[FriendService] Failed to fetch friends:', error);
        }
    }

    // MARK: - Perform Delta Friend Sync (matches Swift performDeltaFriendSync)
    async performDeltaFriendSync(): Promise<void> {
        console.log('[FriendService] Performing delta friend sync...');
        
        try {
            const token = await this.getToken();
            if (!token) return;
            const serverFriends = await nativeApiService.friendsDeltaUpdate(token);
            
            // Filter out current user (Swift pattern)
            const currentUserId = await this.getCurrentUserId();
            const filtered = serverFriends.filter(friend => friend.user_id !== currentUserId);

            await this.syncFriendsWithServerData(filtered);
            console.log('[FriendService] Delta sync completed successfully');
        } catch (error) {
            console.error('[FriendService] Delta sync failed:', error);
        }
    }

    // MARK: - Perform Delta Friend Sync And Refresh (matches Swift performDeltaFriendSyncAndRefresh)
    async performDeltaFriendSyncAndRefresh(): Promise<void> {
        await this.performDeltaFriendSync();
        // In a real app, you'd emit a notification here
        console.log('[FriendService] Delta sync and refresh completed');
    }

    // MARK: - Update Pending Request Count (matches Swift updatePendingRequestCount)
    async updatePendingRequestCount(): Promise<void> {
        console.log('[FriendService] Updating pending request count...');
        
        try {
            const token = await this.getToken();
            if (!token) return;

            const allRequests = await nativeApiService.getFriendRequests();
            const myId = await this.getCurrentUserId();
            const receivedOnly = allRequests.filter(request => request.sender.user_id !== myId);

            this.pendingRequestCount = receivedOnly.length;
            console.log('[FriendService] Pending request count updated:', this.pendingRequestCount);
        } catch (error) {
            console.error('[FriendService] Failed to update pending count:', error);
        }
    }

    // MARK: - Send Friend Request (matches Swift sendFriendRequest)
    async sendFriendRequest(userId: string): Promise<'success' | 'alreadyExists' | 'failure'> {
        console.log('[FriendService] Sending friend request to:', userId);
        
        try {
            const token = await this.getToken();
            const senderId = await this.getCurrentUserId();
            
            if (!token || !senderId) {
                return 'failure';
            }

            await nativeApiService.sendFriendRequest(userId, token);
            console.log('[FriendService] Friend request sent successfully');
            return 'success';
        } catch (error: any) {
            console.error('[FriendService] Failed to send friend request:', error);
            
            // Check for 409 conflict (already exists)
            if (error.message?.includes('409') || error.message?.includes('already exists')) {
                return 'alreadyExists';
            }
            return 'failure';
        }
    }

    // MARK: - Accept Friend Request (matches Swift acceptFriendRequest)
    async acceptFriendRequest(requestId: string, senderId: string): Promise<boolean> {
        console.log('[FriendService] Accepting friend request:', requestId);
        
        try {
            const token = await this.getToken();
            if (!token) return false;

            await nativeApiService.acceptFriendRequest(requestId, token);
            await this.addFriendToDatabase(senderId);
            console.log('[FriendService] Friend request accepted successfully');
            return true;
        } catch (error) {
            console.error('[FriendService] Failed to accept friend request:', error);
            return false;
        }
    }

    // MARK: - Decline Friend Request (matches Swift declineFriendRequest)
    async declineFriendRequest(requestId: string): Promise<boolean> {
        console.log('[FriendService] Declining friend request:', requestId);
        
        try {
            const token = await this.getToken();
            if (!token) return false;

            await nativeApiService.rejectFriendRequest(requestId, token);
            console.log('[FriendService] Friend request declined successfully');
            return true;
        } catch (error) {
            console.error('[FriendService] Failed to decline friend request:', error);
            return false;
        }
    }

    // MARK: - Remove Friend (matches Swift removeFriend)
    async removeFriend(friendId: string): Promise<void> {
        console.log('[FriendService] Removing friend:', friendId);
        
        try {
            const token = await this.getToken();
            if (!token) return;

            await nativeApiService.deleteFriend(friendId, token);
            await this.removeFriendFromDatabase(friendId);
            await this.initialFetchAndStoreFriends();
            console.log('[FriendService] Friend removed successfully');
        } catch (error) {
            console.error('[FriendService] Failed to remove friend:', error);
        }
    }

    // MARK: - Add Friend To Database (matches Swift addFriendToCoreData)
    async addFriendToDatabase(userId: string): Promise<void> {
        console.log('[FriendService] Adding friend to database from user ID:', userId);
        
        try {
            const userDetails = await this.fetchUserDetails(userId);
            if (!userDetails) return;

            const newFriend: Friend = {
                user_id: userDetails.user_id,
                username: userDetails.username,
                name: userDetails.name || 'Unknown',
                email: userDetails.email,
                picture: userDetails.picture,
                status: undefined
            };

            await this.addFriends([newFriend]);
            await this.refreshLiveFriends();
            console.log('[FriendService] Friend added to database successfully');
        } catch (error) {
            console.error('[FriendService] Failed to add friend to database:', error);
        }
    }

    // MARK: - Fetch User Details (matches Swift fetchUserDetails)
    async fetchUserDetails(userId: string): Promise<any | null> {
        console.log('[FriendService] Fetching user details for:', userId);
        
        try {
            const token = await this.getToken();
            if (!token) return null;

            // This would need to be implemented in nativeApiService
            const userDetails = await nativeApiService.getUserById(userId, token);
            console.log('[FriendService] User details fetched successfully');
            return userDetails;
        } catch (error) {
            console.error('[FriendService] Failed to fetch user details:', error);
            return null;
        }
    }

    // MARK: - Search Users (matches Swift searchUsers)
    async searchUsers(query: string): Promise<any[]> {
        console.log('[FriendService] Searching users with query:', query);
        
        try {
            const token = await this.getToken();
            if (!token || !query.trim()) return [];

            const results = await nativeApiService.searchUsers(query);
            console.log('[FriendService] Search results:', results.length);
            return results;
        } catch (error) {
            console.error('[FriendService] Search failed:', error);
            return [];
        }
    }

    // MARK: - Update Favorite Status (matches Swift updateFavoriteStatus)
    async updateFavoriteStatus(friendId: string, isFavorite: boolean): Promise<void> {
        console.log('[FriendService] Updating favorite status for:', friendId, 'to:', isFavorite);
        
        try {
            // This would need to be implemented in the database layer
            await nativeApiService.updateFriendFavoriteStatus(friendId, isFavorite);
            console.log('[FriendService] Favorite status updated successfully');
        } catch (error) {
            console.error('[FriendService] Failed to update favorite status:', error);
        }
    }

    // MARK: - Is Favorite (matches Swift isFavorite)
    async isFavorite(id: string): Promise<boolean> {
        try {
            const friends = await this.getCachedFriendsForCurrentUser();
            const friend = friends.find(f => f.user_id === id);
            return friend?.is_favorite || false;
        } catch (error) {
            console.error('[FriendService] Failed to check favorite status:', error);
            return false;
        }
    }

    // MARK: - Get Friends As Participants (matches Swift getFriendsAsParticipants)
    async getFriendsAsParticipants(excludeCurrentUser: boolean = false): Promise<any[]> {
        console.log('[FriendService] Getting friends as participants, excludeCurrentUser:', excludeCurrentUser);
        
        try {
            const friends = await this.getCachedFriendsForCurrentUser();
            const currentUserId = await this.getCurrentUserId();

            return friends
                .filter(friend => !excludeCurrentUser || friend.user_id !== currentUserId)
                .map(friend => ({
                    participantId: crypto.randomUUID(),
                    userId: friend.user_id,
                    username: friend.username,
                    joinedAt: new Date().toISOString(),
                    role: 'member'
                }));
        } catch (error) {
            console.error('[FriendService] Failed to get friends as participants:', error);
            return [];
        }
    }

    // MARK: - Database Operations (matching Swift FriendManager patterns)

    async addFriends(friends: Friend[]): Promise<void> {
        console.log('[FriendService] Adding friends to database:', friends.length);
        
        try {
            for (const friend of friends) {
                await nativeApiService.insertOrUpdateFriend(friend);
            }
            console.log('[FriendService] Friends added to database successfully');
        } catch (error) {
            console.error('[FriendService] Failed to add friends to database:', error);
            
            // Check if this is a schema issue
            if (error && typeof error === 'object' && 'toString' in error && error.toString().includes('table friend has no column named user_id')) {
                console.log('[FriendService] Detected database schema issue, attempting to fix...');
                try {
                    await nativeApiService.fixDatabaseSchema();
                    console.log('[FriendService] Database schema fixed, retrying friend insertion...');
                    // Retry the insertion
                    for (const friend of friends) {
                        await nativeApiService.insertOrUpdateFriend(friend);
                    }
                    console.log('[FriendService] Friends added to database successfully after schema fix');
                } catch (fixError) {
                    console.error('[FriendService] Failed to fix database schema:', fixError);
                }
            }
        }
    }

    async removeFriendFromDatabase(friendId: string): Promise<void> {
        console.log('[FriendService] Removing friend from database:', friendId);
        
        try {
            await nativeApiService.deleteFriendFromDatabase(friendId);
            console.log('[FriendService] Friend removed from database successfully');
        } catch (error) {
            console.error('[FriendService] Failed to remove friend from database:', error);
        }
    }

    async clearFriends(): Promise<void> {
        console.log('[FriendService] Clearing all friends from database');
        
        try {
            await nativeApiService.clearAllFriends();
            console.log('[FriendService] All friends cleared from database');
        } catch (error) {
            console.error('[FriendService] Failed to clear friends from database:', error);
        }
    }

    async syncFriendsWithServerData(serverFriends: Friend[]): Promise<void> {
        console.log('[FriendService] Syncing friends with server data:', serverFriends.length);
        
        try {
            const serverIds = new Set(serverFriends.map(f => f.user_id));
            const localFriends = await this.getCachedFriendsForCurrentUser();
            const localIds = new Set(localFriends.map(f => f.user_id));

            const toAdd = serverFriends.filter(f => !localIds.has(f.user_id));
            const idsToRemove = Array.from(localIds).filter(id => !serverIds.has(id));

            if (toAdd.length > 0) {
                await this.addFriends(toAdd);
            }
            
            if (idsToRemove.length > 0) {
                for (const id of idsToRemove) {
                    await this.removeFriendFromDatabase(id);
                }
            }

            await this.refreshLiveFriends();
            console.log('[FriendService] Friends synced with server data successfully');
        } catch (error) {
            console.error('[FriendService] Failed to sync friends with server data:', error);
        }
    }

    async refreshLiveFriends(): Promise<void> {
        console.log('[FriendService] Refreshing live friends');
        
        try {
            // In a real implementation, this would update the live friends list
            // For now, we just log that it was called
            console.log('[FriendService] Live friends refreshed');
        } catch (error) {
            console.error('[FriendService] Failed to refresh live friends:', error);
        }
    }

    // MARK: - Existing Methods (keeping for compatibility)

    async fetchAllFriendsAndSave(token: string): Promise<Friend[]> {
        console.log('[FriendService] Fetching all friends from API and saving to database...');
        
        this.isLoadingFriends = true;
        
        try {
            const friends = await nativeApiService.fetchAllFriendsAndSave(token);
            
            // Filter localDeletes
            const serverFriendIds = new Set(friends.map(friend => friend.user_id));
            const filteredFriends = friends.filter(friend => !this.localDeletes.has(friend.user_id));
            
            // Clean up localDeletes for friends not present on the server
            this.localDeletes = new Set(
                Array.from(this.localDeletes).filter(id => serverFriendIds.has(id))
            );
            
            console.log('[FriendService] Successfully fetched and saved friends');
            return filteredFriends;
        } catch (error) {
            console.error('[FriendService] Failed to fetch all friends:', error);
            throw error;
        } finally {
            this.isLoadingFriends = false;
        }
    }

    async friendsDeltaUpdate(token: string): Promise<Friend[]> {
        console.log('[FriendService] Performing delta update for friends...');
        
        this.isLoadingFriends = true;
        this.isOffline = false;
        
        try {
            const friends = await nativeApiService.friendsDeltaUpdate(token);
            
            // Filter localDeletes
            const serverFriendIds = new Set(friends.map(friend => friend.user_id));
            const filteredFriends = friends.filter(friend => !this.localDeletes.has(friend.user_id));
            
            // Clean up localDeletes for friends not present on the server
            this.localDeletes = new Set(
                Array.from(this.localDeletes).filter(id => serverFriendIds.has(id))
            );
            
            console.log('[FriendService] Successfully performed delta update');
            return filteredFriends;
        } catch (error) {
            console.error('[FriendService] Delta update failed:', error);
            this.isOffline = true;
            throw error;
        } finally {
            this.isLoadingFriends = false;
        }
    }

    async getCachedFriendsForCurrentUser(): Promise<Friend[]> {
        console.log('[FriendService] Getting cached friends for current user...');
        
        try {
            const friends = await nativeApiService.getCachedFriendsForCurrentUser();
            
            // Filter localDeletes
            const filteredFriends = friends.filter(friend => !this.localDeletes.has(friend.user_id));
            
            console.log('[FriendService] Retrieved cached friends:', filteredFriends.length);
            return filteredFriends;
        } catch (error) {
            console.error('[FriendService] Failed to get cached friends:', error);
            throw error;
        }
    }

    async deleteFriend(userId: string, token: string): Promise<void> {
        console.log('[FriendService] Deleting friend:', userId);
        
        // Add to localDeletes immediately (before server response!)
        this.localDeletes.add(userId);
        
        const performLocalCleanup = async () => {
            try {
                await nativeApiService.deleteFriendFromDatabase(userId);
                console.log('[FriendService] Local cleanup completed for friend:', userId);
            } catch (error) {
                console.error('[FriendService] Local cleanup failed:', error);
            }
        };
        
        try {
            // Try to delete from server first
            await nativeApiService.deleteFriend(userId, token);
            await performLocalCleanup();
        } catch (error) {
            console.error('[FriendService] Server delete failed:', error);
            await performLocalCleanup();
        }
        
        // Do not clean localDeletes here! It will be cleaned during fetch/delta updates
    }

    // MARK: - Helper Methods

    private async getToken(): Promise<string | null> {
        // This would need to be implemented to get the current token
        // For now, return null - this should be implemented based on your session management
        return null;
    }

    private async getCurrentUserId(): Promise<string> {
        // This would need to be implemented to get the current user ID
        // For now, return a placeholder
        return 'current-user-id';
    }

    // MARK: - Getters

    getIsLoadingFriends(): boolean {
        return this.isLoadingFriends;
    }

    getIsOffline(): boolean {
        return this.isOffline;
    }

    getLocalDeletes(): Set<string> {
        return this.localDeletes;
    }

    getPendingRequestCount(): number {
        return this.pendingRequestCount;
    }
}

export const friendService = FriendService.getInstance();