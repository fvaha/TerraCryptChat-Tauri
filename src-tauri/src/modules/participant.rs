use reqwest;
use serde_json;
use tauri::State;
use std::collections::HashMap;
use std::sync::Mutex;
use chrono;
use crate::database_async::{self as db_async};

// ======== PARTICIPANT STRUCTURES ========
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Participant {
    pub user_id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub picture: Option<String>,
    pub is_admin: bool,
}

#[derive(serde::Deserialize)]
pub struct ApiParticipant {
    pub chat_id: String,
    pub is_admin: bool,
    pub joined_at: String,
    pub user: ApiUser,
}

#[derive(serde::Deserialize)]
pub struct ApiUser {
    pub user_id: String,
    pub name: String,
    pub email: String,
    pub username: String,
}

#[derive(serde::Deserialize)]
pub struct ParticipantResponse {
    pub data: Vec<ApiParticipant>,
}

#[derive(serde::Serialize)]
pub struct AddParticipantRequest {
    pub members: Vec<ParticipantSimple>,
}

#[derive(serde::Serialize)]
pub struct ParticipantSimple {
    pub user_id: String,
    pub is_admin: bool,
}

// ======== PARTICIPANT COMMANDS ========

#[tauri::command]
pub async fn create_participant_from_user_id(
    user_id: String,
    chat_id: String,
    is_admin: bool,
    joined_at: i64,
) -> Result<db_async::Participant, String> {
    println!("Creating participant for user_id: {} in chat: {}", user_id, chat_id);
    
    // Try to get the actual username from local database or friends list only (no API call without token)
    let username = get_username_for_user_id_local_only(&user_id).await.unwrap_or_else(|e| {
        println!("Failed to get username for user_id {}: {}, using fallback", user_id, e);
        // Fallback: use a placeholder that indicates we need to resolve the username
        format!("user_{}", user_id.chars().take(8).collect::<String>())
    });
    
    println!("Using username: {} for user_id: {}", username, user_id);
    
    let participant = db_async::Participant {
        participant_id: format!("{}_{}", chat_id, user_id),
        user_id: user_id.clone(),
        username: username,
        joined_at,
        role: if is_admin { "admin".to_string() } else { "member".to_string() },
        chat_id: chat_id.clone(),
    };
    
    println!("Created participant: {:?}", participant);
    Ok(participant)
}

#[tauri::command]
pub async fn add_participants(
    state: State<'_, Mutex<HashMap<String, String>>>,
    chat_id: String,
    participant_ids: Vec<String>,
    admin_ids: Vec<String>,
) -> Result<(), String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };

    add_participants_with_token(token, chat_id, participant_ids, admin_ids).await
}

