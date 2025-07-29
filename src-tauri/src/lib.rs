pub mod commands;
pub mod websocket;
pub mod database;

use commands::*;
use websocket::*;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;

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

pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(HashMap::<String, String>::new())) // Manage token storage
        .manage(Arc::new(TokioMutex::new(WebSocketState::default()))) // Manage WebSocket state
        .manage(Arc::new(SocketTx(TokioMutex::new(None)))) // Manage SocketTx for WebSocket
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            login,
            register,
            save_token,
            load_token,
            remove_token,
            verify_token,
            // Chat management
            create_chat,
            // WebSocket commands
            connect_socket,
            disconnect_socket,
            send_socket_message,
            send_socket_binary_message,
            send_socket_ping,
            get_websocket_status,
            // Message storage
            fetch_messages,
            save_message,
            // Native API commands (No CORS)
            get_current_user,
            get_current_user_with_token,
            get_friends,
            get_friends_with_token,
            get_friend_requests_with_token,
            send_friend_request,
            accept_friend_request,
            decline_friend_request,
            get_chats,
            get_chats_with_token,
            get_chat_members_with_token,
            // Cached data commands
            get_cached_chats_with_delta,
            get_cached_friends_with_delta,
                    get_cached_chats_only,
        get_cached_friends_only,
        get_cached_messages_for_chat,
        get_cached_participants_for_chat,
        fetch_all_chats_and_save,
        fetch_all_friends_and_save,
        chats_delta_update,
        friends_delta_update,
        get_cached_chats_for_current_user,
        get_cached_friends_for_current_user,
        delete_chat_from_database,
        delete_friend_from_database,
            send_message,
            get_messages,
            search_users,
            // Database commands - User
            db_insert_user,
            db_get_user_by_id,
            db_get_user_by_token,
            db_get_most_recent_user,
            db_update_user_token,
            db_clear_user_data,
            // Database commands - Chat
            db_insert_chat,
            db_get_chat_by_id,
            db_get_all_chats,
            db_update_chat_unread_count,
            db_update_chat_last_message,
            db_delete_chat_by_id,
            db_clear_chat_data,
            // Database commands - Message
            db_insert_message,
            db_insert_messages,
            db_get_message_by_id,
            db_get_message_by_client_id,
            db_get_messages_for_chat,
            db_get_messages_before_timestamp,
            db_get_last_message,
            db_update_message_sent_status,
            db_mark_message_delivered_by_server_id,
            db_mark_message_read_by_server_id,
            db_mark_messages_read_by_server_ids,
            db_get_unread_messages,
            db_count_unread_messages,
            db_mark_messages_as_read,
            db_update_message_id_by_client,
    db_message_exists,
    db_get_chat_id_for_message,
    db_reset_unread_count,
    db_increment_unread_count,
    db_get_unread_count,
    db_mark_messages_as_read_by_ids,
    db_clear_messages,
            db_delete_message_by_id,
            db_delete_message_by_client_id,
            db_clear_message_data,
            // Database commands - Friend
            db_insert_friend,
            db_get_all_friends,
            // Window management
            resize_window,
            db_clear_friend_data,
            // Database commands - Participant
            db_insert_participant,
            db_get_participants_for_chat,
            db_clear_participant_data,
            // Database commands - User Keys
            db_insert_user_keys,
            db_get_user_keys,
            // Database commands - Settings
            db_update_dark_mode,
            db_get_dark_mode,
            // Database commands - Clear all
            db_clear_all_data,
            db_reset_database
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize database
            database::initialize_database()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
