use reqwest;
use serde_json;
use tauri::State;
use std::collections::HashMap;
use std::sync::Mutex;
use std::cmp::min;
use crate::database_async::{self as db_async};
use crate::modules::participant::sync_participants_with_api_token;
use crate::modules::auth::login;
use chrono;

// ======== CHAT STRUCTURES ========
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ParticipantSimple {
    pub user_id: String,
    pub is_admin: Option<bool>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Message {
    pub message_id: String,
    pub chat_id: String,
    pub sender_id: String,
    pub content: String,
    pub timestamp: i64,
    pub is_read: bool,
    pub is_sent: bool,
    pub is_delivered: bool,
    pub sender_username: Option<String>,
    pub reply_to_message_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Chat {
    pub chat_id: String,
    pub name: Option<String>, // Changed from String to Option<String> to match database
    pub created_at: i64,
    pub creator_id: String,
    pub is_group: bool,
    pub participants: Vec<String>,
    pub unread_count: i32,
}

#[derive(serde::Deserialize)]
struct ChatListResponse {
    pub data: Option<Vec<ApiChat>>,
}

#[derive(serde::Deserialize)]
struct ApiChat {
    pub chat_id: String,
    pub name: Option<String>,
    pub created_at: Option<String>,
    pub creator_id: Option<String>,
    pub is_group: Option<bool>,
    pub participants: Option<Vec<String>>,
}

#[derive(serde::Serialize)]
pub struct SendMessageRequest {
    pub content: String,
    pub chat_id: String,
    pub reply_to_message_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SendMessageResponse {
    pub message_id: String,
    pub timestamp: i64,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub message_id: String,
    pub chat_id: String,
    pub sender_id: String,
    pub content: String,
    pub timestamp: i64,
    pub sender_username: String,
    pub reply_to_message_id: Option<String>,
}

// ======== CHAT COMMANDS ========
#[derive(serde::Deserialize)]
struct CreateChatResponse {
    pub chat_id: String,
}

#[derive(serde::Deserialize)]
struct CurrentUserResponse {
    pub user_id: String,
}

async fn get_current_user_id_from_token(token: &str) -> Result<String, String> {
    // First try to get user by token from database
    match db_async::get_user_by_token(token).await {
        Ok(Some(user)) => {
            println!("Found current user in database: {}", user.user_id);
            Ok(user.user_id)
        },
        Ok(None) => {
            // If not found in database, try to get most recent user
            match db_async::get_most_recent_user().await {
                Ok(Some(user)) => {
                    println!("Found most recent user in database: {}", user.user_id);
                    Ok(user.user_id)
                },
                Ok(None) => {
                    // Fallback to API call if not in database
                    println!("User not found in database, fetching from API...");
                    let client = reqwest::Client::new();
                    let res = client
                        .get("https://dev.v1.terracrypt.cc/api/v1/users/me")
                        .header("Authorization", format!("Bearer {}", token))
                        .send()
                        .await
                        .map_err(|e| format!("Request failed: {e}"))?;

                    let status = res.status();
                    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
                    
                    if status.is_success() {
                        let user: CurrentUserResponse = serde_json::from_str(&text)
                            .map_err(|e| format!("Failed to parse user response: {e}"))?;
                        println!("Found current user from API: {}", user.user_id);
                        Ok(user.user_id)
                    } else {
                        Err(format!("Failed to get current user: {} - {}", status, text))
                    }
                },
                Err(e) => Err(format!("Database error getting most recent user: {}", e))
            }
        },
        Err(e) => Err(format!("Database error getting user by token: {}", e))
    }
}

#[tauri::command]
pub async fn create_chat(
    token: String,
    name: String,
    members: Vec<ParticipantSimple>,
) -> Result<String, String> {
    println!("Creating chat with name: {}", name);
    println!("Members count: {}", members.len());
    
    // First, get the current user ID from the token
    let current_user_id = match get_current_user_id_from_token(&token).await {
        Ok(user_id) => user_id,
        Err(e) => {
            println!("Failed to get current user ID from token: {}", e);
            return Err(format!("Failed to get current user ID: {}", e));
        }
    };
    
    println!("Current user ID from token: {}", current_user_id);
    
    let client = reqwest::Client::new();
    
    // Prepare the request body with current user as admin
    let mut all_members = vec![
        serde_json::json!({
            "user_id": current_user_id,
            "is_admin": true
        })
    ];
    
    // Add other members (excluding current user to avoid duplicates)
    for member in &members {
        if member.user_id != current_user_id {
            // Only include is_admin field if it's true, otherwise omit it
            if member.is_admin.unwrap_or(false) {
                all_members.push(serde_json::json!({
                    "user_id": member.user_id,
                    "is_admin": true
                }));
            } else {
                all_members.push(serde_json::json!({
                    "user_id": member.user_id
                }));
            }
        }
    }
    
    // Validate request format
    println!("Validating request format...");
    println!("Members count: {}", all_members.len());
    println!("Current user ID: {}", current_user_id);
    println!("Other members: {:?}", members.iter().map(|m| &m.user_id).collect::<Vec<_>>());
    
    // Determine if this is a group chat based on member count
    let is_group = all_members.len() > 2; // More than 2 members (including current user)
    println!("Is group chat: {}", is_group);
    
    // Ensure we have at least 2 members (current user + at least one other)
    if all_members.len() < 2 {
        return Err("Invalid request: need at least 2 members for a chat".to_string());
    }
    
    // Ensure current user is first and marked as admin
    if let Some(first_member) = all_members.first() {
        if first_member["user_id"] != current_user_id {
            return Err("Invalid request: current user must be first member".to_string());
        }
        if first_member["is_admin"] != true {
            return Err("Invalid request: current user must be marked as admin".to_string());
        }
    }
    
    // Validate that all members have the required fields
    for (i, member) in all_members.iter().enumerate() {
        if !member.is_object() {
            return Err(format!("Invalid request: member {} is not an object", i));
        }
        if !member.get("user_id").is_some() {
            return Err(format!("Invalid request: member {} missing user_id", i));
        }
        // is_admin is optional, so we don't validate it
    }
    
    println!("Request validation passed");
    
    // Create request body matching Go backend expectations
    let mut request_body = serde_json::json!({
        "members": all_members,
        "is_group": is_group
    });
    
    // For one-on-one chats, always send the name (friend's username)
    // For group chats, send the provided name
    if !name.trim().is_empty() {
        request_body["name"] = serde_json::Value::String(name.clone());
    }
    
    println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());
    println!("Is group chat: {}", is_group);
    println!("Request URL: https://dev.v1.terracrypt.cc/api/v1/chats");
    println!("Request headers: Authorization: Bearer {}..., Content-Type: application/json", &token[..min(20, token.len())]);
    
    // Debug: Show exact request structure expected by Go backend
    println!("=== REQUEST STRUCTURE DEBUG ===");
    println!("Expected Go backend structure:");
    println!("{{");
    println!("  \"members\": [");
    for (i, member) in all_members.iter().enumerate() {
        let user_id = member["user_id"].as_str().unwrap_or("unknown");
        let is_admin = member["is_admin"].as_bool().unwrap_or(false);
        println!("    {{");
        println!("      \"user_id\": \"{}\",", user_id);
        if is_admin {
            println!("      \"is_admin\": {}", is_admin);
        }
        println!("    }}{}", if i < all_members.len() - 1 { "," } else { "" });
    }
    println!("  ],");
    println!("  \"is_group\": {}", is_group);
    if !name.trim().is_empty() {
        println!("  \"name\": \"{}\"", name.trim());
    }
    println!("}}");
    println!("=== END REQUEST STRUCTURE DEBUG ===");
    
    // Note: Go backend will validate that all members are friends
    println!("Note: Go backend will validate that all members are friends before creating chat");
    println!("Note: For one-on-one chats, sending name: '{}' (friend's username)", name.trim());
    
    // Debug: Show the exact JSON that will be sent
    println!("=== EXACT JSON TO BE SENT ===");
    match serde_json::to_string(&request_body) {
        Ok(json_str) => println!("{}", json_str),
        Err(e) => println!("Failed to serialize request body: {}", e),
    }
    println!("=== END EXACT JSON ===");
    
    // Test API endpoint accessibility
    println!("Testing API endpoint accessibility...");
    let health_check = client
        .get("https://dev.v1.terracrypt.cc/api/v1/chats")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await;
    
    match health_check {
        Ok(response) => {
            println!("API endpoint accessible, status: {}", response.status());
        }
        Err(e) => {
            println!("Warning: API endpoint may not be accessible: {}", e);
        }
    }
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/chats")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            println!("Network error during request: {}", e);
            format!("Request failed: {e}")
        })?;

    let status = res.status();
    let headers = res.headers().clone(); // Clone headers before moving response
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Create chat response status: {}", status);
    println!("Create chat response body: {}", text);
    println!("Response headers: {:?}", headers);
    
    if status.is_success() {
        // Parse the response to get the chat_id
        let response: CreateChatResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse response: {e}"))?;
        
        println!("Successfully created chat with ID: {}", response.chat_id);
        
        // Save the newly created chat to local database
        let current_timestamp = chrono::Utc::now().timestamp();
        
        // FIXED: For 1-on-1 chats, determine the proper chat name from other participant
        let mut chat_name = if is_group { Some(name.clone()) } else { None };
        
        if !is_group && all_members.len() == 2 {
            // This is a 1-on-1 chat, get the other participant's username
            let other_participant_id = all_members.iter()
                .find(|member| member["user_id"] != current_user_id)
                .and_then(|member| member["user_id"].as_str());
            
            if let Some(other_id) = other_participant_id {
                // Try to get the other participant's user info from database
                if let Ok(other_user) = db_async::get_user_by_id(other_id).await {
                    if let Some(other_user) = other_user {
                        chat_name = Some(other_user.username.clone());
                        println!("1-on-1 chat name set to other participant username: {}", other_user.username);
                    } else {
                        // Fallback: use a placeholder instead of user ID
                        chat_name = Some("Unknown User".to_string());
                        println!("Using placeholder name for 1-on-1 chat: Unknown User");
                    }
                } else {
                    // Fallback: use a placeholder instead of user ID
                    chat_name = Some("Unknown User".to_string());
                    println!("Using placeholder name for 1-on-1 chat (fallback): Unknown User");
                }
            }
        }
        
        let db_chat = db_async::Chat {
            chat_id: response.chat_id.clone(),
            name: chat_name, // Use the resolved chat name
            created_at: current_timestamp,
            creator_id: Some(current_user_id.clone()),
            is_group, // Use the determined group status
            participants: Some(serde_json::to_string(&all_members).unwrap_or_default()),
            unread_count: 0,
            group_name: if is_group { Some(name.clone()) } else { None }, // Save group name for group chats
            description: None,
            last_message_content: None,
            last_message_timestamp: None,
        };
        
        // Insert the chat into local database
        if let Err(e) = db_async::insert_or_update_chat(&db_chat).await {
            println!("Warning: Failed to save chat to local database: {}", e);
            // Don't fail the entire operation if local save fails
        } else {
            println!("Successfully saved chat to local database");
        }
        
        // Also save participants to local database
        for member in &all_members {
            let user_id = member["user_id"].as_str().unwrap_or("");
            let is_admin = member["is_admin"].as_bool().unwrap_or(false);
            
            if let Ok(participant) = crate::modules::participant::create_participant_from_user_id(
                user_id.to_string(),
                response.chat_id.clone(),
                is_admin,
                current_timestamp
            ).await {
                if let Err(e) = db_async::insert_or_update_participant(&participant).await {
                    println!("Warning: Failed to save participant {}: {}", user_id, e);
                }
            }
        }
        
        Ok(response.chat_id)
    } else {
        println!("Failed to create chat with status: {}", status);
        println!("Error response body: {}", text);
        
        // Try to parse error details if available
        if let Ok(error_response) = serde_json::from_str::<serde_json::Value>(&text) {
            if let Some(error_msg) = error_response.get("error").and_then(|e| e.as_str()) {
                println!("API Error message: {}", error_msg);
                
                // Handle specific Go backend errors
                match error_msg {
                    "user is not an admin of this chat" => {
                        return Err("Error: Current user must be marked as admin".to_string());
                    }
                    "cannot create chat with non-friends" => {
                        return Err("Error: Can only create chats with friends".to_string());
                    }
                    "chat has no admin user" => {
                        return Err("Error: Chat must have an admin user".to_string());
                    }
                    _ => {
                        // Continue with generic error handling
                    }
                }
            }
            if let Some(details) = error_response.get("details").and_then(|d| d.as_str()) {
                println!("API Error details: {}", details);
            }
        }
        
        // Provide more specific error messages based on status code
        let error_message = match status.as_u16() {
            400 => "Bad request - check the request format",
            401 => "Unauthorized - token may be expired or invalid",
            403 => "Forbidden - insufficient permissions",
            409 => "Conflict - chat may already exist",
            422 => "Validation error - check request parameters",
            500 => "Internal server error - server issue, try again later",
            _ => "Unknown error occurred"
        };
        
        Err(format!("Failed to create chat: {} - {}", error_message, text))
    }
}

