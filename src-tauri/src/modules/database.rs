use crate::database_async;
use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;

#[derive(Default)]
pub struct DatabaseState(pub Arc<TokioMutex<()>>);

// ======== DATABASE COMMANDS ========

#[tauri::command]
pub async fn db_initialize_database() -> Result<(), String> {
    println!("[Database] Initializing database...");
    let _pool = database_async::initialize_database().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_ensure_initialized() -> Result<(), String> {
    println!("[Database] Ensuring database is initialized...");
    let _pool = database_async::initialize_database().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_reset_initialization() -> Result<(), String> {
    println!("[Database] Resetting database initialization...");
    Ok(())
}

#[tauri::command]
pub async fn db_clear_all_data() -> Result<(), String> {
    println!("[Database] Clearing all data...");
    database_async::clear_all_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_health_check() -> Result<bool, String> {
    println!("[Database] Performing health check...");
    match database_async::health_check().await {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub async fn db_async_clear_all_data() -> Result<(), String> {
    println!("[Database] Clearing all data (async)...");
    database_async::clear_all_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_health_check() -> Result<bool, String> {
    println!("[Database] Performing health check (async)...");
    match database_async::health_check().await {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub async fn db_async_get_stats() -> Result<serde_json::Value, String> {
    println!("[Database] Getting database stats...");
    let stats = database_async::get_database_stats().await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!(stats))
}

// ======== USER COMMANDS ========

#[tauri::command]
pub async fn db_insert_user(user: database_async::User) -> Result<(), String> {
    println!("[Database] Inserting user...");
    database_async::insert_or_update_user(&user).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_user_by_id(user_id: String) -> Result<Option<database_async::User>, String> {
    println!("[Database] Getting user by ID: {}", user_id);
    database_async::get_user_by_id(&user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_user_by_token(token: String) -> Result<Option<database_async::User>, String> {
    println!("[Database] Getting user by token...");
    database_async::get_user_by_token(&token).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_update_user_token(user_id: String, token: String) -> Result<(), String> {
    println!("[Database] Updating user token...");
    database_async::update_user_token(&user_id, &token).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_clear_user_data() -> Result<(), String> {
    println!("[Database] Clearing user data...");
    database_async::clear_user_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_most_recent_user() -> Result<Option<database_async::User>, String> {
    println!("[Database] Getting most recent user...");
    database_async::get_most_recent_user().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_update_dark_mode(user_id: String, is_dark_mode: bool) -> Result<(), String> {
    println!("[Database] Updating dark mode for user: {}", user_id);
    database_async::update_dark_mode(&user_id, is_dark_mode).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_dark_mode(user_id: String) -> Result<bool, String> {
    println!("[Database] Getting dark mode for user: {}", user_id);
    database_async::get_dark_mode(&user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_update_color_scheme(user_id: String, color_scheme: String) -> Result<(), String> {
    println!("[Database] Updating color scheme for user: {}", user_id);
    database_async::update_color_scheme(&user_id, &color_scheme).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_color_scheme(user_id: String) -> Result<String, String> {
    println!("[Database] Getting color scheme for user: {}", user_id);
    database_async::get_color_scheme(&user_id).await.map_err(|e| e.to_string())
}

// ======== ASYNC USER COMMANDS ========

#[tauri::command]
pub async fn db_async_get_user_by_id(user_id: String) -> Result<Option<database_async::User>, String> {
    println!("[Database] Getting user by ID (async): {}", user_id);
    database_async::get_user_by_id(&user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_user_by_token(token: String) -> Result<Option<database_async::User>, String> {
    println!("[Database] Getting user by token (async)...");
    database_async::get_user_by_token(&token).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_user_token(user_id: String, token: String) -> Result<(), String> {
    println!("[Database] Updating user token (async)...");
    database_async::update_user_token(&user_id, &token).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_clear_user_data() -> Result<(), String> {
    println!("[Database] Clearing user data (async)...");
    database_async::clear_user_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_most_recent_user() -> Result<Option<database_async::User>, String> {
    println!("[Database] Getting most recent user (async)...");
    database_async::get_most_recent_user().await.map_err(|e| e.to_string())
}

// ======== CHAT COMMANDS ========

#[tauri::command]
pub async fn db_insert_chat(chat: database_async::Chat) -> Result<(), String> {
    println!("[Database] Inserting chat...");
    database_async::insert_or_update_chat(&chat).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_insert_or_update_chat(chat: database_async::Chat) -> Result<(), String> {
    println!("[Database] Inserting/updating chat...");
    database_async::insert_or_update_chat(&chat).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_chat_by_id(chat_id: String) -> Result<Option<database_async::Chat>, String> {
    println!("[Database] Getting chat by ID: {}", chat_id);
    database_async::get_chat_by_id(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_all_chats() -> Result<Vec<database_async::Chat>, String> {
    println!("[Database] Getting all chats...");
    database_async::get_all_chats().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_cached_chats_only() -> Result<Vec<database_async::Chat>, String> {
    println!("[Database] Getting cached chats only...");
    database_async::get_all_chats().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_update_chat_unread_count(chat_id: String, unread_count: i32) -> Result<(), String> {
    println!("[Database] Updating chat unread count...");
    database_async::update_chat_unread_count(&chat_id, unread_count).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_update_chat_last_message(chat_id: String, content: Option<String>, timestamp: Option<i64>) -> Result<(), String> {
    println!("[Database] Updating chat last message...");
    database_async::update_chat_last_message(&chat_id, content.as_deref(), timestamp).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_chat_by_id(chat_id: String) -> Result<(), String> {
    println!("[Database] Deleting chat by ID: {}", chat_id);
    database_async::delete_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_clear_chat_data() -> Result<(), String> {
    println!("[Database] Clearing chat data...");
    database_async::clear_chat_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_insert_chat(chat: database_async::Chat) -> Result<(), String> {
    println!("[Database] Inserting chat (async)...");
    database_async::insert_or_update_chat(&chat).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_chat_by_id(chat_id: String) -> Result<Option<database_async::Chat>, String> {
    println!("[Database] Getting chat by ID (async): {}", chat_id);
    database_async::get_chat_by_id(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_all_chats() -> Result<Vec<database_async::Chat>, String> {
    println!("[Database] Getting all chats (async)...");
    database_async::get_all_chats().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_chat_unread_count(chat_id: String, unread_count: i32) -> Result<(), String> {
    println!("[Database] Updating chat unread count (async)...");
    database_async::update_chat_unread_count(&chat_id, unread_count).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_chat_last_message(chat_id: String, content: Option<String>, timestamp: Option<i64>) -> Result<(), String> {
    println!("[Database] Updating chat last message (async)...");
    database_async::update_chat_last_message(&chat_id, content.as_deref(), timestamp).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_delete_chat_by_id(chat_id: String) -> Result<(), String> {
    println!("[Database] Deleting chat by ID (async): {}", chat_id);
    database_async::delete_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_clear_chat_data() -> Result<(), String> {
    println!("[Database] Clearing chat data (async)...");
    database_async::clear_chat_data().await.map_err(|e| e.to_string())
}

// ======== MESSAGE COMMANDS ========

#[tauri::command]
pub async fn db_insert_message(message: database_async::Message) -> Result<(), String> {
    println!("[Database] Inserting message...");
    database_async::insert_or_update_message(&message).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_insert_messages(messages: Vec<database_async::Message>) -> Result<(), String> {
    println!("[Database] Inserting messages...");
    database_async::insert_messages(&messages).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_message_by_id(message_id: String) -> Result<Option<database_async::Message>, String> {
    println!("[Database] Getting message by ID: {}", message_id);
    database_async::get_message_by_id(&message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_message_by_client_id(client_message_id: String) -> Result<Option<database_async::Message>, String> {
    println!("[Database] Getting message by client ID: {}", client_message_id);
    database_async::get_message_by_client_id(&client_message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_messages_for_chat(chat_id: String) -> Result<Vec<database_async::Message>, String> {
    println!("[Database] Getting messages for chat: {}", chat_id);
    database_async::get_messages_for_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_messages_before_timestamp(chat_id: String, before_timestamp: i64, limit: i32) -> Result<Vec<database_async::Message>, String> {
    println!("[Database] Getting messages before timestamp...");
    database_async::get_messages_before_timestamp(&chat_id, before_timestamp, limit).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_last_message(chat_id: String) -> Result<Option<database_async::Message>, String> {
    println!("[Database] Getting last message for chat: {}", chat_id);
    database_async::get_last_message(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_update_message_sent_status(client_message_id: String, is_sent: bool) -> Result<(), String> {
    println!("[Database] Updating message sent status...");
    database_async::update_message_sent_status(&client_message_id, is_sent).await.map_err(|e| e.to_string())
}



#[tauri::command]
pub async fn db_mark_messages_read_by_server_ids(message_ids: Vec<String>) -> Result<(), String> {
    println!("[Database] Marking messages as read...");
    database_async::mark_messages_read_by_server_ids(&message_ids).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_unread_messages(chat_id: String) -> Result<Vec<database_async::Message>, String> {
    println!("[Database] Getting unread messages for chat: {}", chat_id);
    database_async::get_unread_messages(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_count_unread_messages(chat_id: String) -> Result<i32, String> {
    println!("[Database] Counting unread messages for chat: {}", chat_id);
    database_async::count_unread_messages(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_mark_messages_as_read(chat_id: String) -> Result<(), String> {
    println!("[Database] Marking messages as read for chat: {}", chat_id);
    database_async::mark_messages_as_read(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_update_message_id_by_client(client_message_id: String, server_id: String) -> Result<(), String> {
    println!("[Database] Updating message ID by client...");
    database_async::update_message_id_by_client(&client_message_id, &server_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_message_by_id(message_id: String) -> Result<(), String> {
    println!("[Database] Deleting message by ID: {}", message_id);
    database_async::delete_message_by_id(&message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_message_by_client_id(client_message_id: String) -> Result<(), String> {
    println!("[Database] Deleting message by client ID: {}", client_message_id);
    database_async::delete_message_by_client_id(&client_message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_clear_message_data() -> Result<(), String> {
    println!("[Database] Clearing message data...");
    database_async::clear_message_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_insert_message(message: database_async::Message) -> Result<(), String> {
    println!("[Database] Inserting message (async)...");
    database_async::insert_or_update_message(&message).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_insert_messages(messages: Vec<database_async::Message>) -> Result<(), String> {
    println!("[Database] Inserting messages (async)...");
    database_async::insert_messages(&messages).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_messages_for_chat(chat_id: String) -> Result<Vec<database_async::Message>, String> {
    println!("[Database] Getting messages for chat (async): {}", chat_id);
    database_async::get_messages_for_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_messages_before_timestamp(chat_id: String, before_timestamp: i64, limit: i32) -> Result<Vec<database_async::Message>, String> {
    println!("[Database] Getting messages before timestamp (async)...");
    database_async::get_messages_before_timestamp(&chat_id, before_timestamp, limit).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_last_message(chat_id: String) -> Result<Option<database_async::Message>, String> {
    println!("[Database] Getting last message for chat (async): {}", chat_id);
    database_async::get_last_message(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_message_sent_status(client_message_id: String, is_sent: bool) -> Result<(), String> {
    println!("[Database] Updating message sent status (async)...");
    database_async::update_message_sent_status(&client_message_id, is_sent).await.map_err(|e| e.to_string())
}



// New methods that work with server IDs
#[tauri::command]
pub async fn db_async_update_message_sent_status_by_server_id(server_id: String, is_sent: bool) -> Result<(), String> {
    println!("[Database] Updating message sent status by server ID (async)...");
    database_async::update_message_sent_status_by_server_id(&server_id, is_sent).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_mark_message_delivered_by_server_id_new(server_id: String) -> Result<(), String> {
    println!("[Database] Marking message as delivered by server ID (async)...");
    database_async::mark_message_delivered_by_server_id_new(&server_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_mark_message_read_by_server_id_new(server_id: String) -> Result<(), String> {
    println!("[Database] Marking message as read by server ID (async)...");
    database_async::mark_message_read_by_server_id_new(&server_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_mark_messages_read_by_server_ids(message_ids: Vec<String>) -> Result<(), String> {
    println!("[Database] Marking messages as read (async)...");
    database_async::mark_messages_read_by_server_ids(&message_ids).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_unread_messages(chat_id: String) -> Result<Vec<database_async::Message>, String> {
    println!("[Database] Getting unread messages for chat (async): {}", chat_id);
    database_async::get_unread_messages(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_count_unread_messages(chat_id: String) -> Result<i32, String> {
    println!("[Database] Counting unread messages for chat (async): {}", chat_id);
    database_async::count_unread_messages(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_mark_messages_as_read(chat_id: String) -> Result<(), String> {
    println!("[Database] Marking messages as read for chat (async): {}", chat_id);
    database_async::mark_messages_as_read(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_message_id_by_client(client_message_id: String, server_id: String) -> Result<(), String> {
    println!("[Database] Updating message ID by client (async)...");
    database_async::update_message_id_by_client(&client_message_id, &server_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_delete_message_by_id(message_id: String) -> Result<(), String> {
    println!("[Database] Deleting message by ID (async): {}", message_id);
    database_async::delete_message_by_id(&message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_delete_message_by_client_id(client_message_id: String) -> Result<(), String> {
    println!("[Database] Deleting message by client ID (async): {}", client_message_id);
    database_async::delete_message_by_client_id(&client_message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_clear_message_data() -> Result<(), String> {
    println!("[Database] Clearing message data (async)...");
    database_async::clear_message_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_clear_messages_for_chat(chat_id: String) -> Result<(), String> {
    println!("[Database] Clearing messages for chat (async): {}", chat_id);
    database_async::clear_messages_for_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_remove_all_participants_for_chat(chat_id: String) -> Result<(), String> {
    println!("[Database] Removing all participants for chat (async): {}", chat_id);
    database_async::remove_all_participants_for_chat(&chat_id).await.map_err(|e| e.to_string())
}

// ======== FRIEND COMMANDS ========

#[tauri::command]
pub async fn db_insert_friend(friend: database_async::Friend) -> Result<(), String> {
    println!("[Database] Inserting friend...");
    database_async::insert_or_update_friend(&friend).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_insert_or_update_friend(friend: database_async::Friend) -> Result<(), String> {
    println!("[Database] Inserting/updating friend...");
    database_async::insert_or_update_friend(&friend).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_all_friends() -> Result<Vec<database_async::Friend>, String> {
    println!("[Database] Getting all friends...");
    database_async::get_all_friends().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_friend(user_id: String) -> Result<(), String> {
    println!("[Database] Deleting friend: {}", user_id);
    database_async::delete_friend(&user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_clear_friend_data() -> Result<(), String> {
    println!("[Database] Clearing friend data...");
    database_async::clear_friend_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_insert_participant(participant: database_async::Participant) -> Result<(), String> {
    println!("[Database] Inserting participant...");
    database_async::insert_or_update_participant(&participant).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_participants_for_chat(chat_id: String) -> Result<Vec<database_async::Participant>, String> {
    println!("[Database] Getting participants for chat: {}", chat_id);
    database_async::get_participants_for_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_clear_participant_data() -> Result<(), String> {
    println!("[Database] Clearing participant data...");
    database_async::clear_participant_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_insert_friend(friend: database_async::Friend) -> Result<(), String> {
    println!("[Database] Inserting friend (async)...");
    database_async::insert_or_update_friend(&friend).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_all_friends() -> Result<Vec<database_async::Friend>, String> {
    println!("[Database] Getting all friends (async)...");
    database_async::get_all_friends().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_cached_friends_only() -> Result<Vec<database_async::Friend>, String> {
    println!("[Database] Getting cached friends only...");
    database_async::get_all_friends().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_clear_friend_data() -> Result<(), String> {
    println!("[Database] Clearing friend data (async)...");
    database_async::clear_friend_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_insert_participant(participant: database_async::Participant) -> Result<(), String> {
    println!("[Database] Inserting participant (async)...");
    database_async::insert_or_update_participant(&participant).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_participants_for_chat(chat_id: String) -> Result<Vec<database_async::Participant>, String> {
    println!("[Database] Getting participants for chat (async): {}", chat_id);
    database_async::get_participants_for_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_clear_participant_data() -> Result<(), String> {
    println!("[Database] Clearing participant data (async)...");
    database_async::clear_participant_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_insert_user_keys(keys: database_async::UserKeys) -> Result<(), String> {
    println!("[Database] Inserting user keys (async)...");
    database_async::insert_or_update_user_keys(&keys).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_user_keys(user_id: String) -> Result<Option<database_async::UserKeys>, String> {
    println!("[Database] Getting user keys (async): {}", user_id);
    database_async::get_user_keys(&user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_dark_mode(user_id: String, is_dark_mode: bool) -> Result<(), String> {
    println!("[Database] Updating dark mode (async) for user: {}", user_id);
    database_async::update_dark_mode(&user_id, is_dark_mode).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_dark_mode(user_id: String) -> Result<bool, String> {
    println!("[Database] Getting dark mode (async) for user: {}", user_id);
    database_async::get_dark_mode(&user_id).await.map_err(|e| e.to_string())
}

// Missing async commands that frontend is calling
#[tauri::command]
pub async fn db_async_insert_user(user: database_async::User) -> Result<(), String> {
    println!("[Database] Inserting user (async)...");
    database_async::insert_or_update_user(&user).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_delete_chat(chat_id: String) -> Result<(), String> {
    println!("[Database] Deleting chat (async)...");
    database_async::delete_chat(&chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_message_by_id(message_id: String) -> Result<Option<database_async::Message>, String> {
    println!("[Database] Getting message by ID (async)...");
    database_async::get_message_by_id(&message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_message_by_client_id(client_message_id: String) -> Result<Option<database_async::Message>, String> {
    println!("[Database] Getting message by client ID (async)...");
    database_async::get_message_by_client_id(&client_message_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_friend_status(friend_id: String, status: String) -> Result<(), String> {
    println!("[Database] Updating friend status (async)...");
    database_async::update_friend_status(&friend_id, &status).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_delete_friend(friend_id: String) -> Result<(), String> {
    println!("[Database] Deleting friend (async)...");
    database_async::delete_friend(&friend_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_delete_participant(participant_id: String) -> Result<(), String> {
    println!("[Database] Deleting participant (async)...");
    database_async::delete_participant(&participant_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_update_participant_role(participant_id: String, role: String) -> Result<(), String> {
    println!("[Database] Updating participant role (async)...");
    database_async::update_participant_role(&participant_id, &role).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_participant_by_id(participant_id: String) -> Result<Option<database_async::Participant>, String> {
    println!("[Database] Getting participant by ID (async)...");
    database_async::get_participant_by_id(&participant_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_participant_by_user_id_and_chat_id(user_id: String, chat_id: String) -> Result<Option<database_async::Participant>, String> {
    println!("[Database] Getting participant by user ID and chat ID (async)...");
    database_async::get_participant_by_user_id_and_chat_id(&user_id, &chat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_reset_database() -> Result<(), String> {
    println!("[Database] Resetting database...");
    database_async::clear_all_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_async_get_friend_by_id(friend_id: String) -> Result<Option<database_async::Friend>, String> {
    println!("[Database] Getting friend by ID (async): {}", friend_id);
    database_async::get_friend_by_id(&friend_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_friend_by_id(friend_id: String) -> Result<Option<database_async::Friend>, String> {
    println!("[Database] Getting friend by ID: {}", friend_id);
    database_async::get_friend_by_id(&friend_id).await.map_err(|e| e.to_string())
}

 