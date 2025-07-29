use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    pub static ref DB_CONNECTION: Mutex<Option<Connection>> = Mutex::new(None);
}

#[derive(Debug, Serialize, Deserialize)]
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
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
pub struct Friend {
    pub user_id: String,  // Changed from friend_id to user_id to match commands
    pub username: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub status: Option<String>,
    pub is_favorite: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Participant {
    pub participant_id: String,
    pub user_id: String,
    pub username: String,
    pub joined_at: i64,
    pub role: String,
    pub chat_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
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
            std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
        });
    
    app_data_dir.join("terracrypt-chat").join("chat.db")
}

pub fn initialize_database() -> Result<()> {
    let db_path = get_db_path();
    println!("[Database] Initializing database at: {:?}", db_path);

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        println!("[Database] Created parent directory: {:?}", parent);
    }

    let conn = Connection::open(&db_path)?;
    println!("[Database] Opened database connection");
    
    let schema_sql = include_str!("../sql/full_tauri_schema.sql");
    println!("[Database] Schema SQL length: {} characters", schema_sql.len());
    println!("[Database] Schema SQL preview: {}", &schema_sql[..schema_sql.len().min(200)]);
    
    conn.execute_batch(schema_sql)?;
    println!("[Database] Executed schema successfully");
    
    // Verify tables were created
    let table_names: Vec<String> = {
        let mut tables = conn.prepare("SELECT name FROM sqlite_master WHERE type='table'")?;
        let result = tables.query_map([], |row| row.get(0))?.collect::<Result<Vec<_>>>()?;
        result
    };
    println!("[Database] Created tables: {:?}", table_names);
    
    // Store the connection
    let mut db_guard = DB_CONNECTION.lock().unwrap();
    *db_guard = Some(conn);
    println!("[Database] Database initialized successfully");

    // Test the database by trying to insert a test record
    println!("[Database] Testing database functionality...");
    let test_result = test_database_functionality();
    match test_result {
        Ok(_) => println!("[Database] Database test passed"),
        Err(e) => println!("[Database] Database test failed: {}", e),
    }

    Ok(())
}

fn test_database_functionality() -> Result<()> {
    // Test friend table
    let test_friend = Friend {
        user_id: "test-user-id".to_string(),
        username: "test-username".to_string(),
        email: "test@example.com".to_string(),
        name: "Test User".to_string(),
        picture: None,
        created_at: None,
        updated_at: None,
        status: None,
        is_favorite: false,
    };
    
    insert_or_update_friend(&test_friend)?;
    println!("[Database] Friend table test passed");
    
    // Test chat table
    let test_chat = Chat {
        chat_id: "test-chat-id".to_string(),
        name: Some("Test Chat".to_string()),
        created_at: chrono::Utc::now().timestamp(),
        creator_id: Some("test-creator".to_string()),
        is_group: false,
        group_name: None,
        description: None,
        unread_count: 0,
        last_message_content: None,
        last_message_timestamp: None,
        participants: None,
    };
    
    insert_or_update_chat(&test_chat)?;
    println!("[Database] Chat table test passed");
    
    // Clean up test data
    let conn = get_connection()?;
    conn.execute("DELETE FROM friend WHERE user_id = ?", params!["test-user-id"])?;
    conn.execute("DELETE FROM chat WHERE chat_id = ?", params!["test-chat-id"])?;
    println!("[Database] Test data cleaned up");
    
    Ok(())
}

fn get_connection() -> Result<Connection> {
    // Always open a new connection - this is simpler and more reliable
    let db_path = get_db_path();
    Connection::open(&db_path)
}

// ========== USER DAO ==========
pub fn insert_or_update_user(user: &User) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "INSERT OR REPLACE INTO user (
            user_id, username, email, name, password, picture,
            role, token_hash, verified, created_at, updated_at,
            deleted_at, is_dark_mode, last_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            user.user_id,
            user.username,
            user.email,
            user.name,
            user.password,
            user.picture,
            user.role,
            user.token_hash,
            user.verified,
            user.created_at,
            user.updated_at,
            user.deleted_at,
            user.is_dark_mode,
            user.last_seen
        ]
    )?;
    Ok(())
}

