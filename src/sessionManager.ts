import { nativeApiService } from './nativeApiService';
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
      console.log('Initializing session...');
      
      // Database-first approach like Kotlin app - no more in-memory token calls
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
              await invoke('db_reset_database');
              console.log('✅ Database reset after failed session restoration');
            } catch (resetError) {
              console.error('❌ Failed to reset database after session restoration error:', resetError);
            }
            await this.logOut();
            this.isInitialized = true;
            this.emitStateChange();
            return false;
          }
        } else {
          // Token is valid, restore session
          await this.updateTokenAndState(cachedUser.token_hash, cachedUser);
          
          // Fetch fresh data from API
          try {
            console.log('Fetching fresh data after session restoration...');
            await nativeApiService.fetchAllChatsAndSave(cachedUser.token_hash);
            await nativeApiService.fetchAllFriendsAndSave(cachedUser.token_hash);
            console.log('Fresh data fetch completed');
          } catch (error) {
            console.error('Failed to fetch fresh data:', error);
            // Don't fail the session restoration if data fetch fails
          }
        }
      } else {
        console.log('No cached user found, resetting database for clean start');
        // Reset database to ensure clean schema
        await invoke('db_reset_database');
        await this.logOut();
      }

      this.isInitialized = true;
      this.emitStateChange();
      return this.isLoggedIn();
    } catch (error) {
      console.error('Session initialization failed:', error);
      // Reset database on session initialization failure
      try {
        console.log('🔄 Resetting database due to session initialization failure...');
        await invoke('db_reset_database');
        console.log('✅ Database reset completed after session initialization failure');
      } catch (resetError) {
        console.error('❌ Failed to reset database after session initialization error:', resetError);
      }
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
        await this.handleSuccessfulLogin(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Silent relogin failed:', error);
      return false;
    }
  }

  private async updateTokenAndState(token: string, user: any) {
    if (!token || !user) {
      this.logOut();
      return;
    }

    this.token = token;
    this.currentUser = {
      ...user,
      tokenHash: token,
      accessToken: token,
      id: user.user_id,
      userId: user.user_id
    };

    // Set token in native API service
    nativeApiService.setToken(token);
    
    console.log('✅ Session restored successfully - Token:', token.substring(0, 20) + '...', 'User:', user.username);
    this.emitStateChange();
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting login...');
      
      // Use native login command
      const loginResult = await invoke('login', { username, password });
      
      if (loginResult && typeof loginResult === 'object' && 'access_token' in loginResult) {
        const token = (loginResult as any).access_token;
        await this.handleSuccessfulLogin(token, username, password);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid login response' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Reset database on failed login to ensure clean state
      try {
        console.log('🔄 Resetting database due to failed login...');
        await invoke('db_reset_database');
        console.log('✅ Database reset completed after failed login');
      } catch (resetError) {
        console.error('❌ Failed to reset database after login error:', resetError);
      }
      return { success: false, error: 'Login failed: Unknown error' };
    }
  }

  public async handleSuccessfulLogin(accessToken: string, _username?: string, password?: string): Promise<void> {
    try {
      console.log('Handling successful login with token:', accessToken.substring(0, 20) + '...');
      
      // Set token in native API service
      nativeApiService.setToken(accessToken);

      console.log('Fetching user data from native API...');
      console.log('Token being used:', accessToken.substring(0, 20) + '...');
      
      // Get user data using native API with the token we just received
      const userData = await invoke<any>('get_current_user_with_token', { token: accessToken });
      
      if (userData) {
        console.log('User data received:', userData);
        
        // Save user to database with token_hash (like Kotlin/Swift)
        console.log('Saving user to database...');
        const userForDb = {
          user_id: userData.user_id,
          username: userData.username,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          role: null,
          token_hash: accessToken, // Save token in user database like Kotlin/Swift
          verified: userData.verified,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
          is_dark_mode: false,
          last_seen: Date.now(),
          password: password || null // Store password for silent relogin
        };
        
        await invoke('db_insert_user', { user: userForDb });
        
        this.currentUser = {
          ...userData,
          tokenHash: accessToken,
          accessToken: accessToken,
          id: userData.user_id,
          userId: userData.user_id
        };
        
        // Set the token in the session manager
        this.token = accessToken;
        
        console.log('Login process completed successfully');
        
        // Fetch initial data from API and save to database
        try {
          console.log('Fetching initial chats and friends data...');
          await nativeApiService.fetchAllChatsAndSave(accessToken);
          await nativeApiService.fetchAllFriendsAndSave(accessToken);
          console.log('Initial data fetch completed');
        } catch (error) {
          console.error('Failed to fetch initial data:', error);
          // Don't fail the login if data fetch fails
        }
        
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
      
      // Clear all data from database
      await invoke('db_clear_all_data');
      console.log('✅ Database data cleared');
      
      // Reset database with new schema
      await invoke('db_reset_database');
      console.log('✅ Database reset with new schema');
      
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
    console.log('🔄 Public logout called, resetting database...');
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