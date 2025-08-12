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

export async function send_friend_request(userId: string): Promise<void> {
  try {
    const response = await apiService.send_friend_request(userId);
    console.log('Friend request sent successfully:', response);
  } catch (error) {
    console.error('Failed to send friend request:', error);
    throw error;
  }
}

export async function get_friend_requests(): Promise<FriendRequest[]> {
  try {
    const response = await apiService.get_friend_requests();
    return response || [];
  } catch (error) {
    console.error('Failed to get friend requests:', error);
    return [];
  }
}

export async function accept_friend_request(requestId: string): Promise<void> {
  try {
    const response = await apiService.accept_friend_request(requestId);
    console.log('Friend request accepted successfully:', response);
  } catch (error) {
    console.error('Failed to accept friend request:', error);
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
