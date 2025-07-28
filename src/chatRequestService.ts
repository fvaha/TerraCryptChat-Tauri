import { invoke } from "@tauri-apps/api/core";
import { nativeApiService } from "./nativeApiService";

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

export async function sendFriendRequest(token: string, userId: string): Promise<void> {
  await invoke("send_friend_request", {
    token,
    userId
  });
}

export async function getFriendRequests(token: string): Promise<FriendRequest[]> {
  try {
    nativeApiService.setToken(token);
    return await nativeApiService.getFriendRequests();
  } catch (error) {
    console.error("Failed to get friend requests:", error);
    return [];
  }
}

export async function acceptFriendRequest(token: string, requestId: string): Promise<void> {
  try {
    await invoke("accept_friend_request", {
      token,
      request_id: requestId
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
}

export async function declineFriendRequest(token: string, requestId: string): Promise<void> {
  try {
    await invoke("decline_friend_request", {
      token,
      request_id: requestId
    });
  } catch (error) {
    console.error("Error declining friend request:", error);
    throw error;
  }
}