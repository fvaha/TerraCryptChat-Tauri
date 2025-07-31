import { invoke } from "@tauri-apps/api/core";
import { databaseServiceAsync, User } from './databaseServiceAsync';

export interface UserEntity {
  id: string;
  userId: string;
  username: string;
  name?: string;
  email?: string;
  password?: string;
  picture?: string;
  avatarUrl?: string;
  role?: string;
  tokenHash?: string;
  verified: boolean;
  isDarkMode?: boolean;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  lastSeen?: number;
  lastLogin?: Date;
}

export class UserService {
  async insertUser(user: UserEntity): Promise<void> {
    try {
      const dbUser: User = {
        user_id: user.userId,
        username: user.username,
        email: user.email,
        name: user.name,
        password: user.password,
        picture: user.picture,
        role: user.role,
        token_hash: user.tokenHash,
        verified: user.verified,
        created_at: user.createdAt || Date.now(),
        updated_at: user.updatedAt || Date.now(),
        deleted_at: user.deletedAt,
        is_dark_mode: user.isDarkMode || false,
        last_seen: user.lastSeen || Date.now(),
      };

      await databaseServiceAsync.insertUser(dbUser);
      console.log(`[UserService] User inserted successfully: ${user.username}`);
    } catch (error) {
      console.error(`[UserService] Failed to insert user:`, error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserEntity | null> {
    try {
      const user = await databaseServiceAsync.getUserById(userId);
      if (!user) return null;

      return {
        id: user.user_id,
        userId: user.user_id,
        username: user.username,
        name: user.name,
        email: user.email,
        password: user.password,
        picture: user.picture,
        role: user.role,
        tokenHash: user.token_hash,
        verified: user.verified,
        isDarkMode: user.is_dark_mode,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        deletedAt: user.deleted_at,
        lastSeen: user.last_seen,
      };
    } catch (error) {
      console.error(`[UserService] Failed to get user by ID:`, error);
      return null;
    }
  }

  async getUserByToken(token: string): Promise<UserEntity | null> {
    try {
      const user = await databaseServiceAsync.getUserByToken(token);
      if (!user) return null;

      return {
        id: user.user_id,
        userId: user.user_id,
        username: user.username,
        name: user.name,
        email: user.email,
        password: user.password,
        picture: user.picture,
        role: user.role,
        tokenHash: user.token_hash,
        verified: user.verified,
        isDarkMode: user.is_dark_mode,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        deletedAt: user.deleted_at,
        lastSeen: user.last_seen,
      };
    } catch (error) {
      console.error(`[UserService] Failed to get user by token:`, error);
      return null;
    }
  }

  async updateUserToken(userId: string, token: string): Promise<void> {
    try {
      await databaseServiceAsync.updateUserToken(userId, token);
      console.log(`[UserService] User token updated successfully: ${userId}`);
    } catch (error) {
      console.error(`[UserService] Failed to update user token:`, error);
      throw error;
    }
  }

  async getMostRecentUser(): Promise<UserEntity | null> {
    try {
      const user = await databaseServiceAsync.getMostRecentUser();
      if (!user) return null;

      return {
        id: user.user_id,
        userId: user.user_id,
        username: user.username,
        name: user.name,
        email: user.email,
        password: user.password,
        picture: user.picture,
        role: user.role,
        tokenHash: user.token_hash,
        verified: user.verified,
        isDarkMode: user.is_dark_mode,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        deletedAt: user.deleted_at,
        lastSeen: user.last_seen,
      };
    } catch (error) {
      console.error(`[UserService] Failed to get most recent user:`, error);
      return null;
    }
  }
}

export const userService = new UserService();
