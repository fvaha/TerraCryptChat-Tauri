import { databaseService, User } from './databaseService';
import { UserEntity } from "./models";

export async function insertOrUpdateUser(user: UserEntity) {
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
    created_at: user.createdAt ?? 0,
    updated_at: user.updatedAt ?? 0,
    deleted_at: user.deletedAt,
    is_dark_mode: user.isDarkMode ?? false,
    last_seen: user.lastSeen ?? 0
  };
  await databaseService.insertUser(dbUser);
}

export async function fetchUserById(userId: string): Promise<UserEntity | null> {
  const user = await databaseService.getUserById(userId);
  if (!user) return null;
  
  return {
    id: user.user_id,
    userId: user.user_id,
    username: user.username,
    email: user.email,
    name: user.name,
    password: user.password,
    picture: user.picture,
    role: user.role,
    tokenHash: user.token_hash,
    verified: user.verified,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    deletedAt: user.deleted_at,
    isDarkMode: user.is_dark_mode,
    lastSeen: user.last_seen
  };
}

export async function getCurrentUser(token: string): Promise<UserEntity> {
  const user = await databaseService.getUserByToken(token);
  if (!user) throw new Error("User not found");
  
  return {
    id: user.user_id,
    userId: user.user_id,
    username: user.username,
    email: user.email,
    name: user.name,
    password: user.password,
    picture: user.picture,
    role: user.role,
    tokenHash: user.token_hash,
    verified: user.verified,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    deletedAt: user.deleted_at,
    isDarkMode: user.is_dark_mode,
    lastSeen: user.last_seen
  };
}

// Add other user service methods as needed...