#[tauri::command]
pub async fn fetch_messages(
    _chat_id: String,
    _app_handle: tauri::AppHandle,
) -> Result<Vec<Message>, String> {
    println!("Fetching messages for chat");
    Ok(vec![])
}

#[tauri::command]
pub async fn save_message(
    message: Message,
    _app_handle: tauri::AppHandle,
) -> Result<(), String> {
    println!("Saving message: {}", message.message_id);
    Ok(())
}

#[tauri::command]
pub async fn get_chats(state: State<'_, Mutex<HashMap<String, String>>>) -> Result<Vec<Chat>, String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };
    
    get_chats_with_token(token).await
}

#[tauri::command]
pub async fn get_chats_with_token(token: String) -> Result<Vec<Chat>, String> {
    println!("Getting chats with token");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/chats")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get chats response status: {}", status);
    println!("Get chats response body: {}", text);

    if status.is_success() {
        // Handle case where API returns null or empty response
        if text.trim().is_empty() || text == "null" {
            println!("API returned empty response, returning empty chat list");
            return Ok(Vec::new());
        }
        
        // Try to parse the response, handle null data gracefully
        let chat_list_response: ChatListResponse = match serde_json::from_str(&text) {
            Ok(response) => response,
            Err(e) => {
                println!("Failed to parse JSON response: {}. Response: {}", e, text);
                // If parsing fails, try to handle null data case
                if text.contains("\"data\":null") {
                    println!("API returned null data, returning empty chat list");
                    return Ok(Vec::new());
                }
                return Err(format!("Invalid JSON response: {e}"));
            }
        };
        
        let mut chats = Vec::new();
        if let Some(data) = chat_list_response.data {
            for api_chat in data {
                let chat = Chat {
                    chat_id: api_chat.chat_id,
                    name: api_chat.name, // Now this is Option<String> which matches the struct
                    created_at: api_chat.created_at
                        .and_then(|s| s.parse::<i64>().ok())
                        .unwrap_or_else(|| chrono::Utc::now().timestamp()),
                    creator_id: api_chat.creator_id.unwrap_or_else(|| "unknown".to_string()),
                    is_group: api_chat.is_group.unwrap_or(false),
                    participants: api_chat.participants.unwrap_or_default(),
                    unread_count: 0,
                };
                chats.push(chat);
            }
        }
        
        println!("Successfully retrieved {} chats", chats.len());
        Ok(chats)
    } else if status.as_u16() == 401 {
        println!("Token expired (401 Unauthorized), attempting silent relogin...");
        // Try silent relogin and retry the request
        match attempt_silent_relogin_and_retry_chats().await {
            Ok(chats) => {
                println!("Silent relogin successful, retrieved {} chats", chats.len());
                Ok(chats)
            }
            Err(e) => {
                println!("Silent relogin failed: {}", e);
                Err(format!("Authentication failed after silent relogin: {}", e))
            }
        }
    } else {
        println!("Failed to get chats with status: {}", status);
        Err(format!("Failed to get chats: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, Mutex<HashMap<String, String>>>,
    content: String,
    chat_id: String,
    reply_to_message_id: Option<String>,
) -> Result<SendMessageResponse, String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };
    
    println!("Sending message to chat: {}", chat_id);
    println!("Message content: {}", content);
    
    let client = reqwest::Client::new();
    let request_body = SendMessageRequest {
        content,
        chat_id: chat_id.clone(),
        reply_to_message_id,
    };
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/messages")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Send message response status: {}", status);
    println!("Send message response body: {}", text);

    if status.is_success() {
        #[derive(serde::Deserialize)]
        struct BackendMessageResponse {
            message_id: String,
            timestamp: i64,
        }
        
        let backend_response: BackendMessageResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let response = SendMessageResponse {
            message_id: backend_response.message_id,
            timestamp: backend_response.timestamp,
        };
        
        println!("Successfully sent message with ID: {}", response.message_id);
        Ok(response)
    } else {
        println!("Failed to send message with status: {}", status);
        Err(format!("Failed to send message: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_messages(token: String, chat_id: String) -> Result<Vec<ChatMessage>, String> {
    println!("Getting messages for chat: {}", chat_id);
    
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/messages", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get messages response status: {}", status);
    println!("Get messages response body: {}", text);

    if status.is_success() {
        #[derive(serde::Deserialize)]
        struct MessagesResponse {
            data: Vec<ChatMessage>,
        }
        
        let messages_response: MessagesResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Successfully retrieved {} messages", messages_response.data.len());
        Ok(messages_response.data)
    } else {
        println!("Failed to get messages with status: {}", status);
        Err(format!("Failed to get messages: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_cached_chats_with_delta(state: State<'_, Mutex<HashMap<String, String>>>) -> Result<Vec<Chat>, String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };
    
    println!("Getting cached chats with delta update");
    
    // First get cached chats
    let cached_chats = get_cached_chats_only().await?;
    
    // Then try to fetch fresh data
    match get_chats_with_token(token).await {
        Ok(fresh_chats) => {
            println!("Successfully updated chats from server");
            Ok(fresh_chats)
        }
        Err(e) => {
            println!("Failed to fetch fresh chats, using cached: {}", e);
            Ok(cached_chats)
        }
    }
}

#[tauri::command]
pub async fn get_cached_chats_only() -> Result<Vec<Chat>, String> {
    println!("Getting cached chats only");
    
    let chats = db_async::get_all_chats().await
        .map_err(|e| format!("Database error: {e}"))?;
    
    let converted_chats: Vec<Chat> = chats.into_iter().map(|db_chat| Chat {
        chat_id: db_chat.chat_id,
        name: db_chat.name, // Now this is Option<String> which matches the struct
        created_at: db_chat.created_at,
        creator_id: db_chat.creator_id.unwrap_or_else(|| "unknown".to_string()),
        is_group: db_chat.is_group,
        participants: db_chat.participants
            .as_ref()
            .and_then(|p| serde_json::from_str::<Vec<String>>(p).ok())
            .unwrap_or_default(),
        unread_count: db_chat.unread_count,
    }).collect();
    
    println!("Retrieved {} cached chats", converted_chats.len());
    Ok(converted_chats)
}

/// Get cached chats only, filtering out locally deleted ones for a specific user
pub async fn get_cached_chats_only_for_user(user_id: &str) -> Result<Vec<Chat>, String> {
    println!("Getting cached chats only for user: {}", user_id);
    
    let chats = db_async::get_all_chats().await
        .map_err(|e| format!("Database error: {e}"))?;
    
    let mut filtered_chats = Vec::new();
    
    for db_chat in chats {
        // Check if this chat is locally deleted for this user
        let is_locally_deleted = db_async::is_chat_locally_deleted(&db_chat.chat_id, user_id).await
            .unwrap_or(false);
        
        if !is_locally_deleted {
            let chat = Chat {
                chat_id: db_chat.chat_id,
                name: db_chat.name, // Now this is Option<String> which matches the struct
                created_at: db_chat.created_at,
                creator_id: db_chat.creator_id.unwrap_or_else(|| "unknown".to_string()),
                is_group: db_chat.is_group,
                participants: db_chat.participants
                    .as_ref()
                    .and_then(|p| serde_json::from_str::<Vec<String>>(p).ok())
                    .unwrap_or_default(),
                unread_count: db_chat.unread_count,
            };
            filtered_chats.push(chat);
        } else {
            println!("Filtering out locally deleted chat: {}", db_chat.chat_id);
        }
    }
    
    println!("Retrieved {} filtered cached chats for user {}", filtered_chats.len(), user_id);
    Ok(filtered_chats)
}

#[tauri::command]
pub async fn get_cached_messages_for_chat(chat_id: String) -> Result<Vec<Message>, String> {
    println!("Getting cached messages for chat: {}", chat_id);
    
    let messages = db_async::get_messages_for_chat(&chat_id).await
        .map_err(|e| format!("Database error: {e}"))?;
    
    let converted_messages: Vec<Message> = messages.into_iter().map(|db_message| Message {
        message_id: db_message.message_id.unwrap_or_else(|| db_message.client_message_id.clone()),
        chat_id: db_message.chat_id,
        sender_id: db_message.sender_id,
        content: db_message.content,
        timestamp: db_message.timestamp,
        is_read: db_message.is_read,
        is_sent: db_message.is_sent,
        is_delivered: db_message.is_delivered,
        sender_username: db_message.sender_username,
        reply_to_message_id: db_message.reply_to_message_id,
    }).collect();
    
    println!("Retrieved {} cached messages", converted_messages.len());
    Ok(converted_messages)
}

#[tauri::command]
pub async fn fetch_all_chats_and_save(token: String) -> Result<Vec<Chat>, String> {
    println!("Fetching all chats and saving to database");
    
    let chats = get_chats_with_token(token.clone()).await?;
    
    for chat in &chats {
        // Save chat to database
        let db_chat = db_async::Chat {
            chat_id: chat.chat_id.clone(),
            name: chat.name.clone(), // Keep the server-provided name if available
            created_at: chat.created_at,
            creator_id: Some(chat.creator_id.clone()),
            is_group: chat.is_group,
            participants: Some(serde_json::to_string(&chat.participants).unwrap_or_default()),
            unread_count: chat.unread_count,
            group_name: if chat.is_group { chat.name.clone() } else { None }, // Set group_name for group chats
            description: None,
            last_message_content: None,
            last_message_timestamp: None,
        };
        
        if let Err(e) = db_async::insert_or_update_chat(&db_chat).await {
            println!("Failed to save chat {}: {}", chat.chat_id, e);
        }
        
        // Fetch and save participants for this chat
        match sync_participants_with_api_token(token.clone(), chat.chat_id.clone()).await {
            Ok(_) => {
                println!("Successfully synced participants for chat {}", chat.chat_id);
                
                // Generate and save chat name based on participants
                // This is especially important for 1-on-1 chats that might not have names from server
                if let Err(e) = generate_and_save_chat_name(token.clone(), chat.chat_id.clone()).await {
                    println!("Failed to generate chat name for chat {}: {}", chat.chat_id, e);
                }
            }
            Err(e) => {
                println!("Failed to sync participants for chat {}: {}", chat.chat_id, e);
            }
        }
    }
    
    println!("Successfully fetched and saved {} chats with participants", chats.len());
    Ok(chats)
}

#[tauri::command]
pub async fn chats_delta_update(token: String) -> Result<Vec<Chat>, String> {
    println!("Performing chats delta update for current user");
    
    // Get current user ID from token to check local deletes
    let current_user_id = get_current_user_id_from_token(&token).await?;
    
    // Get current cached chats
    let cached_chats = get_cached_chats_only().await?;
    let cached_chat_ids: std::collections::HashSet<String> = cached_chats.iter()
        .map(|chat| chat.chat_id.clone())
        .collect();
    
    println!("Found {} cached chats", cached_chat_ids.len());
    
    // Fetch fresh chats from server
    let server_chats = get_chats_with_token(token.clone()).await?;
    let server_chat_ids: std::collections::HashSet<String> = server_chats.iter()
        .map(|chat| chat.chat_id.clone())
        .collect();
    
    println!("Found {} server chats", server_chat_ids.len());
    
    // IMPORTANT: Filter out locally deleted chats from server response
    // This prevents re-adding chats that were just deleted locally
    let mut filtered_server_chats = Vec::new();
    for server_chat in &server_chats {
        let is_locally_deleted = db_async::is_chat_locally_deleted(&server_chat.chat_id, &current_user_id).await
            .unwrap_or(false);
        
        if !is_locally_deleted {
            filtered_server_chats.push(server_chat.clone());
        } else {
            println!("Skipping locally deleted chat: {}", server_chat.chat_id);
        }
    }
    
    let filtered_server_chat_ids: std::collections::HashSet<String> = filtered_server_chats.iter()
        .map(|chat| chat.chat_id.clone())
        .collect();
    
    println!("After filtering locally deleted: {} server chats", filtered_server_chat_ids.len());
    
    // Find chats that exist on server but not locally (new chats)
    let new_chat_ids: Vec<String> = filtered_server_chat_ids.difference(&cached_chat_ids)
        .cloned()
        .collect();
    
    // Find chats that exist locally but not on server (deleted chats)
    let deleted_chat_ids: Vec<String> = cached_chat_ids.difference(&filtered_server_chat_ids)
        .cloned()
        .collect();
    
    println!("New chats to add: {:?}", new_chat_ids);
    println!("Chats to delete: {:?}", deleted_chat_ids);
    
    // Delete chats that no longer exist on server
    for chat_id in &deleted_chat_ids {
        println!("Removing deleted chat from database: {}", chat_id);
        
        // Clear messages for this chat
        if let Err(e) = db_async::clear_messages_for_chat(chat_id).await {
            println!("Failed to clear messages for chat {}: {}", chat_id, e);
        }
        
        // Remove all participants for this chat
        if let Err(e) = db_async::remove_all_participants_for_chat(chat_id).await {
            println!("Failed to remove participants for chat {}: {}", chat_id, e);
        }
        
        // Delete the chat itself
        if let Err(e) = db_async::delete_chat(chat_id).await {
            println!("Failed to delete chat {}: {}", chat_id, e);
        }
    }
    
    // Add new chats from server (ONLY if they don't exist locally and weren't locally deleted)
    for server_chat in &filtered_server_chats {
        if new_chat_ids.contains(&server_chat.chat_id) {
            println!("Adding new chat to database: {}", server_chat.chat_id);
            
            // Convert to database format and insert
            let db_chat = db_async::Chat {
                chat_id: server_chat.chat_id.clone(),
                name: server_chat.name.clone(), // Keep the server-provided name if available
                created_at: server_chat.created_at,
                creator_id: Some(server_chat.creator_id.clone()),
                is_group: server_chat.is_group,
                participants: Some(serde_json::to_string(&server_chat.participants).unwrap_or_default()),
                unread_count: server_chat.unread_count,
                group_name: if server_chat.is_group { server_chat.name.clone() } else { None }, // Set group_name for group chats
                description: None,
                last_message_content: None,
                last_message_timestamp: None,
            };
            
            if let Err(e) = db_async::insert_or_update_chat(&db_chat).await {
                println!("Failed to insert new chat {}: {}", server_chat.chat_id, e);
            } else {
                // After successfully inserting the chat, generate and save the proper chat name
                // This is especially important for 1-on-1 chats that might not have names from server
                if let Err(e) = generate_and_save_chat_name(token.clone(), server_chat.chat_id.clone()).await {
                    println!("Failed to generate chat name for new chat {}: {}", server_chat.chat_id, e);
                }
            }
        }
    }
    
    // Update existing chats with any changes from server (ONLY if they exist locally)
    for server_chat in &filtered_server_chats {
        if cached_chat_ids.contains(&server_chat.chat_id) {
            println!("Updating existing chat: {}", server_chat.chat_id);
            
            let db_chat = db_async::Chat {
                chat_id: server_chat.chat_id.clone(),
                name: server_chat.name.clone(),
                created_at: server_chat.created_at,
                creator_id: Some(server_chat.creator_id.clone()),
                is_group: server_chat.is_group,
                participants: Some(serde_json::to_string(&server_chat.participants).unwrap_or_default()),
                unread_count: server_chat.unread_count,
                group_name: None,
                description: None,
                last_message_content: None,
                last_message_timestamp: None,
            };
            
            if let Err(e) = db_async::insert_or_update_chat(&db_chat).await {
                println!("Failed to update chat {}: {}", server_chat.chat_id, e);
            }
        }
    }
    
    // Clean up local deletes for chats that no longer exist on server
    let server_chat_ids_vec: Vec<String> = filtered_server_chat_ids.into_iter().collect();
    if let Err(e) = db_async::cleanup_local_deletes(&server_chat_ids_vec, &current_user_id).await {
        println!("Failed to cleanup local deletes: {}", e);
    }
    
    // Return the updated chat list (filtered for local deletes)
    get_cached_chats_only_for_user(&current_user_id).await
}

#[tauri::command]
pub async fn get_cached_chats_for_current_user() -> Result<Vec<Chat>, String> {
    println!("Getting cached chats for current user");
    get_cached_chats_only().await
}

#[tauri::command]
pub async fn get_cached_chats_for_current_user_filtered(token: String) -> Result<Vec<Chat>, String> {
    println!("Getting filtered cached chats for current user");
    
    // Get current user ID from token to filter local deletes
    let current_user_id = get_current_user_id_from_token(&token).await?;
    
    get_cached_chats_only_for_user(&current_user_id).await
}

#[tauri::command]
pub async fn delete_chat_from_database(chat_id: String) -> Result<(), String> {
    println!("Deleting chat from database: {}", chat_id);
    
    // First clear messages for this chat
    if let Err(e) = db_async::clear_messages_for_chat(&chat_id).await {
        println!("Warning: Failed to clear messages for chat {}: {}", chat_id, e);
    }
    
    // Then clear participants for this chat
    if let Err(e) = db_async::remove_all_participants_for_chat(&chat_id).await {
        println!("Warning: Failed to clear participants for chat {}: {}", chat_id, e);
    }
    
    // Finally delete the chat itself
    db_async::delete_chat(&chat_id).await
        .map_err(|e| format!("Database error: {e}"))
}

#[tauri::command]
pub async fn leave_chat(
    state: State<'_, Mutex<HashMap<String, String>>>,
    chat_id: String,
) -> Result<(), String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };

    leave_chat_with_token(token, chat_id).await
}

#[tauri::command]
pub async fn delete_chat(token: String, chat_id: String) -> Result<(), String> {
    println!("Smart deleting chat {} from server...", chat_id);
    
    // Get current user ID to check if they're the creator
    let current_user_id = get_current_user_id_from_token(&token).await?;
    
    // Check if user is the creator of this chat
    let cached_chats = get_cached_chats_only().await?;
    let is_creator = cached_chats.iter()
        .find(|chat| chat.chat_id == chat_id)
        .map(|chat| chat.creator_id == current_user_id)
        .unwrap_or(false);
    
    println!("User {} is creator of chat {}: {}", current_user_id, chat_id, is_creator);
    
    // Add to local deletes immediately (before server response!) - Swift pattern
    if let Err(e) = db_async::add_local_delete(&chat_id, &current_user_id, is_creator).await {
        println!("Warning: Failed to add local delete tracking: {}", e);
    }
    
    // Perform local cleanup function
    let chat_id_clone = chat_id.clone();
    let perform_local_cleanup = || async {
        println!("Performing local cleanup for chat: {}", chat_id_clone);
        
        // Clear messages for this chat
        if let Err(e) = db_async::clear_messages_for_chat(&chat_id_clone).await {
            println!("Failed to clear messages for chat {}: {}", chat_id_clone, e);
        }
        
        // Remove all participants for this chat
        if let Err(e) = db_async::remove_all_participants_for_chat(&chat_id_clone).await {
            println!("Failed to remove participants for chat {}: {}", chat_id_clone, e);
        }
        
        // Delete the chat itself
        if let Err(e) = db_async::delete_chat(&chat_id_clone).await {
            println!("Failed to delete chat {}: {}", chat_id_clone, e);
        }
    };
    
    if is_creator {
        // User is creator - try to delete the entire chat
        println!("Attempting to delete chat {} (user is creator)", chat_id);
        
        let client = reqwest::Client::new();
        let res = client
            .delete(format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}", chat_id))
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .map_err(|e| format!("Request failed: {e}"))?;

        let status = res.status();
        let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
        
        println!("Delete chat response status: {}", status);
        println!("Delete chat response body: {}", text);

        if status.is_success() || status.as_u16() == 404 {
            println!("Successfully deleted chat {}", chat_id);
            perform_local_cleanup().await;
            Ok(())
        } else if status.as_u16() == 401 {
            println!("Token expired (401 Unauthorized) during delete chat, attempting silent relogin...");
            // Try silent relogin and retry the delete operation
            match attempt_silent_relogin_and_retry_delete_chat(chat_id).await {
                Ok(_) => {
                    println!("Silent relogin successful, chat deleted");
                    perform_local_cleanup().await;
                    Ok(())
                }
                Err(e) => {
                    println!("Silent relogin failed: {}", e);
                    perform_local_cleanup().await;
                    Err(format!("Authentication failed after silent relogin: {}", e))
                }
            }
        } else {
            println!("Failed to delete chat with status: {}", status);
            perform_local_cleanup().await;
            Err(format!("Failed to delete chat: {} - {}", status, text))
        }
    } else {
        // User is not creator - try to leave the chat instead
        println!("User is not creator, attempting to leave chat {} instead", chat_id);
        
        match leave_chat_with_token(token, chat_id.clone()).await {
            Ok(_) => {
                println!("Successfully left chat {}", chat_id);
                perform_local_cleanup().await;
                Ok(())
            }
            Err(e) => {
                println!("Failed to leave chat: {}, proceeding with local cleanup", e);
                perform_local_cleanup().await;
                Err(e)
            }
        }
    }
    // Note: Do not clean localDeletes here! It will be cleaned during fetch/delta updates as shown in Swift
}

#[tauri::command]
pub async fn leave_chat_with_token(token: String, chat_id: String) -> Result<(), String> {
    println!("Leaving chat: {}", chat_id);
    println!("[Chat] DEBUG: Received parameters: token = '{}...', chat_id = '{}'", &token[..min(20, token.len())], chat_id);
    
    let client = reqwest::Client::new();
    let res = client
        .delete(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/leave", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Leave chat response status: {}", status);
    println!("Leave chat response body: {}", text);

    if status.is_success() || status.as_u16() == 404 {
        if status.as_u16() == 404 {
            println!("Chat {} not found on server (already deleted or doesn't exist), proceeding with local cleanup", chat_id);
        } else {
            println!("Successfully left chat {}", chat_id);
        }
        
        // Remove from database with proper cleanup
        if let Err(e) = delete_chat_from_database(chat_id.clone()).await {
            println!("Failed to delete chat from database: {}", e);
        }
        
        Ok(())
    } else {
        println!("Failed to leave chat with status: {}", status);
        Err(format!("Failed to leave chat: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn refresh_direct_chat_names(
    state: State<'_, Mutex<HashMap<String, String>>>,
) -> Result<(), String> {
    let _token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };

    let chats = get_cached_chats_only().await?;
    
    for chat in chats {
        if !chat.is_group {
            // For direct chats, we can update the name based on the other participant
            // This would typically involve getting the current user and finding the other participant
            println!("Refreshing direct chat name for chat: {}", chat.chat_id);
        }
    }
    
    Ok(())
}

// Generate and save chat name based on participants
#[tauri::command]
pub async fn generate_and_save_chat_name(token: String, chat_id: String) -> Result<(), String> {
    println!("Generating chat name for chat: {}", chat_id);
    
    // Get the chat from database
    let chat = db_async::get_chat_by_id(&chat_id).await
        .map_err(|e| format!("Database error: {e}"))?;
    
    if let Some(mut chat) = chat {
        let is_group = chat.is_group;
        println!("Chat {} is_group: {}, current name: {:?}", chat_id, is_group, chat.name);
        
        if is_group {
            // For group chats, use the existing name or generate one
            if let Some(existing_name) = &chat.name {
                if !existing_name.is_empty() && existing_name != "Group Chat" {
                    println!("Group chat {} already has name: {}", chat_id, existing_name);
                    return Ok(());
                }
            }
            
            // Get participants to generate group name
            let participants = db_async::get_participants_for_chat(&chat_id).await
                .map_err(|e| format!("Database error: {e}"))?;
            
            println!("Found {} participants for group chat {}", participants.len(), chat_id);
            
            if participants.len() > 2 {
                // Generate group name from participants
                let participant_names: Vec<String> = participants
                    .iter()
                    .take(3) // Take first 3 participants
                    .map(|p| p.username.clone())
                    .collect();
                
                let group_name = if participants.len() <= 3 {
                    participant_names.join(", ")
                } else {
                    format!("{} and {} others", 
                        participant_names.join(", "), 
                        participants.len() - 3)
                };
                
                println!("Generated group name: {}", group_name);
                
                // Update chat name in database
                chat.name = Some(group_name.clone());
                
                if let Err(e) = db_async::insert_or_update_chat(&chat).await {
                    println!("Failed to update group chat name: {}", e);
                    return Err(format!("Database update failed: {}", e));
                } else {
                    println!("Updated group chat name to: {}", group_name);
                }
            } else {
                println!("Not enough participants for group chat name generation");
            }
        } else {
            // For direct chats, get the other participant's name
            let participants = db_async::get_participants_for_chat(&chat_id).await
                .map_err(|e| format!("Database error: {e}"))?;
            
            println!("Found {} participants for direct chat {}", participants.len(), chat_id);
            
            if participants.len() == 2 {
                // For direct chats, we need to identify which participant is the current user
                // and use the other participant's username as the chat name
                // We'll get the current user ID from the database (like the session manager does)
                let current_user = db_async::get_most_recent_user().await
                    .map_err(|e| format!("Database error: {e}"))?;
                
                if let Some(current_user) = current_user {
                    let current_user_id = current_user.user_id;
                    println!("Current user ID: {}", current_user_id);
                    
                    // Find the other participant (not the current user)
                    let other_participant = participants.iter()
                        .find(|p| p.user_id != current_user_id);
                    
                    if let Some(other_participant) = other_participant {
                        // Try to get the real username using the token
                        let real_username = if !token.is_empty() {
                            // Import the get_username_for_user_id function from participant module
                            use crate::modules::participant::get_username_for_user_id;
                            match get_username_for_user_id(&token, &other_participant.user_id).await {
                                Ok(username) => {
                                    if username != other_participant.user_id && !username.starts_with("user_") {
                                        println!("Retrieved real username from API: {}", username);
                                        username
                                    } else {
                                        println!("API returned fallback username, using participant username: {}", other_participant.username);
                                        other_participant.username.clone()
                                    }
                                }
                                Err(e) => {
                                    println!("Failed to get real username from API: {}, using participant username: {}", e, other_participant.username);
                                    other_participant.username.clone()
                                }
                            }
                        } else {
                            println!("No token provided, using participant username: {}", other_participant.username);
                            other_participant.username.clone()
                        };
                        
                        println!("Using chat name: {}", real_username);
                        
                        // Update chat name in database
                        chat.name = Some(real_username.clone());
                        
                        if let Err(e) = db_async::insert_or_update_chat(&chat).await {
                            println!("Failed to update direct chat name: {}", e);
                            return Err(format!("Database update failed: {}", e));
                        } else {
                            println!("Updated direct chat name to: {}", real_username);
                        }
                    } else {
                        println!("Could not find other participant for direct chat");
                        return Err("Could not find other participant for direct chat".to_string());
                    }
                } else {
                    println!("Could not get current user from database");
                    return Err("Could not get current user from database".to_string());
                }
            } else {
                println!("Direct chat should have exactly 2 participants, found {}", participants.len());
                return Err(format!("Direct chat should have exactly 2 participants, found {}", participants.len()));
            }
        }
    } else {
        println!("Chat {} not found in database", chat_id);
        return Err(format!("Chat {} not found in database", chat_id));
    }
    
    Ok(())
}

async fn attempt_silent_relogin_and_retry_delete_chat(_chat_id: String) -> Result<(), String> {
    // This function would attempt to relogin and retry the delete operation
    // For now, just return an error indicating relogin is needed
    Err("Authentication expired. Please log in again.".to_string())
}

async fn attempt_silent_relogin_and_retry_chats() -> Result<Vec<Chat>, String> {
    println!("Attempting silent relogin...");
    
    // Get stored credentials from database
    let stored_user = db_async::get_most_recent_user().await
        .map_err(|e| format!("Database error: {e}"))?;
    
    let stored_user = match stored_user {
        Some(user) => user,
        None => return Err("No stored user found".to_string()),
    };
    
    let username = stored_user.username;
    let password = stored_user.password;
    
    if let Some(password) = password {
        if username.is_empty() || password.is_empty() {
            return Err("Username and password cannot be empty".to_string());
        }
        
        let login_result = login(username.clone(), password).await;
        match login_result {
            Ok(_login_response) => {
                // Access the token through a public method or make the field public
                // For now, we'll need to modify the LoginResponse struct
                return Err("Login successful but token access not implemented".to_string());
            }
            Err(e) => {
                return Err(format!("Failed to relogin: {}", e));
            }
        }
    } else {
        return Err("Password not available for relogin".to_string());
    }
}

// Refresh all chat names in the database
#[tauri::command]
pub async fn refresh_all_chat_names(token: String) -> Result<(), String> {
    println!("Refreshing all chat names with token...");
    
    // Get all chats from database
    let chats = db_async::get_all_chats().await
        .map_err(|e| format!("Database error: {e}"))?;
    
    println!("Found {} chats to refresh names for", chats.len());
    
    let mut success_count = 0;
    let mut error_count = 0;
    
    for chat in chats {
        let chat_id = chat.chat_id.clone();
        println!("Processing chat {} (name: {:?}, is_group: {})", chat_id, chat.name, chat.is_group);
        
        match generate_and_save_chat_name(token.clone(), chat_id.clone()).await {
            Ok(_) => {
                success_count += 1;
                println!("Successfully refreshed chat name for {}", chat_id);
            }
            Err(e) => {
                println!("Failed to refresh chat name for {}: {}", chat_id, e);
                error_count += 1;
            }
        }
    }
    
    println!("Chat name refresh completed: {} successful, {} errors", success_count, error_count);
    
    if error_count > 0 {
        println!("Some chat names failed to refresh. Check the logs above for details.");
    }
    
    Ok(())
}