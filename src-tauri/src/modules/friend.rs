use reqwest;
use serde_json;
use tauri::State;
use std::collections::HashMap;
use std::sync::Mutex;
use crate::database_async::{self as db_async};
use crate::modules::auth::get_current_user_with_token;

// ======== FRIEND STRUCTURES ========
#[derive(serde::Serialize, serde::Deserialize)]
pub struct Friend {
    pub user_id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub picture: Option<String>,
    pub is_favorite: Option<bool>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct FriendRequest {
    pub request_id: String,
    pub receiver_id: String,
    pub status: String,
    pub created_at: Option<String>,
    pub sender: Friend,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Participant {
    pub user_id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub picture: Option<String>,
    pub is_admin: bool,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ParticipantResponse {
    pub data: Vec<Participant>,
}

// ======== FRIEND COMMANDS ========
#[tauri::command]
pub async fn get_friends(state: State<'_, Mutex<HashMap<String, String>>>) -> Result<Vec<Friend>, String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };
    
    get_friends_with_token(token).await
}

#[tauri::command]
pub async fn get_friends_with_token(token: String) -> Result<Vec<Friend>, String> {
    println!("Getting friends with token");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/friends")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get friends response status: {}", status);
    println!("Get friends response body: {}", text);

    if status.is_success() {
        // The Kotlin API returns a direct array of friends, not wrapped in a data field
        let friends: Vec<Friend> = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Successfully retrieved {} friends", friends.len());
        Ok(friends)
    } else {
        println!("Failed to get friends with status: {}", status);
        Err(format!("Failed to get friends: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_friend_requests_with_token(token: String) -> Result<Vec<FriendRequest>, String> {
    println!("Getting friend requests with token");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/friends/requests")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get friend requests response status: {}", status);
    println!("Get friend requests response body: {}", text);

    if status.is_success() {
        // Try to parse as direct array first (fallback)
        let friend_requests: Vec<FriendRequest> = if text.trim().starts_with('[') {
            serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON array response: {e}"))?
        } else {
            // Try with data wrapper
            #[derive(serde::Deserialize)]
            struct FriendRequestsResponse {
                data: Vec<FriendRequest>,
            }
            
            let friend_requests_response: FriendRequestsResponse = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON response: {e}"))?;
            friend_requests_response.data
        };
        
        println!("Successfully retrieved {} friend requests", friend_requests.len());
        Ok(friend_requests)
    } else {
        println!("Failed to get friend requests with status: {}", status);
        Err(format!("Failed to get friend requests: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_chat_members_with_token(token: String, chat_id: String) -> Result<Vec<Participant>, String> {
    println!("Getting participants with token for chat: {}", chat_id);
    
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/members", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get participants response status: {}", status);
    println!("Get participants response body: {}", text);

    if status.is_success() {
        let participants_response: ParticipantResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Successfully retrieved {} participants", participants_response.data.len());
        Ok(participants_response.data)
    } else {
        println!("Failed to get participants with status: {}", status);
        Err(format!("Failed to get participants: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn send_friend_request(token: String, receiver_id: String) -> Result<(), String> {
    println!("Sending friend request to user: {}", receiver_id);
    
    // First, get the current user's ID from the token
    let current_user = get_current_user_with_token(token.clone()).await
        .map_err(|e| format!("Failed to get current user: {}", e))?;
    
    let sender_id = current_user.user_id;
    println!("Sender ID: {}, Receiver ID: {}", sender_id, receiver_id);
    
    let client = reqwest::Client::new();
    
    // Create the request payload
    #[derive(serde::Serialize)]
    struct FriendRequestPayload {
        receiver_id: String,
        sender_id: String,
    }
    
    let payload = FriendRequestPayload {
        receiver_id: receiver_id.clone(),
        sender_id: sender_id.clone(),
    };
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/friends/request")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Send friend request response status: {}", status);
    println!("Send friend request response body: {}", text);

    if status.is_success() {
        println!("Successfully sent friend request");
        Ok(())
    } else {
        println!("Failed to send friend request with status: {}", status);
        Err(format!("Failed to send friend request: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn accept_friend_request(token: String, user_id: String) -> Result<(), String> {
    println!("Accepting friend request from user: {}", user_id);
    
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("https://dev.v1.terracrypt.cc/api/v1/friends/requests/{}/accept", user_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Accept friend request response status: {}", status);
    println!("Accept friend request response body: {}", text);

    if status.is_success() {
        println!("Successfully accepted friend request");
        Ok(())
    } else {
        println!("Failed to accept friend request with status: {}", status);
        Err(format!("Failed to accept friend request: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn decline_friend_request(token: String, user_id: String) -> Result<(), String> {
    println!("Declining friend request from user: {}", user_id);
    
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("https://dev.v1.terracrypt.cc/api/v1/friends/requests/{}/decline", user_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Decline friend request response status: {}", status);
    println!("Decline friend request response body: {}", text);

    if status.is_success() {
        println!("Successfully declined friend request");
        Ok(())
    } else {
        println!("Failed to decline friend request with status: {}", status);
        Err(format!("Failed to decline friend request: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_cached_friends_only() -> Result<Vec<Friend>, String> {
    println!("Getting cached friends only");
    
    let friends = db_async::get_all_friends().await
        .map_err(|e| format!("Database error: {e}"))?;
    
    let converted_friends: Vec<Friend> = friends.into_iter().map(|db_friend| Friend {
        user_id: db_friend.user_id,
        username: db_friend.username,
        name: db_friend.name,
        email: db_friend.email,
        picture: db_friend.picture,
        is_favorite: Some(db_friend.is_favorite),
    }).collect();
    
    println!("Retrieved {} cached friends", converted_friends.len());
    Ok(converted_friends)
}

#[tauri::command]
pub async fn fetch_all_friends_and_save(token: String) -> Result<Vec<Friend>, String> {
    println!("Fetching all friends and saving to database");
    
    let friends = get_friends_with_token(token).await?;
    
    for friend in &friends {
        let db_friend = db_async::Friend {
            user_id: friend.user_id.clone(),
            username: friend.username.clone(),
            name: friend.name.clone(),
            email: friend.email.clone(),
            picture: friend.picture.clone(),
            is_favorite: friend.is_favorite.unwrap_or(false),
            created_at: Some(chrono::Utc::now().timestamp()),
            updated_at: Some(chrono::Utc::now().timestamp()),
            status: Some(String::new()),
        };
        
        if let Err(e) = db_async::insert_or_update_friend(&db_friend).await {
            println!("Failed to save friend {}: {}", friend.user_id, e);
        }
    }
    
    println!("Successfully fetched and saved {} friends", friends.len());
    Ok(friends)
}

#[tauri::command]
pub async fn get_cached_friends_with_delta(state: State<'_, Mutex<HashMap<String, String>>>) -> Result<Vec<Friend>, String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };
    
    println!("Getting cached friends with delta update");
    
    // First get cached friends
    let cached_friends = get_cached_friends_only().await?;
    
    // Then try to fetch fresh data
    match get_friends_with_token(token).await {
        Ok(fresh_friends) => {
            println!("Successfully updated friends from server");
            Ok(fresh_friends)
        }
        Err(e) => {
            println!("Failed to fetch fresh friends, using cached: {}", e);
            Ok(cached_friends)
        }
    }
}



#[tauri::command]
pub async fn friends_delta_update(_token: String) -> Result<Vec<Friend>, String> {
    println!("Performing friends delta update");
    // For now, just return cached friends
    // In the future, this could implement proper delta sync
    get_cached_friends_only().await
}

#[tauri::command]
pub async fn get_cached_friends_for_current_user() -> Result<Vec<Friend>, String> {
    println!("Getting cached friends for current user");
    get_cached_friends_only().await
}

#[tauri::command]
pub async fn delete_friend_from_database(user_id: String) -> Result<(), String> {
    println!("Deleting friend from database: {}", user_id);
    
    db_async::delete_friend(&user_id).await
        .map_err(|e| format!("Database error: {e}"))
} 