pub fn get_user_by_id(user_id: &str) -> Result<Option<User>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM user WHERE user_id = ?")?;
    let user_iter = stmt.query_map(params![user_id], |row| {
        Ok(User {
            user_id: row.get(0)?,
            username: row.get(1)?,
            email: row.get(2)?,
            name: row.get(3)?,
            password: row.get(4)?,
            picture: row.get(5)?,
            role: row.get(6)?,
            token_hash: row.get(7)?,
            verified: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            deleted_at: row.get(11)?,
            is_dark_mode: row.get(12)?,
            last_seen: row.get(13)?,
        })
    })?;

    for user in user_iter {
        return Ok(Some(user?));
    }
    Ok(None)
}

pub fn get_user_by_token(token: &str) -> Result<Option<User>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM user WHERE token_hash = ? LIMIT 1")?;
    let user_iter = stmt.query_map(params![token], |row| {
        Ok(User {
            user_id: row.get(0)?,
            username: row.get(1)?,
            email: row.get(2)?,
            name: row.get(3)?,
            password: row.get(4)?,
            picture: row.get(5)?,
            role: row.get(6)?,
            token_hash: row.get(7)?,
            verified: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            deleted_at: row.get(11)?,
            is_dark_mode: row.get(12)?,
            last_seen: row.get(13)?,
        })
    })?;

    for user in user_iter {
        return Ok(Some(user?));
    }
    Ok(None)
}

pub fn update_user_token(user_id: &str, token: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE user SET token_hash = ? WHERE user_id = ?",
        params![token, user_id]
    )?;
    Ok(())
}

pub fn update_dark_mode(user_id: &str, is_dark_mode: bool) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE user SET is_dark_mode = ? WHERE user_id = ?",
        params![is_dark_mode, user_id]
    )?;
    Ok(())
}

pub fn get_dark_mode(user_id: &str) -> Result<bool> {
    let conn = get_connection()?;
    let result = conn.query_row("SELECT is_dark_mode FROM user WHERE user_id = ?", params![user_id], |row| row.get(0))?;
    Ok(result)
}

pub fn get_most_recent_user() -> Result<Option<User>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM user WHERE token_hash IS NOT NULL ORDER BY updated_at DESC LIMIT 1")?;
    let user_iter = stmt.query_map([], |row| {
        Ok(User {
            user_id: row.get(0)?,
            username: row.get(1)?,
            email: row.get(2)?,
            name: row.get(3)?,
            password: row.get(4)?,
            picture: row.get(5)?,
            role: row.get(6)?,
            token_hash: row.get(7)?,
            verified: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            deleted_at: row.get(11)?,
            is_dark_mode: row.get(12)?,
            last_seen: row.get(13)?,
        })
    })?;

    for user in user_iter {
        return Ok(Some(user?));
    }
    Ok(None)
}

pub fn clear_user_data() -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM user", [])?;
    Ok(())
}

// ========== CHAT DAO ==========
pub fn insert_or_update_chat(chat: &Chat) -> Result<()> {
    let conn = get_connection()?;
    
    if chat.chat_id.is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("chat_id cannot be empty".to_string()));
    }
    
    conn.execute(
        "INSERT OR REPLACE INTO chat (
            chat_id, name, created_at, creator_id, is_group, group_name,
            description, unread_count, last_message_content, last_message_timestamp,
            participants
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            chat.chat_id,
            chat.name,
            chat.created_at,
            chat.creator_id,
            chat.is_group,
            chat.group_name,
            chat.description,
            chat.unread_count,
            chat.last_message_content,
            chat.last_message_timestamp,
            chat.participants
        ]
    )?;
    Ok(())
}

pub fn get_chat_by_id(chat_id: &str) -> Result<Option<Chat>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM chat WHERE chat_id = ?")?;
    let chat_iter = stmt.query_map(params![chat_id], |row| {
        Ok(Chat {
            chat_id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            creator_id: row.get(3)?,
            is_group: row.get(4)?,
            group_name: row.get(5)?,
            description: row.get(6)?,
            unread_count: row.get(7)?,
            last_message_content: row.get(8)?,
            last_message_timestamp: row.get(9)?,
            participants: row.get(10)?,
        })
    })?;

    for chat in chat_iter {
        return Ok(Some(chat?));
    }
    Ok(None)
}

