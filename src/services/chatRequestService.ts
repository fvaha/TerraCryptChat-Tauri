import { invoke } from "@tauri-apps/api/core";

export interface FriendRequest {
  request_id: string;
  receiver_id: string;
  status: string;
  created_at?: string;
  sender: {
    user_id: string;
    username: string;
    name: string;
    email: string;
  };
}

export async function sendFriendRequest(userId: string): Promise<void> {
  await invoke("send_friend_request", {
    userId
  });
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  try {
    // For now, return empty array since we're not storing friend requests locally yet
    console.log("Getting friend requests from local database (not implemented yet)");
    return [];
  } catch (error) {
    console.error("Failed to get friend requests:", error);
    return [];
  }
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  try {
    await invoke("accept_friend_request", {
      request_id: requestId
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  try {
    await invoke("decline_friend_request", {
      request_id: requestId
    });
  } catch (error) {
    console.error("Error declining friend request:", error);
    throw error;
  }
}