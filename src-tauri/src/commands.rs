use reqwest;
use serde_json;
use tauri::{AppHandle, State};
use std::collections::HashMap;
use std::sync::Mutex;
use crate::database::{self, User, Chat as DbChat, Message as DbMessage, Friend as DbFriend, Participant};

// ======== AUTH ========
#[derive(serde::Serialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct LoginResponse {
    pub access_token: String,
}

// Backend response structure
#[derive(serde::Deserialize)]
struct BackendLoginResponse {
    access_token: String,
}

#[tauri::command]
pub async fn login(username: String, password: String) -> Result<LoginResponse, String> {
    println!("Attempting login for username: {}", username);
    println!("Password length: {}", password.len());
    
    let client = reqwest::Client::new();
    let login_data = LoginRequest { username: username.clone(), password: password.clone() };
    
    println!("Sending login data: {:?}", serde_json::to_string(&login_data));
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/auth/signin")
        .header("Content-Type", "application/json")
        .json(&login_data)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Login response status: {}", status);
    println!("Login response body: {}", text);

    if status.is_success() {
        let backend_response: BackendLoginResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let response = LoginResponse {
            access_token: backend_response.access_token,
        };
        
        println!("Login successful for username: {}", username);
        Ok(response)
    } else {
        println!("Login failed with status: {}", status);
        Err(format!("Login failed: {} - {}", status, text))
    }
}

#[derive(serde::Serialize)]
struct RegisterRequest {
    name: String,
    email: String,
    password: String,
}

