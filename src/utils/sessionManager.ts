import { nativeApiService } from '../api/nativeApiService';
import { invoke } from '@tauri-apps/api/core';

export interface SessionState {
  isLoggedIn: boolean;
  isSessionInitialized: boolean;
  currentUser: any | null;
  isDarkModeEnabled: boolean;
}

export class SessionManager {
  private currentUser: any = null;
  private token: string | null = null;
  private isInitialized = false;
  private isDarkModeEnabled = false;
  private stateListeners: ((state: SessionState) => void)[] = [];

  // State management
  getState(): SessionState {
    return {
      isLoggedIn: this.isLoggedIn(),
      isSessionInitialized: this.isInitialized,
      currentUser: this.currentUser,
      isDarkModeEnabled: this.isDarkModeEnabled
    };
  }

  onStateChange(listener: (state: SessionState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  private emitStateChange(): void {
    const state = this.getState();
    this.stateListeners.forEach(listener => listener(state));
  }

  async initializeSession(): Promise<boolean> {
    try {
      console.log('🔄 Initializing session...');
      
      // Ensure database is initialized
      try {
        console.log('🔄 Ensuring database is initialized...');
        await invoke('db_ensure_initialized');
        console.log('✅ Database initialization completed');
      } catch (initError) {
        console.error('❌ Failed to initialize database:', initError);
        // Continue anyway, the database might already be initialized
      }
      
      // Database-first approach like Kotlin app
      const cachedUser = await invoke<any>('db_get_most_recent_user');
      console.log('Cached user from database:', cachedUser ? 'Found' : 'None');
      
      if (cachedUser && cachedUser.token_hash) {
        // Check if token is expired (like Kotlin app)
        if (this.isTokenExpired(cachedUser.token_hash)) {
          console.log('Token is expired, attempting silent relogin...');
          // Try silent relogin with stored credentials
          const success = await this.attemptSilentRelogin();
          if (!success) {
            console.log('Silent relogin failed, resetting database and logging out');
            // Reset database on failed session restoration
            try {
              await invoke('db_clear_all_data');
              console.log('✅ Database cleared after failed session restoration');
            } catch (resetError) {
              console.error('❌ Failed to clear database after session restoration error:', resetError);
            }
            await this.logOut();
            this.isInitialized = true;
            this.emitStateChange();
            return false;
          }
        } else {
          // Token is valid, restore session
          await this.updateTokenAndState(cachedUser.token_hash, cachedUser);
          
          // Data is already stored locally in SQLite database
          console.log('Using locally stored data from SQLite database');
        }
      } else {
        console.log('No cached user found, starting fresh');
        await this.logOut();
      }

      this.isInitialized = true;
      this.emitStateChange();
      return this.isLoggedIn();
    } catch (error) {
      console.error('Session initialization failed:', error);
      this.isInitialized = true;
      this.emitStateChange();
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
      
      console.log(`Token exp: ${exp}, now: ${now}`);
      return exp <= now;
    } catch (error) {
      console.error('Failed to parse token:', error);
      return true;
    }
  }

  private async attemptSilentRelogin(): Promise<boolean> {
    try {
      // Get stored credentials from database
      const storedCredentials = await invoke<any>('db_get_most_recent_user');
      if (!storedCredentials?.username || !storedCredentials?.password) {
        return false;
      }

      // Attempt login with stored credentials
      const loginResult = await invoke('login', { 
        username: storedCredentials.username, 
        password: storedCredentials.password 
      });
      
      if (loginResult && typeof loginResult === 'object' && 'access_token' in loginResult) {
        const token = (loginResult as any).access_token;
        await this.handleSuccessfulLogin(token, storedCredentials.username, storedCredentials.password);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Silent relogin failed:', error);
      return false;
    }
  }

  private async updateTokenAndState(token: string, user: any) {
    console.log('🔄 Updating token and state...');
    this.token = token;
    this.currentUser = user;
    
    // Connect WebSocket after successful login
    try {
      console.log('🔄 Connecting WebSocket...');
      await invoke('connect_socket', { token });
      console.log('✅ WebSocket connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      // Don't fail the login if WebSocket fails
    }
    
    this.emitStateChange();
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Attempting login for user:', username);
      
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
        const token = (loginResult as any).access_token;
        await this.handleSuccessfulLogin(token, username.trim(), password);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid login response' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      // Clear database on failed login to ensure clean state
      try {
        console.log('🔄 Clearing database due to failed login...');
        await invoke('db_clear_all_data');
        console.log('✅ Database cleared after failed login');
      } catch (clearError) {
        console.error('❌ Failed to clear database after login error:', clearError);
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

  public async handleSuccessfulLogin(accessToken: string, username?: string, password?: string): Promise<void> {
    try {
      console.log('🔄 Handling successful login with token:', accessToken.substring(0, 20) + '...');
      
      // Set token in native API service
      nativeApiService.setToken(accessToken);

      console.log('🔄 Fetching user data from API...');
      console.log('Token being used:', accessToken.substring(0, 20) + '...');
      
      // Get user data using the API call (like Kotlin version)
      const userData = await invoke<any>('get_current_user_with_token', { 
        token: accessToken
      });
      
      if (userData) {
        console.log('✅ User data received:', userData);
        
        // Save user to database with token_hash (like Kotlin/Swift)
        console.log('🔄 Saving user to database...');
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
        
        console.log('🔄 User object to save:', userForDb);
        
        try {
          console.log('🔄 Attempting to save user to database...');
          await invoke('db_insert_user', { user: userForDb });
          console.log('✅ User saved to database successfully');
          
          // Verify the user was saved by trying to retrieve it
          try {
            console.log('🔄 Verifying user was saved...');
            const savedUser = await invoke('db_get_user_by_id', { user_id: userForDb.user_id });
            console.log('✅ User verification successful:', savedUser);
          } catch (verifyError) {
            console.error('❌ User verification failed:', verifyError);
          }
        } catch (dbError) {
          console.error('❌ Failed to save user to database:', dbError);
          throw dbError;
        }
        
        this.currentUser = {
          ...userData,
          tokenHash: accessToken,
          accessToken: accessToken,
          id: userData.user_id,
          userId: userData.user_id
        };
        
        // Set the token in the session manager
        this.token = accessToken;
        
        // Connect WebSocket after successful login
        try {
          console.log('🔄 Connecting WebSocket...');
          await invoke('connect_socket', { token: accessToken });
          console.log('✅ WebSocket connected successfully');
        } catch (error) {
          console.error('❌ Failed to connect WebSocket:', error);
          // Don't fail the login if WebSocket fails
        }
        
        console.log('✅ Login process completed successfully');
        
        // Data will be fetched from local SQLite database as needed
        console.log('Using locally stored data from SQLite database');
        
        this.emitStateChange();
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
      console.log('🔄 Starting logout process...');
      
      // Clear token from native API service
      nativeApiService.clearToken();
      
      this.token = null;
      this.currentUser = null;
      
      console.log('✅ Logout completed successfully');
      this.emitStateChange();
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  }

  getCurrentUser(): any {
    return this.currentUser;
  }

  getToken(): string | null {
    return this.token;
  }

  isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser;
  }

  async refreshToken(): Promise<boolean> {
    try {
      // Get current user from database (like Kotlin/Swift)
      const currentUser = await invoke<any>('db_get_most_recent_user');
      if (currentUser && currentUser.token_hash) {
        this.token = currentUser.token_hash;
        
        // Set token in native API service
        nativeApiService.setToken(currentUser.token_hash);
        
        this.currentUser = {
          ...currentUser,
          tokenHash: currentUser.token_hash,
          accessToken: currentUser.token_hash,
          id: currentUser.user_id,
          userId: currentUser.user_id
        };
        this.emitStateChange();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }

  // Additional methods for compatibility
  async logIn(): Promise<void> {
    // This method is called by the app context
    if (this.isLoggedIn()) {
      return;
    } else {
      await this.logout();
    }
  }

  async logOut(): Promise<void> {
    console.log('🔄 Public logout called, clearing database...');
    try {
      await invoke('db_clear_all_data');
      console.log('✅ Database cleared during logout');
    } catch (error) {
      console.error('❌ Failed to clear database during logout:', error);
    }
    await this.logout();
  }

  getCurrentUsername(): string {
    return this.currentUser?.username || "Unknown";
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.user_id || null;
  }

  async toggleDarkMode(): Promise<void> {
    this.isDarkModeEnabled = !this.isDarkModeEnabled;
    this.emitStateChange();
  }

  // Cleanup
  destroy(): void {
    this.stateListeners = [];
  }
}

export const sessionManager = new SessionManager(); 