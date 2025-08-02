use reqwest;
use serde_json;
use tauri::State;
use std::collections::HashMap;
use std::sync::Mutex;
use crate::database_async::{self as db_async};
use crate::modules::participant::sync_participants_with_api_token;

// ======== CHAT STRUCTURES ========
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ParticipantSimple {
    pub user_id: String,
    pub is_admin: bool,
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

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Chat {
    pub chat_id: String,
    pub name: String,
    pub created_at: i64,
    pub creator_id: String,
    pub is_group: bool,
    pub participants: Vec<String>,
    pub unread_count: i32,
}

#[derive(serde::Deserialize)]
struct ChatListResponse {
    pub data: Vec<ApiChat>,
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

#[tauri::command]
pub async fn create_chat(
    token: String,
    name: String,
    is_group: bool,
    members: Vec<ParticipantSimple>,
) -> Result<String, String> {
    println!("Creating chat with name: {}", name);
    println!("Members count: {}", members.len());
    println!("Is group: {}", is_group);
    
    let client = reqwest::Client::new();
    
    // Prepare the request body
    let request_body = serde_json::json!({
        "name": name,
        "is_group": is_group,
        "members": members.iter().map(|m| {
            serde_json::json!({
                "user_id": m.user_id,
                "is_admin": m.is_admin
            })
        }).collect::<Vec<_>>()
    });
    
    println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/chats")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Create chat response status: {}", status);
    println!("Create chat response body: {}", text);

    if status.is_success() {
        // Parse the response to get the chat_id
        let response: CreateChatResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse response: {e}"))?;
        
        println!("Successfully created chat with ID: {}", response.chat_id);
        Ok(response.chat_id)
    } else {
        println!("Failed to create chat with status: {}", status);
        Err(format!("Failed to create chat: {} - {}", status, text))
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
        let chat_list_response: ChatListResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let mut chats = Vec::new();
        for api_chat in chat_list_response.data {
            let chat = Chat {
                chat_id: api_chat.chat_id,
                name: api_chat.name.unwrap_or_else(|| "Unnamed Chat".to_string()),
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
        
        println!("Successfully retrieved {} chats", chats.len());
        Ok(chats)
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
        name: db_chat.name.unwrap_or_else(|| "Unnamed Chat".to_string()),
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
            name: Some(chat.name.clone()),
            created_at: chat.created_at,
            creator_id: Some(chat.creator_id.clone()),
            is_group: chat.is_group,
            participants: Some(serde_json::to_string(&chat.participants).unwrap_or_default()),
            unread_count: chat.unread_count,
            group_name: None,
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
pub async fn chats_delta_update(_token: String) -> Result<Vec<Chat>, String> {
    println!("Performing chats delta update");
    // For now, just return cached chats
    // In the future, this could implement proper delta sync
    get_cached_chats_only().await
}

#[tauri::command]
pub async fn get_cached_chats_for_current_user() -> Result<Vec<Chat>, String> {
    println!("Getting cached chats for current user");
    get_cached_chats_only().await
}

#[tauri::command]
pub async fn delete_chat_from_database(chat_id: String) -> Result<(), String> {
    println!("Deleting chat from database: {}", chat_id);
    
    // First clear participants for this chat
    if let Err(e) = crate::modules::participant::clear_cached_participants(chat_id.clone()).await {
        println!("Failed to clear participants: {}", e);
    }
    
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
pub async fn leave_chat_with_token(token: String, chat_id: String) -> Result<(), String> {
    println!("Leaving chat: {}", chat_id);
    
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/leave", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Leave chat response status: {}", status);
    println!("Leave chat response body: {}", text);

    if status.is_success() {
        println!("Successfully left chat {}", chat_id);
        
        // Remove from database
        if let Err(e) = db_async::delete_chat(&chat_id).await {
            println!("Failed to delete chat from database: {}", e);
        }
        
        // Clear participants
        if let Err(e) = crate::modules::participant::clear_cached_participants(chat_id.clone()).await {
            println!("Failed to clear participants: {}", e);
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
async fn generate_and_save_chat_name(_token: String, chat_id: String) -> Result<(), String> {
    println!("Generating chat name for chat: {}", chat_id);
    
    // Get the chat from database
    let chat = db_async::get_chat_by_id(&chat_id).await
        .map_err(|e| format!("Database error: {e}"))?;
    
    if let Some(mut chat) = chat {
        let is_group = chat.is_group;
        
        if is_group {
            // For group chats, use the existing name or generate one
            let group_name = chat.group_name.as_ref().unwrap_or(&"Group Chat".to_string()).clone();
            if group_name != "Group Chat" {
                // Name is already set, no need to change
                return Ok(());
            }
            
            // Get participants to generate group name
            let participants = db_async::get_participants_for_chat(&chat_id).await
                .map_err(|e| format!("Database error: {e}"))?;
            
            if participants.len() > 2 {
                // Generate group name from participants
                let participant_names: Vec<String> = participants
                    .iter()
                    .take(3) // Take first 3 participants
                    .map(|p| p.username.clone())
                    .collect();
                
                let group_name = format!("{} and {} others", 
                    participant_names.join(", "), 
                    participants.len() - 3);
                
                // Update chat name in database
                chat.group_name = Some(group_name.clone());
                chat.name = Some(group_name.clone());
                
                if let Err(e) = db_async::insert_or_update_chat(&chat).await {
                    println!("Failed to update group chat name: {}", e);
                } else {
                    println!("Updated group chat name to: {}", group_name);
                }
            }
        } else {
            // For direct chats, get the other participant's name
            let participants = db_async::get_participants_for_chat(&chat_id).await
                .map_err(|e| format!("Database error: {e}"))?;
            
            if participants.len() == 2 {
                // For direct chats, we need to identify which participant is the current user
                // and use the other participant's username as the chat name
                // We'll get the current user ID from the database (like the session manager does)
                let current_user = db_async::get_most_recent_user().await
                    .map_err(|e| format!("Database error: {e}"))?;
                
                if let Some(current_user) = current_user {
                    let current_user_id = current_user.user_id;
                    
                    // Find the other participant (not the current user)
                    let other_participant = participants.iter()
                        .find(|p| p.user_id != current_user_id);
                    
                    if let Some(other_participant) = other_participant {
                        let chat_name = other_participant.username.clone();
                        
                        // Update chat name in database
                        chat.name = Some(chat_name.clone());
                        
                        if let Err(e) = db_async::insert_or_update_chat(&chat).await {
                            println!("Failed to update direct chat name: {}", e);
                        } else {
                            println!("Updated direct chat name to: {}", chat_name);
                        }
                    } else {
                        println!("Could not find other participant for direct chat");
                    }
                } else {
                    println!("Could not get current user from database");
                }
            }
        }
    }
    
    Ok(())
}