pub mod modules;
pub mod database_async;

use modules::auth::*;
use modules::chat::*;
use modules::database::*;
use modules::friend::*;
use modules::participant::*;
use modules::websocket::*;
use modules::window::*;
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
            get_current_user,
            get_current_user_with_token,
            search_users,

            // Database commands - User
            db_insert_user,
            db_get_user_by_id,
            db_get_user_by_token,
            db_update_user_token,
            db_clear_user_data,
            db_get_most_recent_user,
            db_update_dark_mode,
            db_get_dark_mode,
            db_update_color_scheme,
            db_get_color_scheme,
            db_async_get_user_by_id,
            db_async_get_user_by_token,
            db_async_update_user_token,
            db_async_clear_user_data,
            db_async_insert_user_keys,
            db_async_get_user_keys,
            db_async_update_dark_mode,
            db_async_get_dark_mode,
            db_async_get_most_recent_user,
            db_async_insert_user,
            db_async_delete_chat,
            db_async_get_message_by_id,
            db_async_get_message_by_client_id,
            db_async_update_friend_status,
            db_async_delete_friend,
            db_async_delete_participant,
            db_async_update_participant_role,
            db_async_get_participant_by_id,
            db_async_get_participant_by_user_id_and_chat_id,

            // Chat management
            create_chat,
            fetch_messages,
            save_message,
            get_chats,
            get_chats_with_token,
            send_message,
            get_messages,
            get_cached_chats_with_delta,
            get_cached_chats_only,
            get_cached_messages_for_chat,
            fetch_all_chats_and_save,
            fetch_all_friends_and_save,
            chats_delta_update,
            get_cached_chats_for_current_user,
            delete_chat_from_database,
            leave_chat,
            leave_chat_with_token,
            refresh_direct_chat_names,

            // Database commands - Chat
            db_insert_chat,
            db_insert_or_update_chat,
            db_get_chat_by_id,
            db_get_all_chats,
            db_get_cached_chats_only,
            db_update_chat_unread_count,
            db_update_chat_last_message,
            db_delete_chat_by_id,
            db_clear_chat_data,
            db_async_insert_chat,
            db_async_get_chat_by_id,
            db_async_get_all_chats,
            db_async_update_chat_unread_count,
            db_async_update_chat_last_message,
            db_async_delete_chat_by_id,
            db_async_clear_chat_data,

            // Database commands - Message
            db_insert_message,
            db_insert_messages,
            db_get_message_by_id,
            db_get_message_by_client_id,
            db_get_messages_for_chat,
            db_get_messages_before_timestamp,
            db_get_last_message,
            db_update_message_sent_status,
            db_mark_messages_read_by_server_ids,
            db_get_unread_messages,
            db_count_unread_messages,
            db_mark_messages_as_read,
            db_update_message_id_by_client,
            db_delete_message_by_id,
            db_delete_message_by_client_id,
            db_clear_message_data,
            db_async_insert_message,
            db_async_insert_messages,
            db_async_get_messages_for_chat,
            db_async_get_messages_before_timestamp,
            db_async_get_last_message,
            db_async_update_message_sent_status,
            db_async_mark_messages_read_by_server_ids,
            db_async_update_message_sent_status_by_server_id,
            db_async_mark_message_delivered_by_server_id_new,
            db_async_mark_message_read_by_server_id_new,
            db_async_get_unread_messages,
            db_async_count_unread_messages,
            db_async_mark_messages_as_read,
            db_async_update_message_id_by_client,
            db_async_delete_message_by_id,
            db_async_delete_message_by_client_id,
            db_async_clear_message_data,

            // Friend management
            get_friends,
            get_friends_with_token,
            get_friend_requests_with_token,
            send_friend_request,
            accept_friend_request,
            decline_friend_request,
            get_chat_members_with_token,
            get_cached_friends_only,
            get_cached_friends_with_delta,
            friends_delta_update,
            get_cached_friends_for_current_user,
            delete_friend_from_database,

            // Participant management
            add_participants,
            add_participants_with_token,
            remove_participant,
            remove_participant_with_token,
            update_participant_role,
            update_participant_role_with_token,
            sync_participants_with_api,
            sync_participants_with_api_token,
            get_participant_by_user_id,
            is_participant_in_chat,
            clear_cached_participants,

            // Database commands - Friend
            db_insert_friend,
            db_insert_or_update_friend,
            db_get_all_friends,
            db_get_cached_friends_only,
            db_delete_friend,
            db_clear_friend_data,
            db_insert_participant,
            db_get_participants_for_chat,
            db_clear_participant_data,
            db_async_insert_friend,
            db_async_get_all_friends,
            db_async_clear_friend_data,
            db_async_insert_participant,
            db_async_get_participants_for_chat,
            db_async_clear_participant_data,

            // Database commands - Clear all
            db_initialize_database,
            db_ensure_initialized,
            db_reset_initialization,
            db_clear_all_data,
            db_health_check,
            db_async_clear_all_data,
            db_async_health_check,
            db_async_get_stats,

            // WebSocket commands
            connect_socket,
            disconnect_socket,
            send_socket_message,
            send_socket_binary_message,
            send_socket_ping,

            get_websocket_status,
            reconnect_socket,

            // Window management
            window_show_main_window,
            window_hide_main_window,
            window_close_main_window,
            resize_window,
            center_window,
            minimize_window,
            maximize_window,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            println!("[App] Setting up Tauri v2 application...");
            
            // Initialize database
            tauri::async_runtime::spawn(async {
                match database_async::initialize_database().await {
                    Ok(_) => println!("[App] Database initialized successfully"),
                    Err(e) => eprintln!("[App] Database initialization failed: {}", e),
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
