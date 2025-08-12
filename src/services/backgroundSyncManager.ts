import { sessionManager } from '../utils/sessionManager';
import { friendService } from '../friend/friendService';
import { chatService } from './chatService';
import { participantService } from '../participant/participantService';
import { websocketService } from '../websocket/websocketService';

export interface InitializationStep {
  id: string;
  name: string;
  weight: number; // How much this step contributes to overall progress
  description: string;
}

export interface InitializationProgress {
  currentStep: string;
  progress: number;
  isComplete: boolean;
  error?: string;
}

export class BackgroundSyncManager {
  private static instance: BackgroundSyncManager;
  private isInitializing = false;
  private progressCallbacks: Set<(progress: InitializationProgress) => void> = new Set();

  static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager();
    }
    return BackgroundSyncManager.instance;
  }

  // Define all initialization steps with their weights
  private readonly initializationSteps: InitializationStep[] = [
    {
      id: 'database',
      name: 'Database',
      weight: 10,
      description: 'Initializing local database...'
    },
    {
      id: 'session',
      name: 'Session',
      weight: 15,
      description: 'Verifying user session...'
    },
    {
      id: 'friends',
      name: 'Friends',
      weight: 20,
      description: 'Loading friends from database...'
    },
    {
      id: 'friends_sync',
      name: 'Friends Sync',
      weight: 15,
      description: 'Syncing friends from server...'
    },
    {
      id: 'chats',
      name: 'Chats',
      weight: 20,
      description: 'Loading chats from database...'
    },
    {
      id: 'participants',
      name: 'Participants',
      weight: 15,
      description: 'Syncing chat participants...'
    },
    {
      id: 'websocket',
      name: 'WebSocket',
      weight: 5,
      description: 'Connecting to chat server...'
    }
  ];

  // Calculate total weight for progress calculation
  private get totalWeight(): number {
    return this.initializationSteps.reduce((sum, step) => sum + step.weight, 0);
  }

  /**
   * Subscribe to initialization progress updates
   */
  onProgressUpdate(callback: (progress: InitializationProgress) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Notify all subscribers of progress updates
   */
  private notifyProgress(progress: InitializationProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('[BackgroundSyncManager] Error in progress callback:', error);
      }
    });
  }

  /**
   * Calculate progress percentage based on completed steps
   */
  private calculateProgress(completedSteps: Set<string>): number {
    let completedWeight = 0;
    this.initializationSteps.forEach(step => {
      if (completedSteps.has(step.id)) {
        completedWeight += step.weight;
      }
    });
    return Math.min((completedWeight / this.totalWeight) * 100, 100);
  }

  /**
   * Main initialization method that handles all setup steps
   */
  async initializeApp(): Promise<void> {
    if (this.isInitializing) {
      console.log('[BackgroundSyncManager] Initialization already in progress');
      return;
    }

    this.isInitializing = true;
    const completedSteps = new Set<string>();
    let currentStep = '';

    try {
      console.log('[BackgroundSyncManager] Starting app initialization...');

      // Step 1: Database (already done by Tauri)
      currentStep = 'Database';
      console.log('[BackgroundSyncManager] Step 1: Database initialization...');
      this.notifyProgress({
        currentStep: 'Initializing local database...',
        progress: this.calculateProgress(completedSteps),
        isComplete: false
      });
      completedSteps.add('database');
      await this.delay(500); // Small delay for smooth UX

      // Step 2: Session verification
      currentStep = 'Session';
      console.log('[BackgroundSyncManager] Step 2: Session verification...');
      this.notifyProgress({
        currentStep: 'Verifying user session...',
        progress: this.calculateProgress(completedSteps),
        isComplete: false
      });
      
      const token = await sessionManager.getToken();
      const userId = await sessionManager.getCurrentUserId();
      
      console.log('[BackgroundSyncManager] Session check - Token:', !!token, 'User:', !!userId);
      
      if (!token || !userId) {
        throw new Error('No valid session found');
      }
      
      completedSteps.add('session');
      await this.delay(300);

      // Step 3: Load friends from database
      currentStep = 'Friends';
      console.log('[BackgroundSyncManager] Step 3: Loading friends from database...');
      this.notifyProgress({
        currentStep: 'Loading friends from database...',
        progress: this.calculateProgress(completedSteps),
        isComplete: false
      });
      
      await friendService.get_cached_friends_for_current_user();
      completedSteps.add('friends');
      await this.delay(400);

      // Step 4: Sync friends from server (background)
      currentStep = 'Friends Sync';
      console.log('[BackgroundSyncManager] Step 4: Syncing friends from server...');
      this.notifyProgress({
        currentStep: 'Syncing friends from server...',
        progress: this.calculateProgress(completedSteps),
        isComplete: false
      });
      
      try {
        await friendService.syncFriendsFromServer();
        console.log('[BackgroundSyncManager] Friends synced successfully');
      } catch (error) {
        console.warn('[BackgroundSyncManager] Friend sync failed (non-critical):', error);
      }
      
      completedSteps.add('friends_sync');
      await this.delay(500);

      // Step 5: Load chats from database
      currentStep = 'Chats';
      console.log('[BackgroundSyncManager] Step 5: Loading chats from database...');
      this.notifyProgress({
        currentStep: 'Loading chats from database...',
        progress: this.calculateProgress(completedSteps),
        isComplete: false
      });
      
      await chatService.getAllChats();
      completedSteps.add('chats');
      await this.delay(400);

      // Step 6: Sync chat participants (background)
      currentStep = 'Participants';
      console.log('[BackgroundSyncManager] Step 6: Syncing chat participants...');
      this.notifyProgress({
        currentStep: 'Syncing chat participants...',
        progress: this.calculateProgress(completedSteps),
        isComplete: false
      });
      
      try {
        await participantService.syncAllExistingChats();
        console.log('[BackgroundSyncManager] Chat participants synced successfully');
      } catch (error) {
        console.warn('[BackgroundSyncManager] Participant sync failed (non-critical):', error);
      }
      
      completedSteps.add('participants');
      await this.delay(500);

      // Step 7: WebSocket connection
      currentStep = 'WebSocket';
      console.log('[BackgroundSyncManager] Step 7: Connecting to WebSocket...');
      this.notifyProgress({
        currentStep: 'Connecting to chat server...',
        progress: this.calculateProgress(completedSteps),
        isComplete: false
      });
      
      try {
        await websocketService.connect(token);
        console.log('[BackgroundSyncManager] WebSocket connected successfully');
      } catch (error) {
        console.warn('[BackgroundSyncManager] WebSocket connection failed (non-critical):', error);
      }
      
      completedSteps.add('websocket');
      await this.delay(300);

      // Final progress update
      console.log('[BackgroundSyncManager] All steps completed, marking as complete');
      this.notifyProgress({
        currentStep: 'Initialization complete!',
        progress: 100,
        isComplete: true
      });

      console.log('[BackgroundSyncManager] App initialization completed successfully');
      
    } catch (error) {
      console.error('[BackgroundSyncManager] Initialization failed at step:', currentStep, 'Error:', error);
      
      this.notifyProgress({
        currentStep: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: this.calculateProgress(completedSteps),
        isComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Utility method for smooth progress transitions
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if initialization is currently in progress
   */
  getInitializingStatus(): boolean {
    return this.isInitializing;
  }

  /**
   * Get all initialization steps for reference
   */
  getInitializationSteps(): InitializationStep[] {
    return [...this.initializationSteps];
  }
}

export const backgroundSyncManager = BackgroundSyncManager.getInstance(); 