#[tauri::command]
pub async fn add_participants_with_token(
    token: String,
    chat_id: String,
    participant_ids: Vec<String>,
    admin_ids: Vec<String>,
) -> Result<(), String> {
    println!("Adding participants to chat: {}", chat_id);
    
    // Filter out participants that are already in the chat
    let existing_participants = get_cached_participants_for_chat(chat_id.clone()).await?;
    let existing_user_ids: std::collections::HashSet<String> = existing_participants
        .iter()
        .map(|p| p.user_id.clone())
        .collect();
    
    let filtered = participant_ids
        .into_iter()
        .filter(|user_id| !existing_user_ids.contains(user_id))
        .collect::<Vec<String>>();

    if filtered.is_empty() {
        println!("No new participants to add");
        return Ok(());
    }

    let members = filtered
        .iter()
        .map(|user_id| ParticipantSimple {
            user_id: user_id.clone(),
            is_admin: admin_ids.contains(user_id),
        })
        .collect();

    let request = AddParticipantRequest { members };

    let client = reqwest::Client::new();
    let res = client
        .post(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/members", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Add participants response status: {}", status);
    println!("Add participants response body: {}", text);

    if status.is_success() {
        println!("Successfully added {} participants", filtered.len());
        
        // Save participants to database
        for user_id in &filtered {
            let username = get_username_for_user_id(&token, user_id).await?;
            let is_admin = admin_ids.contains(user_id);
            
            let db_participant = db_async::Participant {
                participant_id: format!("{}_{}", chat_id, user_id),
                user_id: user_id.clone(),
                username,
                joined_at: chrono::Utc::now().timestamp(),
                role: if is_admin { "admin".to_string() } else { "member".to_string() },
                chat_id: chat_id.clone(),
            };
            
            if let Err(e) = db_async::insert_or_update_participant(&db_participant).await {
                println!("Failed to save participant {}: {}", user_id, e);
            }
        }
        
        Ok(())
    } else {
        println!("Failed to add participants with status: {}", status);
        Err(format!("Failed to add participants: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn remove_participant(
    state: State<'_, Mutex<HashMap<String, String>>>,
    chat_id: String,
    user_id: String,
) -> Result<(), String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };

    remove_participant_with_token(token, chat_id, user_id).await
}

#[tauri::command]
pub async fn remove_participant_with_token(
    token: String,
    chat_id: String,
    user_id: String,
) -> Result<(), String> {
    println!("Removing participant {} from chat: {}", user_id, chat_id);
    
    let client = reqwest::Client::new();
    let res = client
        .delete(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/members/{}", chat_id, user_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Remove participant response status: {}", status);
    println!("Remove participant response body: {}", text);

    if status.is_success() {
        println!("Successfully removed participant {}", user_id);
        
        // Remove from database
        let participant_id = format!("{}_{}", chat_id, user_id);
        if let Err(e) = db_async::delete_participant(&participant_id).await {
            println!("Failed to remove participant from database: {}", e);
        }
        
        Ok(())
    } else {
        println!("Failed to remove participant with status: {}", status);
        Err(format!("Failed to remove participant: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn update_participant_role(
    state: State<'_, Mutex<HashMap<String, String>>>,
    chat_id: String,
    user_id: String,
    new_role: String,
) -> Result<bool, String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };

    update_participant_role_with_token(token, chat_id, user_id, new_role).await
}

#[tauri::command]
pub async fn update_participant_role_with_token(
    token: String,
    chat_id: String,
    user_id: String,
    new_role: String,
) -> Result<bool, String> {
    println!("Updating participant {} role to {} in chat: {}", user_id, new_role, chat_id);
    
    // First remove the participant
    remove_participant_with_token(token.clone(), chat_id.clone(), user_id.clone()).await?;
    
    // Then add them back with the new role
    let admin_ids = if new_role == "admin" { vec![user_id.clone()] } else { vec![] };
    add_participants_with_token(token, chat_id.clone(), vec![user_id.clone()], admin_ids).await?;
    
    // Update the database role
    let participant_id = format!("{}_{}", chat_id, user_id);
    db_async::update_participant_role(&participant_id, &new_role).await
        .map_err(|e| format!("Database error: {e}"))?;
    
    println!("Successfully updated participant role");
    Ok(true)
}

#[tauri::command]
pub async fn sync_participants_with_api(
    state: State<'_, Mutex<HashMap<String, String>>>,
    chat_id: String,
) -> Result<(), String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };

    sync_participants_with_api_token(token, chat_id).await
}

