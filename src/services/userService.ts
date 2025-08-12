import { databaseServiceAsync } from './databaseServiceAsync';
import { nativeApiService } from '../api/nativeApiService';

interface DatabaseUser {
  user_id: string;
  username: string;
  name?: string;
  email: string;
  picture?: string;
  role?: string;
  verified?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_dark_mode?: boolean;
  last_seen?: number;
}

export interface User {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  role: string;
  verified: boolean;
  isDarkMode?: boolean;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  lastSeen?: number;
}

export class UserService {
  private static instance: UserService;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // Convert database user to frontend user
  private convertDbUserToUser(dbUser: DatabaseUser): User {
    return {
      id: dbUser.user_id,
      userId: dbUser.user_id,
      username: dbUser.username,
      name: dbUser.name || '',
      email: dbUser.email || '',
      picture: dbUser.picture,
      role: dbUser.role || 'user',
      verified: dbUser.verified || false,
      isDarkMode: dbUser.is_dark_mode || false,
      createdAt: typeof dbUser.created_at === 'string' ? Date.parse(dbUser.created_at) : Date.now(),
      updatedAt: typeof dbUser.updated_at === 'string' ? Date.parse(dbUser.updated_at) : Date.now(),
      deletedAt: dbUser.deleted_at ? Date.parse(dbUser.deleted_at) : undefined,
      lastSeen: Date.now(), // Not available in User interface, use current time
    };
  }

  // Convert frontend user to database user
  private convertUserToDbUser(user: User): DatabaseUser {
    return {
      user_id: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
      verified: user.verified,
      created_at: (user.createdAt || Date.now()).toString(),
      updated_at: (user.updatedAt || Date.now()).toString(),
      deleted_at: user.deletedAt?.toString(),
      is_dark_mode: user.isDarkMode || false,
      last_seen: Date.now(),
    };
  }

  // Get user by ID
  async get_user_by_id(user_id: string): Promise<DatabaseUser | null> {
    try {
      const user = await databaseServiceAsync.get_user_by_id(user_id);
      return user;
    } catch (error) {
      console.error('[UserService] Failed to get user by ID:', error);
      return null;
    }
  }

  // Update user token
  async update_user_token(user_id: string, token: string): Promise<void> {
    try {
      await databaseServiceAsync.update_user_token(user_id, token);
    } catch (error) {
      console.error('[UserService] Failed to update user token:', error);
      throw error;
    }
  }

  // Update dark mode preference
  async update_dark_mode(user_id: string, is_dark_mode: boolean): Promise<void> {
    try {
      // Note: update_dark_mode method doesn't exist in DatabaseServiceAsync,
      // so we'll use the native API service instead
      await nativeApiService.update_dark_mode(user_id, is_dark_mode);
    } catch (error) {
      console.error('[UserService] Failed to update dark mode:', error);
      throw error;
    }
  }

  // Get dark mode preference
  async get_dark_mode(user_id: string): Promise<boolean> {
    try {
      // Note: get_dark_mode method doesn't exist in DatabaseServiceAsync,
      // so we'll use the native API service instead
      return await nativeApiService.get_dark_mode(user_id);
    } catch (error) {
      console.error('[UserService] Failed to get dark mode:', error);
      return false;
    }
  }

  // Update color scheme
  async update_color_scheme(user_id: string, color_scheme: string): Promise<void> {
    try {
      await databaseServiceAsync.update_color_scheme(user_id, color_scheme);
    } catch (error) {
      console.error('[UserService] Failed to update color scheme:', error);
      throw error;
    }
  }

  // Get color scheme
  async get_color_scheme(user_id: string): Promise<string> {
    try {
      const color_scheme = await databaseServiceAsync.get_color_scheme(user_id);
      return color_scheme || 'default';
    } catch (error) {
      console.error('[UserService] Failed to get color scheme:', error);
      return 'default';
    }
  }

  // Get most recent user
  async get_most_recent_user(): Promise<DatabaseUser | null> {
    try {
      const user = await databaseServiceAsync.get_most_recent_user();
      return user;
    } catch (error) {
      console.error('[UserService] Failed to get most recent user:', error);
      return null;
    }
  }

  // Clear user data
  async clearUserData(): Promise<void> {
    try {
      await databaseServiceAsync.clearUserData();
      console.log('[UserService] User data cleared successfully');
    } catch (error) {
      console.error('[UserService] Failed to clear user data:', error);
      throw error;
    }
  }
}

export const userService = UserService.getInstance();
