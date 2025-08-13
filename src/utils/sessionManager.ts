import { invoke } from '@tauri-apps/api/core';
import { websocketService } from '../websocket/websocketService';

interface DatabaseUser {
  user_id: string;
  username: string;
  password?: string;
  token_hash?: string;
  [key: string]: unknown;
}

interface LoginResult {
  access_token: string;
  [key: string]: unknown;
}

interface UserData {
  user_id: string;
  username: string;
  email: string;
  name?: string;
  picture?: string;
  role?: string;
  verified: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface SessionUser {
  id: string;
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  role: string;
  verified: boolean;
  is_dark_mode: boolean;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
  last_seen: number;
}

export interface SessionState {
  is_logged_in: boolean;
  is_session_initialized: boolean;
  current_user: SessionUser | null;
  is_dark_mode_enabled: boolean;
}

export class SessionManager {
  private current_user: SessionUser | null = null;
  private token: string | null = null;
  private is_initialized = false;
  private is_dark_mode_enabled = false;
  private static instance: SessionManager;
  private state_listeners: ((state: SessionState) => void)[] = [];
  private is_initializing = false;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  onStateChange(listener: (state: SessionState) => void): () => void {
    this.state_listeners.push(listener);
    return () => {
      const index = this.state_listeners.indexOf(listener);
      if (index > -1) {
        this.state_listeners.splice(index, 1);
      }
    };
  }

  private notifyStateChange(): void {
    const state: SessionState = {
      is_logged_in: this.isLoggedIn(),
      is_session_initialized: this.is_initialized,
      current_user: this.getCurrentUser(),
      is_dark_mode_enabled: this.getDarkModeEnabled(),
    };
    
    console.log('[SessionManager] notifyStateChange: Notifying', this.state_listeners.length, 'listeners with state:', state);
    console.log('[SessionManager] Current internal state:', {
      hasToken: !!this.token,
      hasUser: !!this.current_user,
      isInitialized: this.is_initialized
    });
    
    this.state_listeners.forEach((listener, index) => {
      console.log(`[SessionManager] notifyStateChange: Calling listener ${index + 1}`);
      try {
        listener(state);
        console.log(`[SessionManager] notifyStateChange: Listener ${index + 1} completed successfully`);
      } catch (error) {
        console.error(`[SessionManager] notifyStateChange: Listener ${index + 1} failed:`, error);
      }
    });
  }

  getState(): SessionState {
    return {
      is_logged_in: this.isLoggedIn(),
      is_session_initialized: this.is_initialized,
      current_user: this.getCurrentUser(),
      is_dark_mode_enabled: this.getDarkModeEnabled(),
    };
  }