#[tauri::command]
pub async fn register(name: String, email: String, password: String) -> Result<LoginResponse, String> {
    println!("Attempting registration for email: {}", email);
    
    let client = reqwest::Client::new();
    let register_data = RegisterRequest { name, email: email.clone(), password };
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/auth/signup")
        .json(&register_data)
        .send()
        .await
        .map_err(|e| format!("Request error: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Registration response status: {}", status);
    println!("Registration response body: {}", text);

    if status.is_success() {
        let backend_response: BackendLoginResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let response = LoginResponse {
            access_token: backend_response.access_token,
        };
        
        println!("Registration successful for email: {}", email);
        Ok(response)
    } else {
        println!("Registration failed with status: {}", status);
        Err(format!("Registration failed: {} - {}", status, text))
    }
}

// Simple in-memory token storage
type TokenStore = Mutex<HashMap<String, String>>;

#[tauri::command]
pub async fn save_token(
    state: State<'_, TokenStore>,
    key: String,
    value: String,
) -> Result<(), String> {
    state.lock().map_err(|e| format!("Lock error: {}", e))?.insert(key, value);
    Ok(())
}

#[tauri::command]
pub async fn load_token(
    state: State<'_, TokenStore>,
    key: String,
) -> Result<Option<String>, String> {
    println!("Loading token for key: {}", key);
    let result = state.lock().map_err(|e| format!("Lock error: {}", e))?.get(&key).cloned();
    println!("Token result: {:?}", result.as_ref().map(|_| "found"));
    Ok(result)
}

#[tauri::command]
pub async fn remove_token(
    state: State<'_, TokenStore>,
    key: String,
) -> Result<(), String> {
    state.lock().map_err(|e| format!("Lock error: {}", e))?.remove(&key);
    Ok(())
}

#[tauri::command]
pub async fn verify_token(
    _app_handle: AppHandle,
    token: String,
) -> Result<bool, String> {
    println!("Verifying token: {}", if token.is_empty() { "empty" } else { "not empty" });
    // Simple token verification - you can implement your own logic here
    let result = !token.is_empty();
    println!("Token verification result: {}", result);
    Ok(result)
}

// ======== CHAT ========
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ChatMemberSimple {
    pub user_id: String,
    pub is_admin: bool,
}

#[tauri::command]
pub async fn create_chat(
    _token: String,
    name: String,
    _is_group: bool,
    members: Vec<ChatMemberSimple>,
) -> Result<(), String> {
    // Implement chat creation logic here
    println!("Creating chat: {} with {} members", name, members.len());
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
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

#[tauri::command]
pub async fn fetch_messages(
    _chat_id: String,
    _app_handle: tauri::AppHandle,
) -> Result<Vec<Message>, String> {
    // In fetch_messages and save_message, REMOVE or REPLACE:
    // let db = tauri_plugin_sql::get_connection(&app_handle, "sqlite:chat.db")
    //     .await
    //     .map_err(|e| format!("DB error: {e}"))?;
    // Instead, use the Tauri SQL plugin's provided API or leave a TODO for correct usage.
    let rows: Vec<Message> = vec![]; // TODO: Implement actual database fetching
    Ok(rows)
}

#[tauri::command]
pub async fn save_message(
    message: Message,
    _app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // In fetch_messages and save_message, REMOVE or REPLACE:
    // let db = tauri_plugin_sql::get_connection(&app_handle, "sqlite:chat.db")
    //     .await
    //     .map_err(|e| format!("DB error: {e}"))?;
    // Instead, use the Tauri SQL plugin's provided API or leave a TODO for correct usage.
    println!("Saving message: {}", message.message_id); // TODO: Implement actual database saving
    Ok(())
}

// ======== API COMMANDS (Native HTTP - No CORS) ========

#[derive(serde::Serialize, serde::Deserialize)]
pub struct UserData {
    pub user_id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub picture: Option<String>,
    pub verified: bool,
}

#[tauri::command]
pub async fn get_current_user(state: State<'_, TokenStore>) -> Result<UserData, String> {
    let token = state.lock().map_err(|e| format!("Lock error: {}", e))?.get("accessToken").cloned();
    
    if let Some(token) = token {
        println!("Getting current user data with token: {}", token.chars().take(20).collect::<String>() + "...");
        
        let client = reqwest::Client::new();
        let res = client
            .get("https://dev.v1.terracrypt.cc/api/v1/users/me")
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(|e| format!("Request failed: {e}"))?;

        let status = res.status();
        let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
        
        println!("Get user response status: {}", status);
        println!("Get user response body: {}", text);

        if status.is_success() {
            let user_data: UserData = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON response: {e}"))?;
            
            println!("Get user successful");
            Ok(user_data)
        } else {
            println!("Get user failed with status: {}", status);
            Err(format!("Get user failed: {} - {}", status, text))
        }
    } else {
        Err("No token available".to_string())
    }
}

// Add a new function that accepts token as parameter for use during login
#[tauri::command]
pub async fn get_current_user_with_token(token: String) -> Result<UserData, String> {
    println!("Getting current user data with provided token: {}", token.chars().take(20).collect::<String>() + "...");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/users/me")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get user response status: {}", status);
    println!("Get user response body: {}", text);

    if status.is_success() {
        let user_data: UserData = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Get user successful");
        Ok(user_data)
    } else {
        println!("Get user failed with status: {}", status);
        Err(format!("Get user failed: {} - {}", status, text))
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Friend {
    pub user_id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub picture: Option<String>,
    pub status: Option<String>,
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
pub struct ChatMember {
    pub user: Friend,
    pub is_admin: bool,
    pub joined_at: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ChatMemberResponse {
    pub data: Vec<ChatMember>,
    pub limit: i32,
    pub offset: i32,
}

#[tauri::command]
pub async fn get_friends(state: State<'_, TokenStore>) -> Result<Vec<Friend>, String> {
    let token = state.lock().map_err(|e| format!("Lock error: {}", e))?.get("accessToken").cloned();
    
    if let Some(token) = token {
        println!("Getting friends list...");
        
        let client = reqwest::Client::new();
        let res = client
            .get("https://dev.v1.terracrypt.cc/api/v1/friends")
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(|e| format!("Request failed: {e}"))?;

        let status = res.status();
        let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
        
        println!("Get friends response status: {}", status);

        if status.is_success() {
            let friends: Vec<Friend> = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON response: {e}"))?;
            
            // Process friends to ensure status field is set
            let processed_friends: Vec<Friend> = friends.into_iter().map(|mut friend| {
                if friend.status.is_none() {
                    friend.status = Some("active".to_string());
                }
                friend
            }).collect();
            
            println!("Get friends successful, found {} friends", processed_friends.len());
            Ok(processed_friends)
        } else {
            println!("Get friends failed with status: {}", status);
            Err(format!("Get friends failed: {} - {}", status, text))
        }
    } else {
        Err("No token available".to_string())
    }
}

#[tauri::command]
pub async fn get_friend_requests_with_token(token: String) -> Result<Vec<FriendRequest>, String> {
    println!("Getting friend requests with token...");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/friends/request/pending")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get friend requests response status: {}", status);
    println!("Get friend requests response body: {}", text);

    if status.is_success() {
        let requests: Vec<FriendRequest> = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Get friend requests successful, found {} requests", requests.len());
        Ok(requests)
    } else {
        println!("Get friend requests failed with status: {}", status);
        Err(format!("Get friend requests failed: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_chat_members_with_token(token: String, chat_id: String) -> Result<ChatMemberResponse, String> {
    println!("Getting chat members for chat: {}", chat_id);
    
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/members", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get chat members response status: {}", status);
    println!("Get chat members response body: {}", text);

    if status.is_success() {
        let members_response: ChatMemberResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Get chat members successful, found {} members", members_response.data.len());
        Ok(members_response)
    } else {
        println!("Get chat members failed with status: {}", status);
        Err(format!("Get chat members failed: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_friends_with_token(token: String) -> Result<Vec<Friend>, String> {
    println!("Getting friends list with token...");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/friends")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get friends response status: {}", status);

            if status.is_success() {
            let friends: Vec<Friend> = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON response: {e}"))?;
            
            // Process friends to ensure status field is set
            let processed_friends: Vec<Friend> = friends.into_iter().map(|mut friend| {
                if friend.status.is_none() {
                    friend.status = Some("active".to_string());
                }
                friend
            }).collect();
            
            println!("Get friends successful, found {} friends", processed_friends.len());
            Ok(processed_friends)
        } else {
        println!("Get friends failed with status: {}", status);
        Err(format!("Get friends failed: {} - {}", status, text))
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Chat {
    pub chat_id: String,
    pub chat_name: String,
    pub created_at: i64,
    pub creator_id: String,
    pub is_group: bool,
    pub participants: Vec<String>,
}

// Struct for deserializing API response which might have optional fields
#[derive(serde::Deserialize)]
struct ChatListResponse {
    pub data: Vec<ApiChat>,
}

#[derive(serde::Deserialize)]
struct ApiChat {
    pub chat_id: String,
    pub name: Option<String>,
    pub chat_name: Option<String>,
    pub created_at: Option<String>,
    pub creator_id: Option<String>,
    pub is_group: Option<bool>,
    pub participants: Option<Vec<String>>,
}

#[tauri::command]
pub async fn get_chats(state: State<'_, TokenStore>) -> Result<Vec<Chat>, String> {
    let token = state.lock().map_err(|e| format!("Lock error: {}", e))?.get("accessToken").cloned();
    
    if let Some(token) = token {
        println!("Getting chats list...");
        
        let client = reqwest::Client::new();
        let res = client
            .get("https://dev.v1.terracrypt.cc/api/v1/chats")
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(|e| format!("Request failed: {e}"))?;

        let status = res.status();
        let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
        
        println!("Get chats response status: {}", status);
        println!("Get chats response body: {}", text);

        if status.is_success() {
            // Parse the wrapped response structure like the Kotlin app
            let chat_list_response: ChatListResponse = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON response: {e}"))?;
            
            let api_chats = chat_list_response.data;
            
            // Validate and clean chat data
            let valid_chats: Vec<Chat> = api_chats
                .into_iter()
                .filter_map(|api_chat| {
                    if api_chat.chat_id.is_empty() {
                        println!("Warning: Skipping chat with empty chat_id");
                        None
                    } else {
                        // Ensure required fields have default values
                        let chat_id = api_chat.chat_id.clone();
                        
                        // Parse created_at from ISO string to timestamp
                        let created_at = api_chat.created_at
                            .and_then(|date_str| {
                                chrono::DateTime::parse_from_rfc3339(&date_str)
                                    .ok()
                                    .map(|dt| dt.timestamp())
                            })
                            .unwrap_or(0);
                        
                        // Use name field if available, fallback to chat_name, then generate default
                        let chat_name = api_chat.name
                            .or(api_chat.chat_name)
                            .unwrap_or_else(|| format!("Chat {}", chat_id));
                        
                        Some(Chat {
                            chat_id: api_chat.chat_id,
                            chat_name,
                            created_at: created_at.max(0),
                            creator_id: api_chat.creator_id.unwrap_or_default(),
                            is_group: api_chat.is_group.unwrap_or(false),
                            participants: api_chat.participants.unwrap_or_default(),
                        })
                    }
                })
                .collect();
            
            println!("Get chats successful, found {} valid chats", valid_chats.len());
            Ok(valid_chats)
        } else {
            println!("Get chats failed with status: {}", status);
            Err(format!("Get chats failed: {} - {}", status, text))
        }
    } else {
        Err("No token available".to_string())
    }
}

#[tauri::command]
pub async fn get_chats_with_token(token: String) -> Result<Vec<Chat>, String> {
    println!("Getting chats list with token...");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/chats")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get chats response status: {}", status);
    println!("Get chats response body: {}", text);

    if status.is_success() {
        // Parse the wrapped response structure like the Kotlin app
        let chat_list_response: ChatListResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let api_chats = chat_list_response.data;
        
        // Validate and clean chat data
        let valid_chats: Vec<Chat> = api_chats
            .into_iter()
            .filter_map(|api_chat| {
                if api_chat.chat_id.is_empty() {
                    println!("Warning: Skipping chat with empty chat_id");
                    None
                } else {
                    // Ensure required fields have default values
                    let chat_id = api_chat.chat_id.clone();
                    
                    // Parse created_at from ISO string to timestamp
                    let created_at = api_chat.created_at
                        .and_then(|date_str| {
                            chrono::DateTime::parse_from_rfc3339(&date_str)
                                .ok()
                                .map(|dt| dt.timestamp())
                        })
                        .unwrap_or(0);
                    
                    // Use name field if available, fallback to chat_name, then generate default
                    let chat_name = api_chat.name
                        .or(api_chat.chat_name)
                        .unwrap_or_else(|| format!("Chat {}", chat_id));
                    
                    Some(Chat {
                        chat_id: api_chat.chat_id,
                        chat_name,
                        created_at: created_at.max(0),
                        creator_id: api_chat.creator_id.unwrap_or_default(),
                        is_group: api_chat.is_group.unwrap_or(false),
                        participants: api_chat.participants.unwrap_or_default(),
                    })
                }
            })
            .collect();
        
        println!("Get chats successful, found {} valid chats", valid_chats.len());
        Ok(valid_chats)
    } else {
        println!("Get chats failed with status: {}", status);
        Err(format!("Get chats failed: {} - {}", status, text))
    }
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

#[tauri::command]
pub async fn send_message(
    state: State<'_, TokenStore>,
    content: String,
    chat_id: String,
    reply_to_message_id: Option<String>,
) -> Result<SendMessageResponse, String> {
    let token = state.lock().map_err(|e| format!("Lock error: {}", e))?.get("accessToken").cloned();
    
    if let Some(token) = token {
        println!("Sending message to chat: {}", chat_id);
        
        let client = reqwest::Client::new();
        let message_data = SendMessageRequest {
            content,
            chat_id,
            reply_to_message_id,
        };
        
        let res = client
            .post("https://dev.v1.terracrypt.cc/api/v1/messages")
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .json(&message_data)
            .send()
            .await
            .map_err(|e| format!("Request failed: {e}"))?;

        let status = res.status();
        let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
        
        println!("Send message response status: {}", status);

        if status.is_success() {
            let response: SendMessageResponse = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON response: {e}"))?;
            
            println!("Send message successful, message_id: {}", response.message_id);
            Ok(response)
        } else {
            println!("Send message failed with status: {}", status);
            Err(format!("Send message failed: {} - {}", status, text))
        }
    } else {
        Err("No token available".to_string())
    }
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

#[tauri::command]
pub async fn get_messages(token: String, chat_id: String) -> Result<Vec<ChatMessage>, String> {
    println!("Getting messages for chat: {}", chat_id);
    
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/messages", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get messages response status: {}", status);

    if status.is_success() {
        let messages: Vec<ChatMessage> = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Get messages successful, found {} messages", messages.len());
        Ok(messages)
    } else {
        println!("Get messages failed with status: {}", status);
        Err(format!("Get messages failed: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn search_users(token: String, query: String) -> Result<Vec<UserData>, String> {
    println!("Searching users with query: {}", query);
    
    let client = reqwest::Client::new();
    
    let res = client
        .get(&format!("https://dev.v1.terracrypt.cc/api/v1/users/search?username={}", query))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Search users response status: {}", status);
    println!("Search users response body: {}", text);

    if status.is_success() {
        let users: Vec<UserData> = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Search users successful, found {} users", users.len());
        Ok(users)
    } else {
        println!("Search users failed with status: {}", status);
        Err(format!("Search users failed: {} - {}", status, text))
    }
}

// ======== DATABASE COMMANDS ========

#[tauri::command]
pub async fn db_insert_user(user: User) -> Result<(), String> {
    database::insert_or_update_user(&user)
        .map_err(|e| format!("Failed to insert user: {}", e))
}

#[tauri::command]
pub async fn db_get_user_by_id(user_id: String) -> Result<Option<User>, String> {
    database::get_user_by_id(&user_id)
        .map_err(|e| format!("Failed to get user: {}", e))
}

#[tauri::command]
pub async fn db_get_user_by_token(token: String) -> Result<Option<User>, String> {
    database::get_user_by_token(&token)
        .map_err(|e| format!("Failed to get user by token: {}", e))
}

#[tauri::command]
pub async fn db_update_user_token(user_id: String, token: String) -> Result<(), String> {
    database::update_user_token(&user_id, &token)
        .map_err(|e| format!("Failed to update user token: {}", e))
}

#[tauri::command]
pub async fn db_clear_user_data() -> Result<(), String> {
    database::clear_user_data()
        .map_err(|e| format!("Failed to clear user data: {}", e))
}

#[tauri::command]
pub async fn db_get_most_recent_user() -> Result<Option<User>, String> {
    database::get_most_recent_user()
        .map_err(|e| format!("Failed to get most recent user: {}", e))
}

// Chat commands
#[tauri::command]
pub async fn db_insert_chat(chat: DbChat) -> Result<(), String> {
    database::insert_or_update_chat(&chat)
        .map_err(|e| format!("Failed to insert chat: {}", e))
}

#[tauri::command]
pub async fn db_get_chat_by_id(chat_id: String) -> Result<Option<DbChat>, String> {
    database::get_chat_by_id(&chat_id)
        .map_err(|e| format!("Failed to get chat: {}", e))
}

#[tauri::command]
pub async fn db_get_all_chats() -> Result<Vec<DbChat>, String> {
    database::get_all_chats()
        .map_err(|e| format!("Failed to get chats: {}", e))
}

#[tauri::command]
pub async fn db_update_chat_unread_count(chat_id: String, unread_count: i32) -> Result<(), String> {
    database::update_chat_unread_count(&chat_id, unread_count)
        .map_err(|e| format!("Failed to update chat unread count: {}", e))
}

#[tauri::command]
pub async fn db_update_chat_last_message(chat_id: String, content: Option<String>, timestamp: Option<i64>) -> Result<(), String> {
    database::update_chat_last_message(&chat_id, content, timestamp)
        .map_err(|e| format!("Failed to update chat last message: {}", e))
}

#[tauri::command]
pub async fn db_delete_chat_by_id(chat_id: String) -> Result<(), String> {
    database::delete_chat_by_id(&chat_id)
        .map_err(|e| format!("Failed to delete chat: {}", e))
}

#[tauri::command]
pub async fn db_clear_chat_data() -> Result<(), String> {
    database::clear_chat_data()
        .map_err(|e| format!("Failed to clear chat data: {}", e))
}

// Message commands
#[tauri::command]
pub async fn db_insert_message(message: DbMessage) -> Result<(), String> {
    database::insert_or_update_message(&message)
        .map_err(|e| format!("Failed to insert message: {}", e))
}

#[tauri::command]
pub async fn db_insert_messages(messages: Vec<DbMessage>) -> Result<(), String> {
    database::insert_messages(&messages)
        .map_err(|e| format!("Failed to insert messages: {}", e))
}

#[tauri::command]
pub async fn db_get_message_by_id(message_id: String) -> Result<Option<DbMessage>, String> {
    database::get_message_by_id(&message_id)
        .map_err(|e| format!("Failed to get message by id: {}", e))
}

#[tauri::command]
pub async fn db_get_message_by_client_id(client_message_id: String) -> Result<Option<DbMessage>, String> {
    database::get_message_by_client_id(&client_message_id)
        .map_err(|e| format!("Failed to get message by client id: {}", e))
}

#[tauri::command]
pub async fn db_get_messages_for_chat(chat_id: String) -> Result<Vec<DbMessage>, String> {
    database::get_messages_for_chat(&chat_id)
        .map_err(|e| format!("Failed to get messages: {}", e))
}

#[tauri::command]
pub async fn db_get_messages_before_timestamp(chat_id: String, before_timestamp: i64, limit: i32) -> Result<Vec<DbMessage>, String> {
    database::get_messages_before_timestamp(&chat_id, before_timestamp, limit)
        .map_err(|e| format!("Failed to get messages before timestamp: {}", e))
}

#[tauri::command]
pub async fn db_get_last_message(chat_id: String) -> Result<Option<DbMessage>, String> {
    database::get_last_message(&chat_id)
        .map_err(|e| format!("Failed to get last message: {}", e))
}

#[tauri::command]
pub async fn db_update_message_sent_status(client_message_id: String, is_sent: bool) -> Result<(), String> {
    database::update_message_sent_status(&client_message_id, is_sent)
        .map_err(|e| format!("Failed to update message sent status: {}", e))
}

#[tauri::command]
pub async fn db_mark_message_delivered_by_server_id(message_id: String) -> Result<(), String> {
    database::mark_message_delivered_by_server_id(&message_id)
        .map_err(|e| format!("Failed to mark message delivered: {}", e))
}

#[tauri::command]
pub async fn db_mark_message_read_by_server_id(message_id: String) -> Result<(), String> {
    database::mark_message_read_by_server_id(&message_id)
        .map_err(|e| format!("Failed to mark message read: {}", e))
}

#[tauri::command]
pub async fn db_mark_messages_read_by_server_ids(message_ids: Vec<String>) -> Result<(), String> {
    database::mark_messages_read_by_server_ids(&message_ids)
        .map_err(|e| format!("Failed to mark messages read by server ids: {}", e))
}

#[tauri::command]
pub async fn db_get_unread_messages(chat_id: String) -> Result<Vec<DbMessage>, String> {
    database::get_unread_messages(&chat_id)
        .map_err(|e| format!("Failed to get unread messages: {}", e))
}

#[tauri::command]
pub async fn db_count_unread_messages(chat_id: String) -> Result<i32, String> {
    database::count_unread_messages(&chat_id)
        .map_err(|e| format!("Failed to count unread messages: {}", e))
}

#[tauri::command]
pub async fn db_mark_messages_as_read(chat_id: String) -> Result<(), String> {
    database::mark_messages_as_read(&chat_id)
        .map_err(|e| format!("Failed to mark messages as read: {}", e))
}

#[tauri::command]
pub async fn db_update_message_id_by_client(client_message_id: String, server_id: String) -> Result<(), String> {
    database::update_message_id_by_client(&client_message_id, &server_id)
        .map_err(|e| format!("Failed to update message id by client: {}", e))
}

#[tauri::command]
pub async fn db_delete_message_by_id(message_id: String) -> Result<(), String> {
    database::delete_message_by_id(&message_id)
        .map_err(|e| format!("Failed to delete message by id: {}", e))
}

#[tauri::command]
pub async fn db_delete_message_by_client_id(client_message_id: String) -> Result<(), String> {
    database::delete_message_by_client_id(&client_message_id)
        .map_err(|e| format!("Failed to delete message by client id: {}", e))
}

#[tauri::command]
pub async fn db_clear_message_data() -> Result<(), String> {
    database::clear_message_data()
        .map_err(|e| format!("Failed to clear message data: {}", e))
}

// Friend commands
#[tauri::command]
pub async fn db_insert_friend(friend: DbFriend) -> Result<(), String> {
    database::insert_or_update_friend(&friend)
        .map_err(|e| format!("Failed to insert friend: {}", e))
}

#[tauri::command]
pub async fn db_get_all_friends() -> Result<Vec<DbFriend>, String> {
    database::get_all_friends()
        .map_err(|e| format!("Failed to get friends: {}", e))
}

#[tauri::command]
pub async fn db_clear_friend_data() -> Result<(), String> {
    database::clear_friend_data()
        .map_err(|e| format!("Failed to clear friend data: {}", e))
}

// Participant commands
#[tauri::command]
pub async fn db_insert_participant(participant: Participant) -> Result<(), String> {
    database::insert_or_update_participant(&participant)
        .map_err(|e| format!("Failed to insert participant: {}", e))
}

#[tauri::command]
pub async fn db_get_participants_for_chat(chat_id: String) -> Result<Vec<Participant>, String> {
    database::get_participants_for_chat(&chat_id)
        .map_err(|e| format!("Failed to get participants: {}", e))
}

#[tauri::command]
pub async fn db_clear_participant_data() -> Result<(), String> {
    database::clear_participant_data()
        .map_err(|e| format!("Failed to clear participant data: {}", e))
}

// User keys commands
#[tauri::command]
pub async fn db_insert_user_keys(keys: database::UserKeys) -> Result<(), String> {
    database::insert_or_update_user_keys(&keys)
        .map_err(|e| format!("Failed to insert user keys: {}", e))
}

#[tauri::command]
pub async fn db_get_user_keys(user_id: String) -> Result<Option<database::UserKeys>, String> {
    database::get_user_keys(&user_id)
        .map_err(|e| format!("Failed to get user keys: {}", e))
}

// Settings commands
#[derive(serde::Deserialize)]
pub struct UpdateDarkModeRequest {
    pub user_id: String,
    pub is_dark_mode: bool,
}

#[tauri::command]
pub async fn db_update_dark_mode(request: UpdateDarkModeRequest) -> Result<(), String> {
    database::update_dark_mode(&request.user_id, request.is_dark_mode)
        .map_err(|e| format!("Failed to update dark mode: {}", e))
}

#[tauri::command]
pub async fn db_get_dark_mode(user_id: String) -> Result<bool, String> {
    database::get_dark_mode(&user_id)
        .map_err(|e| format!("Failed to get dark mode: {}", e))
}

// Clear all data
#[tauri::command]
pub async fn db_clear_all_data() -> Result<(), String> {
    database::clear_all_data()
        .map_err(|e| format!("Failed to clear all data: {}", e))
}

// Friend request actions
#[tauri::command]
pub async fn send_friend_request(token: String, receiver_id: String) -> Result<(), String> {
    println!("Sending friend request to: {}", receiver_id);
    
    let client = reqwest::Client::new();
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/friends/request")
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "receiver_id": receiver_id
        }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Send friend request response status: {}", status);
    println!("Send friend request response body: {}", text);

    if status.is_success() {
        println!("Send friend request successful");
        Ok(())
    } else {
        println!("Send friend request failed with status: {}", status);
        Err(format!("Send friend request failed: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn accept_friend_request(token: String, request_id: String) -> Result<(), String> {
    println!("Accepting friend request: {}", request_id);
    
    let client = reqwest::Client::new();
    let res = client
        .put(&format!("https://dev.v1.terracrypt.cc/api/v1/friends/request/{}/accept", request_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Accept friend request response status: {}", status);
    println!("Accept friend request response body: {}", text);

    if status.is_success() {
        println!("Accept friend request successful");
        Ok(())
    } else {
        println!("Accept friend request failed with status: {}", status);
        Err(format!("Accept friend request failed: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn decline_friend_request(token: String, request_id: String) -> Result<(), String> {
    println!("Declining friend request: {}", request_id);
    
    let client = reqwest::Client::new();
    let res = client
        .put(&format!("https://dev.v1.terracrypt.cc/api/v1/friends/request/{}/reject", request_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Decline friend request response status: {}", status);
    println!("Decline friend request response body: {}", text);

    if status.is_success() {
        println!("Decline friend request successful");
        Ok(())
    } else {
        println!("Decline friend request failed with status: {}", status);
        Err(format!("Decline friend request failed: {} - {}", status, text))
    }
}
