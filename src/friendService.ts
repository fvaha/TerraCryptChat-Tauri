import { databaseService, Friend } from './databaseService';
import { FriendEntity } from "./models";

export async function insertFriend(friend: FriendEntity) {
  const dbFriend: Friend = {
    friend_id: friend.friendId,
    username: friend.username,
    email: friend.email,
    name: friend.name,
    picture: friend.picture,
    created_at: friend.createdAt,
    updated_at: friend.updatedAt,
    status: friend.status,
    is_favorite: friend.isFavorite
  };
  await databaseService.insertFriend(dbFriend);
}

export async function fetchFriends(): Promise<FriendEntity[]> {
  const friends = await databaseService.getAllFriends();
  return friends.map(friend => ({
    friendId: friend.friend_id,
    username: friend.username,
    email: friend.email,
    name: friend.name,
    picture: friend.picture,
    createdAt: friend.created_at,
    updatedAt: friend.updated_at,
    status: friend.status,
    isFavorite: friend.is_favorite
  }));
}