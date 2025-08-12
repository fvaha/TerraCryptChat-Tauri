import { invoke } from '@tauri-apps/api/core';
import { sessionManager } from '../utils/sessionManager';

export interface ApiError {
  status: number;
  message: string;
  data?: unknown;
}

export interface ErrorData {
  status?: number;
  message?: string;
  [key: string]: unknown;
}

interface StoredUser {
  username: string;
  password: string;
  [key: string]: unknown;
}

interface LoginResult {
  access_token: string;
  [key: string]: unknown;
}

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isHandling401: boolean = false;
  private retryQueue: Array<() => Promise<unknown>> = [];

  private constructor() {}

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Handle API errors globally, with special handling for 401 errors
   */
  async handleApiError(error: ErrorData, retryFunction?: () => Promise<unknown>): Promise<unknown> {
    console.log('[GlobalErrorHandler] Handling API error:', error);

    // Check if it's a 401 Unauthorized error
    if (this.is401Error(error)) {
      console.log('[GlobalErrorHandler] Detected 401 error, attempting silent relogin...');
      
      if (this.isHandling401) {
        console.log('[GlobalErrorHandler] Already handling 401, queuing retry...');
        if (retryFunction) {
          this.retryQueue.push(retryFunction);
        }
        throw error;
      }

      this.isHandling401 = true;

      try {
        // Attempt silent relogin
        const success = await this.attemptSilentRelogin();
        
        if (success) {
          console.log('[GlobalErrorHandler] Silent relogin successful, retrying operations...');
          
          // Retry the original function if provided
          if (retryFunction) {
            const result = await retryFunction();
            
            // Process any queued retries
            await this.processRetryQueue();
            
            this.isHandling401 = false;
            return result;
          } else {
            // Process any queued retries
            await this.processRetryQueue();
            
            this.isHandling401 = false;
            return;
          }
        } else {
          console.log('[GlobalErrorHandler] Silent relogin failed, redirecting to login...');
          this.isHandling401 = false;
          
          // Redirect to login or show login modal
          await this.handleLoginRequired();
          throw error;
        }
      } catch (reloginError) {
        console.error('[GlobalErrorHandler] Silent relogin error:', reloginError);
        this.isHandling401 = false;
        
        // Redirect to login or show login modal
        await this.handleLoginRequired();
        throw error;
      }
    }

    // For non-401 errors, just rethrow
    throw error;
  }

  /**
   * Check if an error is a 401 Unauthorized error
   */
  private is401Error(error: ErrorData): boolean {
    if (typeof error === 'string') {
      return error.includes('401') || error.includes('Unauthorized');
    }
    
    if (error && typeof error === 'object') {
      return error.status === 401 || 
             error.message?.includes('401') || 
             error.message?.includes('Unauthorized') ||
             error.toString().includes('401') ||
             error.toString().includes('Unauthorized');
    }
    
    return false;
  }

  /**
   * Attempt silent relogin using stored credentials
   */
  private async attemptSilentRelogin(): Promise<boolean> {
    try {
      console.log('[GlobalErrorHandler] Attempting silent relogin...');
      
      // Get stored credentials from database
      const storedUser = await invoke<StoredUser>('db_get_most_recent_user');
      
      if (!storedUser || !storedUser.username || !storedUser.password) {
        console.log('[GlobalErrorHandler] No stored credentials found');
        return false;
      }

      console.log('[GlobalErrorHandler] Attempting login with stored credentials for user:', storedUser.username);
      
      // Attempt login with stored credentials
      const loginResult = await invoke<LoginResult>('login', {
        username: storedUser.username,
        password: storedUser.password
      });

      if (loginResult && loginResult.access_token) {
        console.log('[GlobalErrorHandler] Silent relogin successful');
        
        // Update session manager with new token
        await sessionManager.handleSuccessfulLogin(
          loginResult.access_token,
          storedUser.username,
          storedUser.password
        );
        
        return true;
      } else {
        console.log('[GlobalErrorHandler] Silent relogin failed - no access token in response');
        return false;
      }
    } catch (error) {
      console.error('[GlobalErrorHandler] Silent relogin error:', error);
      return false;
    }
  }

  /**
   * Process any queued retry operations
   */
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) {
      return;
    }

    console.log(`[GlobalErrorHandler] Processing ${this.retryQueue.length} queued retries...`);
    
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const retryFunction of queue) {
      try {
        await retryFunction();
      } catch (error) {
        console.error('[GlobalErrorHandler] Queued retry failed:', error);
      }
    }
  }

  /**
   * Handle when login is required (silent relogin failed)
   */
  private async handleLoginRequired(): Promise<void> {
    console.log('[GlobalErrorHandler] Login required, clearing session...');
    
    // Clear current session
    await sessionManager.logout();
    
    // You could emit an event here to notify the UI to show login modal
    // For now, we'll just log out the user
  }

  /**
   * Wrap an API call with automatic 401 handling
   */
  async with401Handling<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      return this.handleApiError(error, apiCall);
    }
  }

  /**
   * Add a retry function to the queue
   */
  addToRetryQueue(retryFunction: () => Promise<unknown>): void {
    this.retryQueue.push(retryFunction);
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance(); 
