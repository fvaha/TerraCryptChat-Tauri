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
            save_secure_token,
            load_secure_token,
            clear_secure_token,
            get_current_user,
            get_current_user_with_token,
            search_users,
            
            // Database commands
            db_initialize_database,
            db_ensure_initialized,
            db_reset_initialization,
            db_clear_all_data,
            db_health_check,
            db_get_stats,
            db_reset_database,
            
            // User commands
            db_insert_user,
            db_get_user_by_id,
            db_get_user_by_token,
            db_get_most_recent_user,
            db_update_user_token,
            db_clear_user_data,
            db_update_dark_mode,
            db_get_dark_mode,
            db_update_color_scheme,
            db_get_color_scheme,
            
            // Chat commands
            db_insert_chat,
            db_insert_or_update_chat,
            db_get_chat_by_id,
            db_get_all_chats,
            db_get_cached_chats_only,
            db_update_chat_unread_count,
            db_update_chat_last_message,
            db_delete_chat_by_id,
            db_clear_chat_data,
            
            // Message commands
            db_insert_message,
            db_insert_messages,
            db_get_message_by_id,
            db_get_message_by_client_id,
            db_get_messages_for_chat,
            db_get_messages_before_timestamp,
            db_get_last_message,
            db_update_message_sent_status,
            db_update_message_sent_status_by_server_id,
            db_mark_message_delivered_by_server_id,
            db_mark_message_read_by_server_id,
            db_mark_messages_read_by_server_ids,
            db_get_unread_messages,
            db_count_unread_messages,
            db_mark_messages_as_read,
            db_update_message_id_by_client,
            db_delete_message_by_id,
            db_delete_message_by_client_id,
            db_clear_message_data,
            db_clear_messages_for_chat,
            
            // Friend commands
            db_insert_friend,
            db_insert_or_update_friend,
            db_get_all_friends,
            db_get_cached_friends_only,
            db_get_friend_by_id,
            db_delete_friend,
            db_update_friend_status,
            db_clear_friend_data,
            
            // Participant commands
            db_insert_participant,
            db_get_participants_for_chat,
            db_get_participant_by_id,
            db_get_participant_by_user_id_and_chat_id,
            db_update_participant_role,
            db_delete_participant,
            db_clear_participant_data,
            db_remove_all_participants_for_chat,
            
            // User keys commands
            db_insert_user_keys,
            db_get_user_keys,
            
            // Chat commands
            create_chat,
            delete_chat_from_database,
            leave_chat,
            get_chats,
            get_chats_with_token,
            chats_delta_update,
            send_message,
            get_messages,
            get_cached_chats_with_delta,
            get_cached_chats_only,
            get_cached_chats_for_current_user,
            get_cached_chats_for_current_user_filtered,
            get_cached_messages_for_chat,
            fetch_all_chats_and_save,
            delete_chat,
            leave_chat_with_token,
            refresh_direct_chat_names,
            generate_and_save_chat_name,
            refresh_all_chat_names,
            
            // Friend commands
            get_friends,
            get_friends_with_token,
            friends_delta_update,
            fetch_all_friends_and_save,
            
            // Participant commands
            add_participants,
            add_participants_with_token,
            remove_participant,
            remove_participant_with_token,
            update_participant_role,
            update_participant_role_with_token,
            sync_participants_with_api,
            sync_participants_with_api_token,
            get_cached_participants_for_chat,
            get_participant_by_user_id,
            is_participant_in_chat,
            clear_cached_participants,
            create_participant_from_user_id,
            get_username_for_user_id_command,
            
            // WebSocket commands
            connect_socket,
            disconnect_socket,
            send_socket_message,
            send_socket_binary_message,
            send_socket_ping,
            get_websocket_status,
            reconnect_socket,
            
            // Window commands
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
            println!("[App] Platform: {}", std::env::consts::OS);
            println!("[App] Architecture: {}", std::env::consts::ARCH);
            
            // Initialize database
            tauri::async_runtime::spawn(async {
                match database_async::initialize_database().await {
                    Ok(_) => {
                        println!("[App] Database initialized successfully");
                        // Add a small delay to ensure database is fully ready
                        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                        println!("[App] Database ready for frontend access");
                    },
                    Err(e) => eprintln!("[App] Database initialization failed: {}", e),
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
