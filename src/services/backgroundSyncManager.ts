import { friendService } from '../friend/friendService';
import { chatService } from './chatService';
import { participantService } from '../participant/participantService';

export class BackgroundSyncManager {
  private static instance: BackgroundSyncManager;
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 30000; // 30 seconds cooldown between syncs

  static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager();
    }
    return BackgroundSyncManager.instance;
  }

  // MARK: - Screen-based Delta Updates

  /**
   * Triggered when user opens the friends screen
   */
  async onFriendsScreenOpened(): Promise<void> {
    console.log('[BackgroundSyncManager] Friends screen opened, triggering delta sync...');
    await this.performFriendsDeltaSync();
  }

  /**
   * Triggered when user opens the chat screen
   */
  async onChatScreenOpened(): Promise<void> {
    console.log('[BackgroundSyncManager] Chat screen opened, triggering delta sync...');
    await this.performChatsDeltaSync();
  }

  /**
   * Triggered when user opens a specific chat
   */
  async onSpecificChatOpened(chatId: string): Promise<void> {
    console.log('[BackgroundSyncManager] Specific chat opened:', chatId, 'triggering delta sync...');
    await this.performChatsDeltaSync();
    await this.performParticipantsDeltaSync(chatId);
  }

  /**
   * Triggered when user opens the chat list screen
   */
  async onChatListScreenOpened(): Promise<void> {
    console.log('[BackgroundSyncManager] Chat list screen opened, triggering delta sync...');
    await this.performChatsDeltaSync();
  }

  // MARK: - Delta Sync Methods

  private async performFriendsDeltaSync(): Promise<void> {
    if (this.shouldSkipSync()) {
      console.log('[BackgroundSyncManager] Skipping friends delta sync due to cooldown');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('[BackgroundSyncManager] Starting friends delta sync...');
      
      await friendService.performDeltaFriendSync();
      
      this.updateLastSyncTime();
      console.log('[BackgroundSyncManager] Friends delta sync completed');
    } catch (error) {
      console.error('[BackgroundSyncManager] Friends delta sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async performChatsDeltaSync(): Promise<void> {
    if (this.shouldSkipSync()) {
      console.log('[BackgroundSyncManager] Skipping chats delta sync due to cooldown');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('[BackgroundSyncManager] Starting chats delta sync...');
      
      // Use the new approach that fetches chats and participants together
      await chatService.syncChatsFromServer();
      
      this.updateLastSyncTime();
      console.log('[BackgroundSyncManager] Chats delta sync completed');
    } catch (error) {
      console.error('[BackgroundSyncManager] Chats delta sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async performParticipantsDeltaSync(chatId: string): Promise<void> {
    if (this.shouldSkipSync()) {
      console.log('[BackgroundSyncManager] Skipping participants delta sync due to cooldown');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('[BackgroundSyncManager] Starting participants delta sync for chat:', chatId);
      
      // For now, just refresh participants from local database
      await participantService.fetchAndSaveParticipants(chatId);
      
      this.updateLastSyncTime();
      console.log('[BackgroundSyncManager] Participants delta sync completed');
    } catch (error) {
      console.error('[BackgroundSyncManager] Participants delta sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // MARK: - Manual Sync Methods

  /**
   * Manual sync for friends (can be called from settings or refresh button)
   */
  async manualFriendsSync(): Promise<void> {
    console.log('[BackgroundSyncManager] Manual friends sync triggered...');
    this.lastSyncTime = 0; // Reset cooldown for manual sync
    await this.performFriendsDeltaSync();
  }

  /**
   * Manual sync for chats (can be called from settings or refresh button)
   */
  async manualChatsSync(): Promise<void> {
    console.log('[BackgroundSyncManager] Manual chats sync triggered...');
    this.lastSyncTime = 0; // Reset cooldown for manual sync
    await this.performChatsDeltaSync();
  }

  /**
   * Full sync for all data (can be called from settings)
   */
  async fullSync(): Promise<void> {
    console.log('[BackgroundSyncManager] Full sync triggered...');
    this.lastSyncTime = 0; // Reset cooldown for manual sync
    
    try {
      this.isSyncing = true;
      
      // Perform all delta syncs
      await Promise.all([
        this.performFriendsDeltaSync(),
        this.performChatsDeltaSync()
      ]);
      
      console.log('[BackgroundSyncManager] Full sync completed');
    } catch (error) {
      console.error('[BackgroundSyncManager] Full sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // MARK: - Utility Methods

  private shouldSkipSync(): boolean {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    
    if (this.isSyncing) {
      console.log('[BackgroundSyncManager] Sync already in progress, skipping...');
      return true;
    }
    
    if (timeSinceLastSync < this.SYNC_COOLDOWN) {
      console.log('[BackgroundSyncManager] Sync cooldown active, skipping...');
      return true;
    }
    
    return false;
  }

  private updateLastSyncTime(): void {
    this.lastSyncTime = Date.now();
  }

  // MARK: - Getters

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  getSyncCooldown(): number {
    return this.SYNC_COOLDOWN;
  }
}

export const backgroundSyncManager = BackgroundSyncManager.getInstance(); 