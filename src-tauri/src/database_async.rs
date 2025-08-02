use sqlx::{sqlite::{SqlitePool, SqlitePoolOptions}, Row, Error as SqlxError};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use lazy_static::lazy_static;
use tokio::sync::OnceCell;

// Global database pool
lazy_static! {
    static ref DB_POOL: OnceCell<SqlitePool> = OnceCell::new();
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub user_id: String,
    pub username: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub password: Option<String>,
    pub picture: Option<String>,
    pub role: Option<String>,
    pub token_hash: Option<String>,
    pub verified: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
    pub is_dark_mode: bool,
    pub last_seen: i64,
    pub color_scheme: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chat {
    pub chat_id: String,
    pub name: Option<String>,
    pub created_at: i64,
    pub creator_id: Option<String>,
    pub is_group: bool,
    pub group_name: Option<String>,
    pub description: Option<String>,
    pub unread_count: i32,
    pub last_message_content: Option<String>,
    pub last_message_timestamp: Option<i64>,
    pub participants: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: Option<i64>,
    pub message_id: Option<String>,
    pub client_message_id: String,
    pub chat_id: String,
    pub sender_id: String,
    pub content: String,
    pub timestamp: i64,
    pub is_read: bool,
    pub is_sent: bool,
    pub is_delivered: bool,
    pub is_failed: bool,
    pub sender_username: Option<String>,
    pub reply_to_message_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Friend {
    pub user_id: String,
    pub username: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub status: Option<String>,
    pub is_favorite: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Participant {
    pub participant_id: String,
    pub user_id: String,
    pub username: String,
    pub joined_at: i64,
    pub role: String,
    pub chat_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserKeys {
    pub user_id: String,
    pub key1: String,
    pub key2: String,
    pub key3: String,
    pub key4: String,
    pub private_key1: String,
    pub private_key2: String,
    pub private_key3: String,
    pub private_key4: String,
}

pub fn get_db_path() -> PathBuf {
    let app_data_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            #[cfg(target_os = "macos")]
            let path = std::env::var("HOME").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("/tmp"));
            #[cfg(not(target_os = "macos"))]
            let path = PathBuf::from("/tmp");
            path.join("Library/Application Support")
        });

    let app_dir = app_data_dir.join("terracrypt-chat");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app directory");
    app_dir.join("chat.db")
}

pub async fn get_pool() -> Result<SqlitePool, SqlxError> {
    if let Some(pool) = DB_POOL.get() {
        return Ok(pool.clone());
    }
    
    // Initialize the pool if it doesn't exist
    let pool = initialize_database().await?;
    Ok(pool)
}

pub async fn initialize_database() -> Result<SqlitePool, SqlxError> {
    let db_path = get_db_path();
    println!("[Database] Initializing database at: {:?}", db_path);
    
    // Create parent directory if it doesn't exist
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    
    // Create the database URL
    let database_url = format!("sqlite:{}", db_path.display());
    
    // Create connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(300))
        .connect(&database_url)
        .await?;
    
    println!("[Database] Connected to database");
    
    // Create schema
    let schema_sql = include_str!("../sql/full_tauri_schema.sql");
    println!("[Database] Schema SQL length: {} characters", schema_sql.len());
    
    sqlx::query(schema_sql).execute(&pool).await?;
    println!("[Database] Executed schema successfully");
    
    // Simple verification
    let _: i32 = sqlx::query_scalar("SELECT 1").fetch_one(&pool).await?;
    println!("[Database] Database verification successful");
    
    println!("[Database] Database initialized successfully");
    
    // Store the pool globally
    DB_POOL.set(pool.clone()).ok();
    
    Ok(pool)
}

// Database operations
pub async fn insert_or_update_user(user: &User) -> Result<(), SqlxError> {
    println!("[Database] Starting insert_or_update_user for: {}", user.username);
    
    let pool = get_pool().await?;
    
    sqlx::query(
        "INSERT OR REPLACE INTO user (
            user_id, username, email, name, password, picture,
            role, token_hash, verified, created_at, updated_at,
            deleted_at, is_dark_mode, last_seen, color_scheme
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&user.user_id)
    .bind(&user.username)
    .bind(&user.email)
    .bind(&user.name)
    .bind(&user.password)
    .bind(&user.picture)
    .bind(&user.role)
    .bind(&user.token_hash)
    .bind(user.verified)
    .bind(user.created_at)
    .bind(user.updated_at)
    .bind(user.deleted_at)
    .bind(user.is_dark_mode)
    .bind(user.last_seen)
    .bind(&user.color_scheme)
    .execute(&pool)
    .await?;
    
    println!("[Database] Successfully inserted/updated user: {}", user.username);
    Ok(())
}

pub async fn get_user_by_id(user_id: &str) -> Result<Option<User>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM user WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(User {
            user_id: row.get("user_id"),
            username: row.get("username"),
            email: row.get("email"),
            name: row.get("name"),
            password: row.get("password"),
            picture: row.get("picture"),
            role: row.get("role"),
            token_hash: row.get("token_hash"),
            verified: row.get("verified"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            deleted_at: row.get("deleted_at"),
            is_dark_mode: row.get("is_dark_mode"),
            last_seen: row.get("last_seen"),
            color_scheme: row.get("color_scheme"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_user_by_token(token: &str) -> Result<Option<User>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM user WHERE token_hash = ?")
        .bind(token)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(User {
            user_id: row.get("user_id"),
            username: row.get("username"),
            email: row.get("email"),
            name: row.get("name"),
            password: row.get("password"),
            picture: row.get("picture"),
            role: row.get("role"),
            token_hash: row.get("token_hash"),
            verified: row.get("verified"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            deleted_at: row.get("deleted_at"),
            is_dark_mode: row.get("is_dark_mode"),
            last_seen: row.get("last_seen"),
            color_scheme: row.get("color_scheme"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_most_recent_user() -> Result<Option<User>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM user ORDER BY updated_at DESC LIMIT 1")
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(User {
            user_id: row.get("user_id"),
            username: row.get("username"),
            email: row.get("email"),
            name: row.get("name"),
            password: row.get("password"),
            picture: row.get("picture"),
            role: row.get("role"),
            token_hash: row.get("token_hash"),
            verified: row.get("verified"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            deleted_at: row.get("deleted_at"),
            is_dark_mode: row.get("is_dark_mode"),
            last_seen: row.get("last_seen"),
            color_scheme: row.get("color_scheme"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn update_user_token(user_id: &str, token: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE user SET token_hash = ?, updated_at = ? WHERE user_id = ?")
        .bind(token)
        .bind(chrono::Utc::now().timestamp())
        .bind(user_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn clear_user_data() -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM user").execute(&pool).await?;
    Ok(())
}

// Chat operations
pub async fn insert_or_update_chat(chat: &Chat) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query(
        "INSERT OR REPLACE INTO chat (
            chat_id, name, created_at, creator_id, is_group,
            group_name, description, unread_count, last_message_content,
            last_message_timestamp, participants
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&chat.chat_id)
    .bind(&chat.name)
    .bind(chat.created_at)
    .bind(&chat.creator_id)
    .bind(chat.is_group)
    .bind(&chat.group_name)
    .bind(&chat.description)
    .bind(chat.unread_count)
    .bind(&chat.last_message_content)
    .bind(chat.last_message_timestamp)
    .bind(&chat.participants)
    .execute(&pool)
    .await?;
    
    Ok(())
}

pub async fn get_chat_by_id(chat_id: &str) -> Result<Option<Chat>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM chat WHERE chat_id = ?")
        .bind(chat_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(Chat {
            chat_id: row.get("chat_id"),
            name: row.get("name"),
            created_at: row.get("created_at"),
            creator_id: row.get("creator_id"),
            is_group: row.get("is_group"),
            group_name: row.get("group_name"),
            description: row.get("description"),
            unread_count: row.get("unread_count"),
            last_message_content: row.get("last_message_content"),
            last_message_timestamp: row.get("last_message_timestamp"),
            participants: row.get("participants"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_all_chats() -> Result<Vec<Chat>, SqlxError> {
    let pool = get_pool().await?;
    
    println!("[Database] Loading all chats from database...");
    
    let rows = sqlx::query("SELECT * FROM chat ORDER BY last_message_timestamp DESC NULLS LAST")
        .fetch_all(&pool)
        .await?;
    
    println!("[Database] Found {} chats in database", rows.len());
    
    let chats: Vec<Chat> = rows.iter().map(|row| {
        let chat_id: String = row.get("chat_id");
        let name: Option<String> = row.get("name");
        println!("[Database] Loading chat: id={}, name={:?}", chat_id, name);
        
        Chat {
            chat_id,
            name,
            created_at: row.get("created_at"),
            creator_id: row.get("creator_id"),
            is_group: row.get("is_group"),
            group_name: row.get("group_name"),
            description: row.get("description"),
            unread_count: row.get("unread_count"),
            last_message_content: row.get("last_message_content"),
            last_message_timestamp: row.get("last_message_timestamp"),
            participants: row.get("participants"),
        }
    }).collect();
    
    println!("[Database] Successfully loaded {} chats", chats.len());
    
    Ok(chats)
}

pub async fn update_chat_unread_count(chat_id: &str, unread_count: i32) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE chat SET unread_count = ? WHERE chat_id = ?")
        .bind(unread_count)
        .bind(chat_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn update_chat_last_message(chat_id: &str, content: Option<&str>, timestamp: Option<i64>) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE chat SET last_message_content = ?, last_message_timestamp = ? WHERE chat_id = ?")
        .bind(content)
        .bind(timestamp)
        .bind(chat_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn delete_chat(chat_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    println!("[Database] Attempting to delete chat: {}", chat_id);
    
    // First check if the chat exists
    let chat_exists = sqlx::query("SELECT COUNT(*) as count FROM chat WHERE chat_id = ?")
        .bind(chat_id)
        .fetch_one(&pool)
        .await?;
    
    let count: i64 = chat_exists.get("count");
    println!("[Database] Found {} chat(s) with chat_id: {}", count, chat_id);
    
    if count == 0 {
        println!("[Database] Warning: No chat found with chat_id: {}", chat_id);
        return Ok(());
    }
    
    // Delete the chat
    let result = sqlx::query("DELETE FROM chat WHERE chat_id = ?")
        .bind(chat_id)
        .execute(&pool)
        .await?;
    
    println!("[Database] Successfully deleted {} row(s) from chat table for chat_id: {}", result.rows_affected(), chat_id);
    
    Ok(())
}

pub async fn clear_chat_data() -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM chat").execute(&pool).await?;
    Ok(())
}

// Message operations
pub async fn insert_or_update_message(message: &Message) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    println!("[Database] Inserting/updating message: chat_id={}, sender_id={}, content={}", 
             message.chat_id, message.sender_id, message.content);
    
    sqlx::query(
        "INSERT OR REPLACE INTO message (
            message_id, client_message_id, chat_id, sender_id, content,
            timestamp, is_read, is_sent, is_delivered, is_failed,
            sender_username, reply_to_message_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&message.message_id)
    .bind(&message.client_message_id)
    .bind(&message.chat_id)
    .bind(&message.sender_id)
    .bind(&message.content)
    .bind(message.timestamp)
    .bind(message.is_read)
    .bind(message.is_sent)
    .bind(message.is_delivered)
    .bind(message.is_failed)
    .bind(&message.sender_username)
    .bind(&message.reply_to_message_id)
    .execute(&pool)
    .await?;
    
    println!("[Database] Successfully inserted/updated message for chat: {}", message.chat_id);
    
    Ok(())
}

pub async fn insert_messages(messages: &[Message]) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    for message in messages {
        sqlx::query(
            "INSERT OR REPLACE INTO message (
                message_id, client_message_id, chat_id, sender_id, content,
                timestamp, is_read, is_sent, is_delivered, is_failed,
                sender_username, reply_to_message_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&message.message_id)
        .bind(&message.client_message_id)
        .bind(&message.chat_id)
        .bind(&message.sender_id)
        .bind(&message.content)
        .bind(message.timestamp)
        .bind(message.is_read)
        .bind(message.is_sent)
        .bind(message.is_delivered)
        .bind(message.is_failed)
        .bind(&message.sender_username)
        .bind(&message.reply_to_message_id)
        .execute(&pool)
        .await?;
    }
    
    Ok(())
}

pub async fn get_messages_for_chat(chat_id: &str) -> Result<Vec<Message>, SqlxError> {
    let pool = get_pool().await?;
    
    println!("[Database] Getting messages for chat: {}", chat_id);
    
    let rows = sqlx::query("SELECT * FROM message WHERE chat_id = ? ORDER BY timestamp ASC")
        .bind(chat_id)
        .fetch_all(&pool)
        .await?;
    
    println!("[Database] Found {} messages for chat {}", rows.len(), chat_id);
    
    let messages: Vec<Message> = rows.iter().map(|row| Message {
        id: row.get("id"),
        message_id: row.get("message_id"),
        client_message_id: row.get("client_message_id"),
        chat_id: row.get("chat_id"),
        sender_id: row.get("sender_id"),
        content: row.get("content"),
        timestamp: row.get("timestamp"),
        is_read: row.get("is_read"),
        is_sent: row.get("is_sent"),
        is_delivered: row.get("is_delivered"),
        is_failed: row.get("is_failed"),
        sender_username: row.get("sender_username"),
        reply_to_message_id: row.get("reply_to_message_id"),
    }).collect();
    
    println!("[Database] Returning {} messages for chat {}", messages.len(), chat_id);
    
    Ok(messages)
}

pub async fn get_messages_before_timestamp(chat_id: &str, before_timestamp: i64, limit: i32) -> Result<Vec<Message>, SqlxError> {
    let pool = get_pool().await?;
    
    let rows = sqlx::query("SELECT * FROM message WHERE chat_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT ?")
        .bind(chat_id)
        .bind(before_timestamp)
        .bind(limit)
        .fetch_all(&pool)
        .await?;
    
    let messages: Vec<Message> = rows.iter().map(|row| Message {
        id: row.get("id"),
        message_id: row.get("message_id"),
        client_message_id: row.get("client_message_id"),
        chat_id: row.get("chat_id"),
        sender_id: row.get("sender_id"),
        content: row.get("content"),
        timestamp: row.get("timestamp"),
        is_read: row.get("is_read"),
        is_sent: row.get("is_sent"),
        is_delivered: row.get("is_delivered"),
        is_failed: row.get("is_failed"),
        sender_username: row.get("sender_username"),
        reply_to_message_id: row.get("reply_to_message_id"),
    }).collect();
    
    Ok(messages)
}

pub async fn get_last_message(chat_id: &str) -> Result<Option<Message>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM message WHERE chat_id = ? ORDER BY timestamp DESC LIMIT 1")
        .bind(chat_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(Message {
            id: row.get("id"),
            message_id: row.get("message_id"),
            client_message_id: row.get("client_message_id"),
            chat_id: row.get("chat_id"),
            sender_id: row.get("sender_id"),
            content: row.get("content"),
            timestamp: row.get("timestamp"),
            is_read: row.get("is_read"),
            is_sent: row.get("is_sent"),
            is_delivered: row.get("is_delivered"),
            is_failed: row.get("is_failed"),
            sender_username: row.get("sender_username"),
            reply_to_message_id: row.get("reply_to_message_id"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_message_by_id(message_id: &str) -> Result<Option<Message>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM message WHERE message_id = ?")
        .bind(message_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(Message {
            id: row.get("id"),
            message_id: row.get("message_id"),
            client_message_id: row.get("client_message_id"),
            chat_id: row.get("chat_id"),
            sender_id: row.get("sender_id"),
            content: row.get("content"),
            timestamp: row.get("timestamp"),
            is_read: row.get("is_read"),
            is_sent: row.get("is_sent"),
            is_delivered: row.get("is_delivered"),
            is_failed: row.get("is_failed"),
            sender_username: row.get("sender_username"),
            reply_to_message_id: row.get("reply_to_message_id"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_message_by_client_id(client_message_id: &str) -> Result<Option<Message>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM message WHERE client_message_id = ?")
        .bind(client_message_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(Message {
            id: row.get("id"),
            message_id: row.get("message_id"),
            client_message_id: row.get("client_message_id"),
            chat_id: row.get("chat_id"),
            sender_id: row.get("sender_id"),
            content: row.get("content"),
            timestamp: row.get("timestamp"),
            is_read: row.get("is_read"),
            is_sent: row.get("is_sent"),
            is_delivered: row.get("is_delivered"),
            is_failed: row.get("is_failed"),
            sender_username: row.get("sender_username"),
            reply_to_message_id: row.get("reply_to_message_id"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn update_message_sent_status(client_message_id: &str, is_sent: bool) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE message SET is_sent = ? WHERE client_message_id = ?")
        .bind(is_sent)
        .bind(client_message_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}



// New methods that work with server IDs (message_id field)
pub async fn update_message_sent_status_by_server_id(server_id: &str, is_sent: bool) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE message SET is_sent = ? WHERE message_id = ?")
        .bind(is_sent)
        .bind(server_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn mark_message_delivered_by_server_id_new(server_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE message SET is_delivered = ? WHERE message_id = ?")
        .bind(true)
        .bind(server_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn mark_message_read_by_server_id_new(server_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE message SET is_read = ? WHERE message_id = ?")
        .bind(true)
        .bind(server_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn mark_messages_read_by_server_ids(message_ids: &[String]) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    for message_id in message_ids {
        sqlx::query("UPDATE message SET is_read = ? WHERE message_id = ?")
            .bind(true)
            .bind(message_id)
            .execute(&pool)
            .await?;
    }
    
    Ok(())
}

pub async fn count_unread_messages(chat_id: &str) -> Result<i32, SqlxError> {
    let pool = get_pool().await?;
    
    let count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM message WHERE chat_id = ? AND is_read = ?")
        .bind(chat_id)
        .bind(false)
        .fetch_one(&pool)
        .await?;
    
    Ok(count)
}

pub async fn get_unread_messages(chat_id: &str) -> Result<Vec<Message>, SqlxError> {
    let pool = get_pool().await?;
    
    let rows = sqlx::query("SELECT * FROM message WHERE chat_id = ? AND is_read = ? ORDER BY timestamp ASC")
        .bind(chat_id)
        .bind(false)
        .fetch_all(&pool)
        .await?;
    
    let messages: Vec<Message> = rows.iter().map(|row| Message {
        id: row.get("id"),
        message_id: row.get("message_id"),
        client_message_id: row.get("client_message_id"),
        chat_id: row.get("chat_id"),
        sender_id: row.get("sender_id"),
        content: row.get("content"),
        timestamp: row.get("timestamp"),
        is_read: row.get("is_read"),
        is_sent: row.get("is_sent"),
        is_delivered: row.get("is_delivered"),
        is_failed: row.get("is_failed"),
        sender_username: row.get("sender_username"),
        reply_to_message_id: row.get("reply_to_message_id"),
    }).collect();
    
    Ok(messages)
}

pub async fn mark_messages_as_read(chat_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE message SET is_read = ? WHERE chat_id = ?")
        .bind(true)
        .bind(chat_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn update_message_id_by_client(client_message_id: &str, server_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE message SET message_id = ? WHERE client_message_id = ?")
        .bind(server_id)
        .bind(client_message_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn delete_message_by_id(message_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM message WHERE message_id = ?")
        .bind(message_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn delete_message_by_client_id(client_message_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM message WHERE client_message_id = ?")
        .bind(client_message_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn clear_message_data() -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM message").execute(&pool).await?;
    Ok(())
}

// Friend operations
pub async fn insert_or_update_friend(friend: &Friend) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query(
        "INSERT OR REPLACE INTO friend (
            user_id, username, email, name, picture, created_at,
            updated_at, status, is_favorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&friend.user_id)
    .bind(&friend.username)
    .bind(&friend.email)
    .bind(&friend.name)
    .bind(&friend.picture)
    .bind(friend.created_at)
    .bind(friend.updated_at)
    .bind(&friend.status)
    .bind(friend.is_favorite)
    .execute(&pool)
    .await?;
    
    Ok(())
}

pub async fn get_all_friends() -> Result<Vec<Friend>, SqlxError> {
    let pool = get_pool().await?;
    
    let rows = sqlx::query("SELECT * FROM friend ORDER BY name ASC")
        .fetch_all(&pool)
        .await?;
    
    let friends: Vec<Friend> = rows.iter().map(|row| Friend {
        user_id: row.get("user_id"),
        username: row.get("username"),
        email: row.get("email"),
        name: row.get("name"),
        picture: row.get("picture"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        status: row.get("status"),
        is_favorite: row.get("is_favorite"),
    }).collect();
    
    Ok(friends)
}

pub async fn get_friend_by_id(user_id: &str) -> Result<Option<Friend>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM friend WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        let friend = Friend {
            user_id: row.get("user_id"),
            username: row.get("username"),
            email: row.get("email"),
            name: row.get("name"),
            picture: row.get("picture"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            status: row.get("status"),
            is_favorite: row.get("is_favorite"),
        };
        Ok(Some(friend))
    } else {
        Ok(None)
    }
}

pub async fn delete_friend(user_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM friend WHERE user_id = ?")
        .bind(user_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn clear_friend_data() -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM friend").execute(&pool).await?;
    Ok(())
}

// Participant operations
pub async fn insert_or_update_participant(participant: &Participant) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query(
        "INSERT OR REPLACE INTO participant (
            participant_id, user_id, username, joined_at, role, chat_id
        ) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&participant.participant_id)
    .bind(&participant.user_id)
    .bind(&participant.username)
    .bind(participant.joined_at)
    .bind(&participant.role)
    .bind(&participant.chat_id)
    .execute(&pool)
    .await?;
    
    Ok(())
}

pub async fn get_participants_for_chat(chat_id: &str) -> Result<Vec<Participant>, SqlxError> {
    let pool = get_pool().await?;
    
    let rows = sqlx::query("SELECT * FROM participant WHERE chat_id = ? ORDER BY joined_at ASC")
        .bind(chat_id)
        .fetch_all(&pool)
        .await?;
    
    let participants: Vec<Participant> = rows.iter().map(|row| Participant {
        participant_id: row.get("participant_id"),
        user_id: row.get("user_id"),
        username: row.get("username"),
        joined_at: row.get("joined_at"),
        role: row.get("role"),
        chat_id: row.get("chat_id"),
    }).collect();
    
    Ok(participants)
}

pub async fn clear_participant_data() -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM participant").execute(&pool).await?;
    Ok(())
}

// Additional participant operations needed by frontend
pub async fn get_participant_by_id(participant_id: &str) -> Result<Option<Participant>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM participant WHERE participant_id = ?")
        .bind(participant_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(Participant {
            participant_id: row.get("participant_id"),
            user_id: row.get("user_id"),
            username: row.get("username"),
            joined_at: row.get("joined_at"),
            role: row.get("role"),
            chat_id: row.get("chat_id"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_participant_by_user_id_and_chat_id(user_id: &str, chat_id: &str) -> Result<Option<Participant>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM participant WHERE user_id = ? AND chat_id = ?")
        .bind(user_id)
        .bind(chat_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(Participant {
            participant_id: row.get("participant_id"),
            user_id: row.get("user_id"),
            username: row.get("username"),
            joined_at: row.get("joined_at"),
            role: row.get("role"),
            chat_id: row.get("chat_id"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn delete_participant(participant_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM participant WHERE participant_id = ?")
        .bind(participant_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn update_participant_role(participant_id: &str, role: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE participant SET role = ? WHERE participant_id = ?")
        .bind(role)
        .bind(participant_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

// Additional friend operations needed by frontend
pub async fn update_friend_status(user_id: &str, status: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE friend SET status = ? WHERE user_id = ?")
        .bind(status)
        .bind(user_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

// User keys operations
pub async fn insert_or_update_user_keys(keys: &UserKeys) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query(
        "INSERT OR REPLACE INTO user_keys (
            user_id, key1, key2, key3, key4, private_key1, private_key2, private_key3, private_key4
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&keys.user_id)
    .bind(&keys.key1)
    .bind(&keys.key2)
    .bind(&keys.key3)
    .bind(&keys.key4)
    .bind(&keys.private_key1)
    .bind(&keys.private_key2)
    .bind(&keys.private_key3)
    .bind(&keys.private_key4)
    .execute(&pool)
    .await?;
    
    Ok(())
}

pub async fn get_user_keys(user_id: &str) -> Result<Option<UserKeys>, SqlxError> {
    let pool = get_pool().await?;
    
    let row = sqlx::query("SELECT * FROM user_keys WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(&pool)
        .await?;
    
    if let Some(row) = row {
        Ok(Some(UserKeys {
            user_id: row.get("user_id"),
            key1: row.get("key1"),
            key2: row.get("key2"),
            key3: row.get("key3"),
            key4: row.get("key4"),
            private_key1: row.get("private_key1"),
            private_key2: row.get("private_key2"),
            private_key3: row.get("private_key3"),
            private_key4: row.get("private_key4"),
        }))
    } else {
        Ok(None)
    }
}

// Dark mode operations
pub async fn update_dark_mode(user_id: &str, is_dark_mode: bool) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("UPDATE user SET is_dark_mode = ? WHERE user_id = ?")
        .bind(is_dark_mode)
        .bind(user_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

pub async fn get_dark_mode(user_id: &str) -> Result<bool, SqlxError> {
    let pool = get_pool().await?;
    let result = sqlx::query("SELECT is_dark_mode FROM user WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(&pool)
        .await?;

    Ok(result.map(|row| row.get::<bool, _>("is_dark_mode")).unwrap_or(false))
}

pub async fn update_color_scheme(user_id: &str, color_scheme: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    sqlx::query("UPDATE user SET color_scheme = ? WHERE user_id = ?")
        .bind(color_scheme)
        .bind(user_id)
        .execute(&pool)
        .await?;
    Ok(())
}

pub async fn get_color_scheme(user_id: &str) -> Result<String, SqlxError> {
    let pool = get_pool().await?;
    let result = sqlx::query("SELECT color_scheme FROM user WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(&pool)
        .await?;

    Ok(result.map(|row| row.get::<String, _>("color_scheme")).unwrap_or_else(|| "blue".to_string()))
}

pub async fn health_check() -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    // Simple query to test connection
    let _: i32 = sqlx::query_scalar("SELECT 1").fetch_one(&pool).await?;
    Ok(())
}

pub async fn clear_all_data() -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM user").execute(&pool).await?;
    sqlx::query("DELETE FROM chat").execute(&pool).await?;
    sqlx::query("DELETE FROM message").execute(&pool).await?;
    sqlx::query("DELETE FROM friend").execute(&pool).await?;
    sqlx::query("DELETE FROM participant").execute(&pool).await?;
    sqlx::query("DELETE FROM user_keys").execute(&pool).await?;
    
    Ok(())
}

pub async fn get_database_stats() -> Result<serde_json::Value, SqlxError> {
    let pool = get_pool().await?;
    
    let total_users: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM user").fetch_one(&pool).await?;
    let total_chats: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM chat").fetch_one(&pool).await?;
    let total_messages: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM message").fetch_one(&pool).await?;
    let total_friends: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM friend").fetch_one(&pool).await?;
    
    let stats = serde_json::json!({
        "totalUsers": total_users,
        "totalChats": total_chats,
        "totalMessages": total_messages,
        "totalFriends": total_friends
    });
    
    Ok(stats)
}

// Legacy function for compatibility
pub async fn ensure_database_initialized() -> Result<(), SqlxError> {
    let _pool = get_pool().await?;
    Ok(())
}

// Legacy function for compatibility
pub async fn initialize_database_legacy() -> Result<(), SqlxError> {
    let _pool = get_pool().await?;
    Ok(())
}

// Clear all messages for a specific chat
pub async fn clear_messages_for_chat(chat_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM message WHERE chat_id = ?")
        .bind(chat_id)
        .execute(&pool)
        .await?;
    
    Ok(())
}

// Remove all participants for a specific chat
pub async fn remove_all_participants_for_chat(chat_id: &str) -> Result<(), SqlxError> {
    let pool = get_pool().await?;
    
    sqlx::query("DELETE FROM participant WHERE chat_id = ?")
        .bind(chat_id)
        .execute(&pool)
        .await?;
    
    Ok(())
} 