pub fn get_all_chats() -> Result<Vec<Chat>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM chat ORDER BY last_message_timestamp DESC")?;
    let chat_iter = stmt.query_map([], |row| {
        Ok(Chat {
            chat_id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            creator_id: row.get(3)?,
            is_group: row.get(4)?,
            group_name: row.get(5)?,
            description: row.get(6)?,
            unread_count: row.get(7)?,
            last_message_content: row.get(8)?,
            last_message_timestamp: row.get(9)?,
            participants: row.get(10)?,
        })
    })?;

    let mut chats = Vec::new();
    for chat in chat_iter {
        match chat {
            Ok(chat) => chats.push(chat),
            Err(e) => {
                eprintln!("Warning: Failed to read chat from database: {}", e);
            }
        }
    }
    Ok(chats)
}

pub fn update_chat_unread_count(chat_id: &str, unread_count: i32) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE chat SET unread_count = ? WHERE chat_id = ?",
        params![unread_count, chat_id]
    )?;
    Ok(())
}

pub fn update_chat_last_message(chat_id: &str, content: Option<String>, timestamp: Option<i64>) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE chat SET last_message_content = ?, last_message_timestamp = ? WHERE chat_id = ?",
        params![content, timestamp, chat_id]
    )?;
    Ok(())
}

pub fn delete_chat_by_id(chat_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM chat WHERE chat_id = ?", params![chat_id])?;
    Ok(())
}

pub fn clear_chat_data() -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM chat", [])?;
    Ok(())
}

// ========== MESSAGE DAO ==========
pub fn insert_or_update_message(message: &Message) -> Result<()> {
    let conn = get_connection()?;
    
    if message.chat_id.is_empty() || message.sender_id.is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("chat_id and sender_id cannot be empty".to_string()));
    }
    
    conn.execute(
        "INSERT OR REPLACE INTO message (
            id, message_id, client_message_id, chat_id, sender_id, content,
            timestamp, is_read, is_sent, is_delivered, is_failed,
            sender_username, reply_to_message_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            message.id,
            message.message_id,
            message.client_message_id,
            message.chat_id,
            message.sender_id,
            message.content,
            message.timestamp,
            message.is_read,
            message.is_sent,
            message.is_delivered,
            message.is_failed,
            message.sender_username,
            message.reply_to_message_id
        ]
    )?;
    Ok(())
}

pub fn insert_messages(messages: &[Message]) -> Result<()> {
    let mut conn = get_connection()?;
    let tx = conn.transaction()?;
    
    for message in messages {
        tx.execute(
            "INSERT OR REPLACE INTO message (
                id, message_id, client_message_id, chat_id, sender_id, content,
                timestamp, is_read, is_sent, is_delivered, is_failed,
                sender_username, reply_to_message_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                message.id,
                message.message_id,
                message.client_message_id,
                message.chat_id,
                message.sender_id,
                message.content,
                message.timestamp,
                message.is_read,
                message.is_sent,
                message.is_delivered,
                message.is_failed,
                message.sender_username,
                message.reply_to_message_id
            ]
        )?;
    }
    
    tx.commit()?;
    Ok(())
}

pub fn get_message_by_id(message_id: &str) -> Result<Option<Message>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM message WHERE message_id = ? LIMIT 1")?;
    let message_iter = stmt.query_map(params![message_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            message_id: row.get(1)?,
            client_message_id: row.get(2)?,
            chat_id: row.get(3)?,
            sender_id: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            is_read: row.get(7)?,
            is_sent: row.get(8)?,
            is_delivered: row.get(9)?,
            is_failed: row.get(10)?,
            sender_username: row.get(11)?,
            reply_to_message_id: row.get(12)?,
        })
    })?;

    for message in message_iter {
        return Ok(Some(message?));
    }
    Ok(None)
}

