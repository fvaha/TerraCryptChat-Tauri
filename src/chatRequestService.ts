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
    const response = await fetch("https://dev.v1.terracrypt.cc/api/v1/friends/request/accept", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        request_id: requestId
      })
    });

    if (!response.ok) {
      throw new Error("Failed to accept friend request");
    }
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
}

export async function declineFriendRequest(token: string, requestId: string): Promise<void> {
  try {
    const response = await fetch("https://dev.v1.terracrypt.cc/api/v1/friends/request/decline", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        request_id: requestId
      })
    });

    if (!response.ok) {
      throw new Error("Failed to decline friend request");
    }
  } catch (error) {
    console.error("Error declining friend request:", error);
    throw error;
  }
}