#[tauri::command]
pub async fn sync_participants_with_api_token(
    token: String,
    chat_id: String,
) -> Result<(), String> {
    println!("Syncing participants with API for chat: {}", chat_id);
    
    // Check if we already have participants for this chat and they're recent
    let existing_participants = db_async::get_participants_for_chat(&chat_id).await;
    if let Ok(participants) = existing_participants {
        if !participants.is_empty() {
            println!("Found {} existing participants for chat {}, skipping API call", participants.len(), chat_id);
            return Ok(());
        }
    }
    
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("https://dev.v1.terracrypt.cc/api/v1/chats/{}/members", chat_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Sync participants response status: {}", status);
    println!("Sync participants response body: {}", text);

    if status.is_success() {
        let participants_response: ParticipantResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        println!("Successfully retrieved {} participants from API", participants_response.data.len());
        
        // Only clear if we have new data
        if !participants_response.data.is_empty() {
            let participant_count = participants_response.data.len();
            
            // Clear existing participants for this chat
            let existing_participants = db_async::get_participants_for_chat(&chat_id).await
                .map_err(|e| format!("Database error: {e}"))?;
            
            for participant in existing_participants {
                if let Err(e) = db_async::delete_participant(&participant.participant_id).await {
                    println!("Failed to delete existing participant: {}", e);
                }
            }
            
            // Save new participants
            for api_participant in &participants_response.data {
                let user_id = api_participant.user.user_id.clone();
                let username = api_participant.user.username.clone();
                
                println!("Saving participant: user_id={}, username={}", user_id, username);
                
                let db_participant = db_async::Participant {
                    participant_id: format!("{}_{}", chat_id, user_id),
                    user_id: user_id,
                    username: username,
                    joined_at: chrono::Utc::now().timestamp(),
                    role: if api_participant.is_admin { "admin".to_string() } else { "member".to_string() },
                    chat_id: chat_id.clone(),
                };
                
                if let Err(e) = db_async::insert_or_update_participant(&db_participant).await {
                    println!("Failed to save participant {}: {}", api_participant.user.user_id, e);
                } else {
                    println!("Successfully saved participant: {}", api_participant.user.user_id);
                }
            }
            
            println!("Successfully synced {} participants for chat {}", participant_count, chat_id);
        }
        
        Ok(())
    } else {
        println!("Failed to sync participants with status: {}", status);
        Err(format!("Failed to sync participants: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn get_cached_participants_for_chat(chat_id: String) -> Result<Vec<Participant>, String> {
    println!("Getting cached participants for chat: {}", chat_id);
    
    let participants = db_async::get_participants_for_chat(&chat_id).await
        .map_err(|e| format!("Database error: {e}"))?;
    
    println!("Found {} participants in database for chat {}", participants.len(), chat_id);
    
    let converted_participants: Vec<Participant> = participants.into_iter().map(|participant| {
        let username = participant.username.clone();
        println!("Converting participant: user_id={}, username={}", participant.user_id, username);
        
        let converted = Participant {
            user_id: participant.user_id,
            username: username.clone(),
            name: username, // Use username as name since name field doesn't exist
            email: String::new(), // Participant doesn't have email field
            picture: None, // Participant doesn't have picture field
            is_admin: participant.role == "admin",
        };
        
        println!("Converted participant: {:?}", converted);
        converted
    }).collect();
    
    println!("Retrieved {} cached participants", converted_participants.len());
    Ok(converted_participants)
}

#[tauri::command]
pub async fn get_participant_by_user_id(chat_id: String, user_id: String) -> Result<Option<Participant>, String> {
    println!("Getting participant {} for chat: {}", user_id, chat_id);
    
    let participants = get_cached_participants_for_chat(chat_id).await?;
    let participant = participants.into_iter().find(|p| p.user_id == user_id);
    
    Ok(participant)
}

#[tauri::command]
pub async fn is_participant_in_chat(chat_id: String, user_id: String) -> Result<bool, String> {
    println!("Checking if participant {} is in chat: {}", user_id, chat_id);
    
    let participant = get_participant_by_user_id(chat_id, user_id).await?;
    Ok(participant.is_some())
}

#[tauri::command]
pub async fn clear_cached_participants(chat_id: String) -> Result<(), String> {
    println!("Clearing cached participants for chat: {}", chat_id);
    
    let participants = db_async::get_participants_for_chat(&chat_id).await
        .map_err(|e| format!("Database error: {e}"))?;
    
    for participant in participants {
        if let Err(e) = db_async::delete_participant(&participant.participant_id).await {
            println!("Failed to delete participant: {}", e);
        }
    }
    
    println!("Successfully cleared cached participants");
    Ok(())
}

#[tauri::command]
pub async fn get_username_for_user_id_command(token: String, user_id: String) -> Result<String, String> {
    get_username_for_user_id(&token, &user_id).await
}

pub async fn get_username_for_user_id_local_only(user_id: &str) -> Result<String, String> {
    println!("Getting username for user_id (local only): {}", user_id);
    
    // First try to get from local database if we have user data
    match db_async::get_user_by_id(user_id).await {
        Ok(Some(user)) => {
            if !user.username.is_empty() && user.username != user_id {
                println!("Found username in local user database: {}", user.username);
                return Ok(user.username);
            } else {
                println!("User found in local database but username is empty or same as user_id");
            }
        }
        Ok(None) => {
            println!("User not found in local database");
        }
        Err(e) => {
            println!("Error getting user from local database: {}", e);
        }
    }
    
    // If no local user data or username is missing, try to get from friends list
    match db_async::get_friend_by_id(user_id).await {
        Ok(Some(friend)) => {
            if !friend.username.is_empty() && friend.username != user_id {
                println!("Found username in friends list: {}", friend.username);
                return Ok(friend.username);
            } else {
                println!("Friend found but username is empty or same as user_id");
            }
        }
        Ok(None) => {
            println!("User not found in friends list");
        }
        Err(e) => {
            println!("Error getting friend from database: {}", e);
        }
    }
    
    // Final fallback: return a truncated user_id as username
    let truncated_id = if user_id.len() > 8 {
        format!("user_{}", user_id.chars().take(8).collect::<String>())
    } else {
        format!("user_{}", user_id)
    };
    
    println!("Using fallback username: {}", truncated_id);
    Ok(truncated_id)
}

pub async fn get_username_for_user_id(token: &str, user_id: &str) -> Result<String, String> {
    println!("Getting username for user_id: {}", user_id);
    
    // First try to get from local database if we have user data
    match db_async::get_user_by_id(user_id).await {
        Ok(Some(user)) => {
            if !user.username.is_empty() && user.username != user_id {
                println!("Found username in local user database: {}", user.username);
                return Ok(user.username);
            } else {
                println!("User found in local database but username is empty or same as user_id");
            }
        }
        Ok(None) => {
            println!("User not found in local database");
        }
        Err(e) => {
            println!("Error getting user from local database: {}", e);
        }
    }
    
    // If no local user data or username is missing, try to get from friends list
    match db_async::get_friend_by_id(user_id).await {
        Ok(Some(friend)) => {
            if !friend.username.is_empty() && friend.username != user_id {
                println!("Found username in friends list: {}", friend.username);
                return Ok(friend.username);
            } else {
                println!("Friend found but username is empty or same as user_id");
            }
        }
        Ok(None) => {
            println!("User not found in friends list");
        }
        Err(e) => {
            println!("Error getting friend from database: {}", e);
        }
    }
    
    // If we have a token, try to get from API using the proper endpoint
    if !token.is_empty() {
        println!("Attempting to get username from API for user: {}", user_id);
        let client = reqwest::Client::new();
        let res = client
            .get(&format!("https://dev.v1.terracrypt.cc/api/v1/users/{}", user_id))
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await;
            
        if let Ok(response) = res {
            if response.status().is_success() {
                if let Ok(user_data) = response.json::<serde_json::Value>().await {
                    if let Some(username) = user_data["username"].as_str() {
                        if !username.is_empty() && username != user_id {
                            println!("Found username from API: {}", username);
                            // Cache this username in the local database for future use
                            if let Ok(Some(mut user)) = db_async::get_user_by_id(user_id).await {
                                user.username = username.to_string();
                                if let Err(e) = db_async::insert_or_update_user(&user).await {
                                    println!("Failed to cache username for user {}: {}", user_id, e);
                                } else {
                                    println!("Successfully cached username for user {}", user_id);
                                }
                            } else {
                                // Create a new user entry with the fetched username
                                let new_user = db_async::User {
                                    user_id: user_id.to_string(),
                                    username: username.to_string(),
                                    email: Some(user_data["email"].as_str().unwrap_or("").to_string()),
                                    name: Some(user_data["name"].as_str().unwrap_or("").to_string()),
                                    password: None,
                                    picture: user_data["picture"].as_str().map(|s| s.to_string()),
                                    role: user_data["role"].as_str().map(|s| s.to_string()),
                                    token_hash: None,
                                    verified: user_data["verified"].as_bool().unwrap_or(false),
                                    created_at: chrono::Utc::now().timestamp(),
                                    updated_at: chrono::Utc::now().timestamp(),
                                    deleted_at: None,
                                    is_dark_mode: false,
                                    last_seen: chrono::Utc::now().timestamp(),
                                    color_scheme: Some("blue".to_string()),
                                };
                                if let Err(e) = db_async::insert_or_update_user(&new_user).await {
                                    println!("Failed to create user entry for {}: {}", user_id, e);
                                } else {
                                    println!("Successfully created new user entry for {}", user_id);
                                }
                            }
                            return Ok(username.to_string());
                        } else {
                            println!("API returned empty username or same as user_id");
                        }
                    } else {
                        println!("API response does not contain username field");
                    }
                } else {
                    println!("Failed to parse API response as JSON");
                }
            } else {
                println!("API request failed for user {}: status {}", user_id, response.status());
            }
        } else {
            println!("Failed to make API request for user {}: {:?}", user_id, res.err());
        }
    } else {
        println!("No token provided, skipping API call");
    }
    
    // Final fallback: return a truncated user_id as username
    let truncated_id = if user_id.len() > 8 {
        format!("user_{}", user_id.chars().take(8).collect::<String>())
    } else {
        format!("user_{}", user_id)
    };
    
    println!("Using fallback username: {}", truncated_id);
    Ok(truncated_id)
} 