pub fn get_message_by_client_id(client_message_id: &str) -> Result<Option<Message>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM message WHERE client_message_id = ? LIMIT 1")?;
    let message_iter = stmt.query_map(params![client_message_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            message_id: row.get(1)?,
            client_message_id: row.get(2)?,
            chat_id: row.get(3)?,
            sender_id: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            is_read: row.get(7)?,
            is_sent: row.get(8)?,
            is_delivered: row.get(9)?,
            is_failed: row.get(10)?,
            sender_username: row.get(11)?,
            reply_to_message_id: row.get(12)?,
        })
    })?;

    for message in message_iter {
        return Ok(Some(message?));
    }
    Ok(None)
}

pub fn get_messages_for_chat(chat_id: &str) -> Result<Vec<Message>> {
    if chat_id.is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("chat_id cannot be empty".to_string()));
    }
    
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM message WHERE chat_id = ? ORDER BY timestamp ASC")?;
    let message_iter = stmt.query_map(params![chat_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            message_id: row.get(1)?,
            client_message_id: row.get(2)?,
            chat_id: row.get(3)?,
            sender_id: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            is_read: row.get(7)?,
            is_sent: row.get(8)?,
            is_delivered: row.get(9)?,
            is_failed: row.get(10)?,
            sender_username: row.get(11)?,
            reply_to_message_id: row.get(12)?,
        })
    })?;

    let mut messages = Vec::new();
    for message in message_iter {
        match message {
            Ok(message) => messages.push(message),
            Err(e) => {
                eprintln!("Warning: Failed to read message from database: {}", e);
            }
        }
    }
    Ok(messages)
}

pub fn get_messages_before_timestamp(chat_id: &str, before_timestamp: i64, limit: i32) -> Result<Vec<Message>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM message WHERE chat_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT ?")?;
    let message_iter = stmt.query_map(params![chat_id, before_timestamp, limit], |row| {
        Ok(Message {
            id: row.get(0)?,
            message_id: row.get(1)?,
            client_message_id: row.get(2)?,
            chat_id: row.get(3)?,
            sender_id: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            is_read: row.get(7)?,
            is_sent: row.get(8)?,
            is_delivered: row.get(9)?,
            is_failed: row.get(10)?,
            sender_username: row.get(11)?,
            reply_to_message_id: row.get(12)?,
        })
    })?;

    let mut messages = Vec::new();
    for message in message_iter {
        messages.push(message?);
    }
    Ok(messages)
}

pub fn get_last_message(chat_id: &str) -> Result<Option<Message>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM message WHERE chat_id = ? ORDER BY timestamp DESC LIMIT 1")?;
    let message_iter = stmt.query_map(params![chat_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            message_id: row.get(1)?,
            client_message_id: row.get(2)?,
            chat_id: row.get(3)?,
            sender_id: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            is_read: row.get(7)?,
            is_sent: row.get(8)?,
            is_delivered: row.get(9)?,
            is_failed: row.get(10)?,
            sender_username: row.get(11)?,
            reply_to_message_id: row.get(12)?,
        })
    })?;

    for message in message_iter {
        return Ok(Some(message?));
    }
    Ok(None)
}

pub fn update_message_sent_status(client_message_id: &str, is_sent: bool) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE message SET is_sent = ? WHERE client_message_id = ?",
        params![is_sent, client_message_id]
    )?;
    Ok(())
}

pub fn mark_message_delivered_by_server_id(message_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE message SET is_delivered = 1 WHERE message_id = ?",
        params![message_id]
    )?;
    Ok(())
}

pub fn mark_message_read_by_server_id(message_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE message SET is_read = 1 WHERE message_id = ?",
        params![message_id]
    )?;
    Ok(())
}

pub fn mark_messages_read_by_server_ids(message_ids: &[String]) -> Result<()> {
    if message_ids.is_empty() {
        return Ok(());
    }
    
    let conn = get_connection()?;
    let placeholders = message_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!("UPDATE message SET is_read = 1 WHERE message_id IN ({})", placeholders);
    
    let mut params = Vec::new();
    for id in message_ids {
        params.push(id);
    }
    
    conn.execute(&query, rusqlite::params_from_iter(params))?;
    Ok(())
}