  async initialize_session(): Promise<boolean> {
    try {
      console.log('[SessionManager] Starting initialize_session...');
      
      // Set initialized to true immediately to avoid blocking
      this.is_initialized = true;
      console.log('[SessionManager] Marked as initialized, notifying state change');
      this.notifyStateChange();
      
      // Initialize database and check session immediately
      try {
        console.log('[SessionManager] Ensuring database is initialized...');
        
        // Add retry logic for database initialization
        let retryCount = 0;
        const maxRetries = 3;
        let dbInitialized = false;
        
        while (retryCount < maxRetries && !dbInitialized) {
          try {
            await invoke('db_ensure_initialized');
            dbInitialized = true;
            console.log('[SessionManager] Database initialized successfully');
          } catch (dbError) {
            retryCount++;
            console.log(`[SessionManager] Database initialization attempt ${retryCount} failed:`, dbError);
            
            if (retryCount < maxRetries) {
              // Wait before retrying (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
              console.log(`[SessionManager] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.log('[SessionManager] Max retries reached, proceeding without database');
              // Continue without database for now
              break;
            }
          }
        }
        
        if (!dbInitialized) {
          console.log('[SessionManager] Database initialization failed, proceeding with limited functionality');
          this.notifyStateChange();
          return false;
        }
        
        // Database-first approach like Kotlin app
        console.log('[SessionManager] Getting most recent user from database...');
        let cachedUser: DatabaseUser | null = null;
        
        try {
          cachedUser = await invoke<DatabaseUser>('db_get_most_recent_user');
          console.log('[SessionManager] Cached user found:', !!cachedUser);
        } catch (dbError) {
          console.log('[SessionManager] Failed to get cached user:', dbError);
          // Continue without cached user
          cachedUser = null;
        }
        
        if (cachedUser && cachedUser.token_hash) {
          console.log('[SessionManager] Checking if token is expired...');
          // Check if token is expired (like Kotlin app)
          if (this.isTokenExpired(cachedUser.token_hash)) {
            console.log('[SessionManager] Token expired, attempting silent relogin...');
            // Try silent relogin with stored credentials
            const success = await this.attemptSilentRelogin();
            if (!success) {
              console.log('[SessionManager] Silent relogin failed, clearing database...');
              // Reset database on failed session restoration
              try {
                await invoke('db_clear_all_data');
                console.log('[SessionManager] Database cleared successfully');
              } catch (resetError) {
                console.log('[SessionManager] Failed to clear database:', resetError);
                // Silent fail
              }
              await this.logOut();
              console.log('[SessionManager] Logged out, notifying state change');
              this.notifyStateChange();
              return false;
            }
          } else {
            console.log('[SessionManager] Token valid, restoring session...');
            // Token is valid, restore session immediately
            await this.updateTokenAndState(cachedUser.token_hash, cachedUser);
            
            // Connect WebSocket in background
            setTimeout(async () => {
              try {
                await websocketService.connect(cachedUser.token_hash);
              } catch {
                // Silent fail - user already has data
              }
            }, 100);
            
            this.notifyStateChange();
            return true; // User is logged in
          }
        } else {
          console.log('[SessionManager] No cached user found, logging out...');
          await this.logOut();
        }
        
        console.log('[SessionManager] Final state change notification');
        this.notifyStateChange();
        return false; // No user found
      } catch (error) {
        console.log('[SessionManager] Error during initialization:', error);
        // Don't set error state, just return false
        return false;
      }
    } catch (error) {
      console.log('[SessionManager] Outer error during initialization:', error);
      this.is_initialized = true;
      this.notifyStateChange();
      return false;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      
      return exp <= now;
    } catch {
      return true;
    }
  }

  private async attemptSilentRelogin(): Promise<boolean> {
    try {
      // Get stored credentials from database
      const storedCredentials = await invoke<DatabaseUser>('db_get_most_recent_user');
      if (!storedCredentials?.username || !storedCredentials?.password) {
        return false;
      }

      // Attempt login with stored credentials
      const loginResult = await invoke('login', { 
        username: storedCredentials.username, 
        password: storedCredentials.password 
      });
      
      if (loginResult && typeof loginResult === 'object' && 'access_token' in loginResult) {
        const token = (loginResult as LoginResult).access_token;
        await this.handleSuccessfulLogin(token, storedCredentials.username, storedCredentials.password);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Silent relogin failed:', error);
      return false;
    }
  }

  private async updateTokenAndState(token: string, user: DatabaseUser) {
    console.log('Updating token and state...');
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('User:', user ? 'has user data' : 'null');
    
    this.token = token;
    
    // Convert DatabaseUser to SessionUser
    this.current_user = {
      id: user.user_id,
      user_id: user.user_id,
      username: user.username,
      name: user.username, // Use username as name if not provided
      email: '', // DatabaseUser doesn't have email, set empty
      picture: undefined,
      role: 'user', // Default role
      verified: false, // Default verified status
      is_dark_mode: false, // Default dark mode
      created_at: Date.now(), // Default timestamp
      updated_at: Date.now(), // Default timestamp
      deleted_at: undefined,
      last_seen: Date.now() // Default last seen
    };
    
    // Connect WebSocket after successful login
    try {
      console.log('Connecting WebSocket...');
      await websocketService.connect(token);
      console.log('WebSocket connected successfully');
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      // Don't fail the login if WebSocket fails
    }
    
    console.log('Emitting state change...');
    this.notifyStateChange();
    console.log('State change emitted. Current state:', this.getState());
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting login for user:', username);
      
      // Validate input like Kotlin version
      if (!username || username.trim().length === 0) {
        return { success: false, error: 'Please enter your username.' };
      }
      
      if (!password || password.length === 0) {
        return { success: false, error: 'Please enter your password.' };
      }
      
      // Use native login command
      const loginResult = await invoke('login', { 
        username: username.trim(), 
        password 
      });
      
      if (loginResult && typeof loginResult === 'object' && 'access_token' in loginResult) {
        const token = (loginResult as LoginResult).access_token;
        await this.handleSuccessfulLogin(token, username.trim(), password);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid login response' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      // Clear database on failed login to ensure clean state
      try {
        console.log('Clearing database due to failed login...');
        await invoke('db_clear_all_data');
        console.log('Database cleared after failed login');
      } catch (clearError) {
        console.error('Failed to clear database after login error:', clearError);
      }
      
      // Return user-friendly error message
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Invalid username or password.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async handleSuccessfulLogin(accessToken: string, username?: string, password?: string): Promise<void> {
    try {
      console.log('Handling successful login with token:', accessToken.substring(0, 20) + '...');
      
      // Note: nativeApiService.setToken() removed as method doesn't exist

      console.log('Fetching user data from API...');
      console.log('Token being used:', accessToken.substring(0, 20) + '...');
      
      // Get user data using the API call (like Kotlin version)
      const userData = await invoke<UserData>('get_current_user_with_token', { 
        token: accessToken
      });
      
      if (userData) {
        console.log('User data received:', userData);
        
        // Save user to database with token_hash (like Kotlin/Swift)
        console.log('Saving user to database...');
        // Convert ISO date strings to timestamps if they exist, otherwise use current time
        const created_at = userData.created_at ? new Date(userData.created_at).getTime() : Date.now();
        const updated_at = userData.updated_at ? new Date(userData.updated_at).getTime() : Date.now();
        
        const userForDb = {
          user_id: userData.user_id,
          username: userData.username,
          email: userData.email,
          name: userData.name || "",
          picture: userData.picture,
          role: userData.role || null,
          token_hash: accessToken, // Save token in user database like Kotlin/Swift
          verified: userData.verified,
          created_at: created_at,
          updated_at: updated_at,
          deleted_at: null,
          is_dark_mode: false,
          last_seen: Date.now(),
          password: password || null // Store password for silent relogin
        };
        
        console.log('User object to save:', userForDb);
        
        try {
          console.log('Attempting to save user to database...');
          await invoke('db_insert_user', { user: userForDb });
          console.log('User saved to database successfully');
          
          // Verify the user was saved by trying to retrieve it
          try {
            console.log('Verifying user was saved...');
            const savedUser = await invoke('db_get_user_by_id', { user_id: userForDb.user_id });
            console.log('User verification successful:', savedUser);
          } catch (verifyError) {
            console.error('User verification failed:', verifyError);
          }
        } catch (dbError) {
          console.error('Failed to save user to database:', dbError);
          throw dbError;
        }
        
        this.current_user = {
          ...userData,
          id: userData.user_id,
          user_id: userData.user_id,
          username: userData.username,
          name: userData.name || userData.username,
          email: userData.email || '',
          picture: userData.picture,
          role: userData.role || 'user',
          verified: userData.verified || false,
          is_dark_mode: false,
          created_at: created_at,
          updated_at: updated_at,
          deleted_at: null,
          last_seen: Date.now(),
        };
        
        // Set the token in the session manager
        this.token = accessToken;
        
        // Connect WebSocket after successful login
        try {
          console.log('Connecting WebSocket...');
          await websocketService.connect(accessToken);
          console.log('WebSocket connected successfully');
        } catch (error) {
          console.error('Failed to connect WebSocket:', error);
          // Don't fail the login if WebSocket fails
        }
        
        console.log('Login process completed successfully');
        
        // Data will be fetched from local SQLite database as needed
        console.log('Using locally stored data from SQLite database');
        
        this.notifyStateChange();
      } else {
        throw new Error('Failed to get user data');
      }
    } catch (error) {
      console.error('Failed to handle successful login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('[SessionManager] Starting logout process...');
      
      // Disconnect WebSocket
      try {
        await websocketService.disconnect();
        console.log('[SessionManager] WebSocket disconnected successfully');
      } catch (error) {
        console.error('[SessionManager] Failed to disconnect WebSocket:', error);
      }
      
      // Note: nativeApiService.clearToken() removed as method doesn't exist
      
      this.token = null;
      this.current_user = null;
      
      console.log('[SessionManager] Logout completed successfully, notifying state change...');
      this.notifyStateChange();
      console.log('[SessionManager] State change notification sent');
    } catch (error) {
      console.error('[SessionManager] Logout failed:', error);
    }
  }

  async logOut(): Promise<void> {
    console.log('[SessionManager] Public logout called, clearing database...');
    try {
      await invoke('db_clear_all_data');
      console.log('[SessionManager] Database cleared during logout');
    } catch (error) {
      console.error('[SessionManager] Failed to clear database during logout:', error);
    }
    await this.logout();
  }

  getCurrentUser(): SessionUser | null {
    return this.current_user;
  }

  getToken(): string | null {
    return this.token;
  }

  isLoggedIn(): boolean {
    const isLoggedIn = !!this.token && !!this.current_user;
    console.log('[SessionManager] isLoggedIn() called:', {
      hasToken: !!this.token,
      hasUser: !!this.current_user,
      result: isLoggedIn
    });
    return isLoggedIn;
  }

  async refreshToken(): Promise<boolean> {
    try {
      // Get current user from database (like Kotlin/Swift)
      const currentUser = await invoke<DatabaseUser>('db_get_most_recent_user');
      if (currentUser && currentUser.token_hash) {
        this.token = currentUser.token_hash;
        
        // Note: nativeApiService.setToken() removed as method doesn't exist
        
        this.current_user = {
          id: currentUser.user_id,
          user_id: currentUser.user_id,
          username: currentUser.username,
          name: (currentUser.name as string) || currentUser.username,
          email: (currentUser.email as string) || '',
          picture: currentUser.picture as string | undefined,
          role: (currentUser.role as string) || 'user',
          verified: (currentUser.verified as boolean) || false,
          is_dark_mode: (currentUser.is_dark_mode as boolean) || false,
          created_at: typeof currentUser.created_at === 'string' ? Date.parse(currentUser.created_at) : Date.now(),
          updated_at: typeof currentUser.updated_at === 'string' ? Date.parse(currentUser.updated_at) : Date.now(),
          deleted_at: currentUser.deleted_at ? (typeof currentUser.deleted_at === 'string' ? Date.parse(currentUser.deleted_at) : Date.now()) : undefined,
          last_seen: Date.now(),
        };
        this.notifyStateChange();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }

  getCurrentUsername(): string {
    return this.current_user?.username || "Unknown";
  }

  getCurrentUserId(): string | null {
    return this.current_user?.user_id || null;
  }

  getDarkModeEnabled(): boolean {
    return this.is_dark_mode_enabled;
  }

  async toggleDarkMode(): Promise<void> {
    try {
      this.is_dark_mode_enabled = !this.is_dark_mode_enabled;
      if (this.current_user) {
        await invoke('db_update_dark_mode', { 
          user_id: this.current_user.user_id, 
          is_dark_mode: this.is_dark_mode_enabled 
        });
        this.notifyStateChange();
      }
    } catch (error) {
      console.error('[SessionManager] Failed to toggle dark mode:', error);
    }
  }

  // Cleanup
  destroy(): void {
    this.state_listeners = [];
  }

  // Check if database is ready
  private async isDatabaseReady(): Promise<boolean> {
    try {
      await invoke('db_health_check');
      return true;
    } catch (error) {
      console.log('[SessionManager] Database health check failed:', error);
      return false;
    }
  }

  // Safe database operation wrapper
  private async safeDatabaseOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    if (!(await this.isDatabaseReady())) {
      console.log('[SessionManager] Database not ready, skipping operation');
      return null;
    }
    
    try {
      return await operation();
    } catch (error) {
      console.log('[SessionManager] Database operation failed:', error);
      return null;
    }
  }
}

export const sessionManager = SessionManager.getInstance(); 