pub fn get_unread_messages(chat_id: &str) -> Result<Vec<Message>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM message WHERE chat_id = ? AND is_read = 0")?;
    let message_iter = stmt.query_map(params![chat_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            message_id: row.get(1)?,
            client_message_id: row.get(2)?,
            chat_id: row.get(3)?,
            sender_id: row.get(4)?,
            content: row.get(5)?,
            timestamp: row.get(6)?,
            is_read: row.get(7)?,
            is_sent: row.get(8)?,
            is_delivered: row.get(9)?,
            is_failed: row.get(10)?,
            sender_username: row.get(11)?,
            reply_to_message_id: row.get(12)?,
        })
    })?;

    let mut messages = Vec::new();
    for message in message_iter {
        messages.push(message?);
    }
    Ok(messages)
}

pub fn count_unread_messages(chat_id: &str) -> Result<i32> {
    let conn = get_connection()?;
    let count = conn.query_row(
        "SELECT COUNT(*) FROM message WHERE chat_id = ? AND is_read = 0",
        params![chat_id],
        |row| row.get(0)
    )?;
    Ok(count)
}

pub fn mark_messages_as_read(chat_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE message SET is_read = 1 WHERE chat_id = ? AND is_read = 0",
        params![chat_id]
    )?;
    Ok(())
}

pub fn update_message_id_by_client(client_message_id: &str, server_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE message SET message_id = ?, is_sent = 1, is_failed = 0 WHERE client_message_id = ?",
        params![server_id, client_message_id]
    )?;
    Ok(())
}

pub fn message_exists(client_message_id: &str, server_message_id: &str) -> Result<bool> {
    let conn = get_connection()?;
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM message WHERE client_message_id = ? OR message_id = ?",
        params![client_message_id, server_message_id],
        |row| row.get(0)
    )?;
    Ok(count > 0)
}

pub fn get_chat_id_for_message(message_id: &str) -> Result<Option<String>> {
    let conn = get_connection()?;
    let result = conn.query_row(
        "SELECT chat_id FROM message WHERE message_id = ? OR client_message_id = ?",
        params![message_id, message_id],
        |row| row.get(0)
    );
    
    match result {
        Ok(chat_id) => Ok(Some(chat_id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn reset_unread_count(chat_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE chat SET unread_count = 0 WHERE chat_id = ?",
        params![chat_id]
    )?;
    Ok(())
}

pub fn increment_unread_count(chat_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "UPDATE chat SET unread_count = unread_count + 1 WHERE chat_id = ?",
        params![chat_id]
    )?;
    Ok(())
}

pub fn get_unread_count(chat_id: &str) -> Result<i32> {
    let conn = get_connection()?;
    let count = conn.query_row(
        "SELECT unread_count FROM chat WHERE chat_id = ?",
        params![chat_id],
        |row| row.get(0)
    )?;
    Ok(count)
}

pub fn mark_messages_as_read_by_ids(message_ids: &[String]) -> Result<()> {
    if message_ids.is_empty() {
        return Ok(());
    }
    
    let conn = get_connection()?;
    let placeholders = message_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!("UPDATE message SET is_read = 1 WHERE message_id IN ({})", placeholders);
    
    let mut stmt = conn.prepare(&query)?;
    stmt.execute(rusqlite::params_from_iter(message_ids))?;
    
    Ok(())
}

pub fn clear_messages(chat_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "DELETE FROM message WHERE chat_id = ?",
        params![chat_id]
    )?;
    Ok(())
}

pub fn delete_message_by_id(message_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM message WHERE message_id = ?", params![message_id])?;
    Ok(())
}

pub fn delete_message_by_client_id(client_message_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM message WHERE client_message_id = ?", params![client_message_id])?;
    Ok(())
}

pub fn clear_message_data() -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM message", [])?;
    Ok(())
}

// ========== FRIEND DAO ==========
pub fn insert_or_update_friend(friend: &Friend) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "INSERT OR REPLACE INTO friend (
            user_id, username, email, name, picture, created_at, updated_at, status, is_favorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            friend.user_id,
            friend.username,
            friend.email,
            friend.name,
            friend.picture,
            friend.created_at,
            friend.updated_at,
            friend.status,
            friend.is_favorite
        ]
    )?;
    Ok(())
}

pub fn get_all_friends() -> Result<Vec<Friend>> {
    println!("[Database] Getting all friends from database...");
    let conn = get_connection()?;
    println!("[Database] Got database connection");
    
    let mut stmt = conn.prepare("SELECT * FROM friend ORDER BY name ASC")?;
    println!("[Database] Prepared query successfully");
    
    let friend_iter = stmt.query_map([], |row| {
        Ok(Friend {
            user_id: row.get(0)?,
            username: row.get(1)?,
            email: row.get(2)?,
            name: row.get(3)?,
            picture: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            status: row.get(7)?,
            is_favorite: row.get(8)?,
        })
    })?;
    println!("[Database] Query executed successfully");

    let mut friends = Vec::new();
    for friend in friend_iter {
        friends.push(friend?);
    }
    println!("[Database] Retrieved {} friends from database", friends.len());
    Ok(friends)
}

pub fn clear_friend_data() -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM friend", [])?;
    Ok(())
}

// ========== PARTICIPANT DAO ==========
pub fn insert_or_update_participant(participant: &Participant) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "INSERT OR REPLACE INTO participant (
            participant_id, user_id, username, joined_at, role, chat_id
        ) VALUES (?, ?, ?, ?, ?, ?)",
        params![
            participant.participant_id,
            participant.user_id,
            participant.username,
            participant.joined_at,
            participant.role,
            participant.chat_id
        ]
    )?;
    Ok(())
}

pub fn get_participants_for_chat(chat_id: &str) -> Result<Vec<Participant>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM participant WHERE chat_id = ?")?;
    let participant_iter = stmt.query_map(params![chat_id], |row| {
        Ok(Participant {
            participant_id: row.get(0)?,
            user_id: row.get(1)?,
            username: row.get(2)?,
            joined_at: row.get(3)?,
            role: row.get(4)?,
            chat_id: row.get(5)?,
        })
    })?;

    let mut participants = Vec::new();
    for participant in participant_iter {
        participants.push(participant?);
    }
    Ok(participants)
}

pub fn clear_participant_data() -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM participant", [])?;
    Ok(())
}

// ========== USER KEYS DAO ==========
pub fn insert_or_update_user_keys(keys: &UserKeys) -> Result<()> {
    let conn = get_connection()?;
    conn.execute(
        "INSERT OR REPLACE INTO user_keys (
            user_id, key1, key2, key3, key4, private_key1, private_key2, private_key3, private_key4
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            keys.user_id,
            keys.key1,
            keys.key2,
            keys.key3,
            keys.key4,
            keys.private_key1,
            keys.private_key2,
            keys.private_key3,
            keys.private_key4
        ]
    )?;
    Ok(())
}

pub fn get_user_keys(user_id: &str) -> Result<Option<UserKeys>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM user_keys WHERE user_id = ?")?;
    let keys_iter = stmt.query_map(params![user_id], |row| {
        Ok(UserKeys {
            user_id: row.get(0)?,
            key1: row.get(1)?,
            key2: row.get(2)?,
            key3: row.get(3)?,
            key4: row.get(4)?,
            private_key1: row.get(5)?,
            private_key2: row.get(6)?,
            private_key3: row.get(7)?,
            private_key4: row.get(8)?,
        })
    })?;

    for keys in keys_iter {
        return Ok(Some(keys?));
    }
    Ok(None)
}

// ========== CLEAR ALL DATA ==========
pub fn clear_all_data() -> Result<()> {
    clear_user_data()?;
    clear_chat_data()?;
    clear_message_data()?;
    clear_friend_data()?;
    clear_participant_data()?;
    Ok(())
}

// Additional functions for the new service architecture
pub fn delete_chat(chat_id: &str) -> Result<()> {
    delete_chat_by_id(chat_id)
}

pub fn delete_friend(user_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM friend WHERE user_id = ?", params![user_id])?;
    Ok(())
} 