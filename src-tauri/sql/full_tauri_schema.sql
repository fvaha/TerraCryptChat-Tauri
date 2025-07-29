-- USERS
CREATE TABLE IF NOT EXISTS user (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    name TEXT,
    password TEXT,
    picture TEXT,
    role TEXT,
    token_hash TEXT,
    verified INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER,
    deleted_at INTEGER,
    is_dark_mode INTEGER DEFAULT 0,
    last_seen INTEGER,
    color_scheme TEXT DEFAULT 'blue'
);

-- CHATS
CREATE TABLE IF NOT EXISTS chat (
    chat_id TEXT PRIMARY KEY,
    name TEXT,
    created_at INTEGER NOT NULL,
    creator_id TEXT,
    is_group INTEGER NOT NULL DEFAULT 0,
    group_name TEXT,
    description TEXT,
    unread_count INTEGER DEFAULT 0,
    last_message_content TEXT,
    last_message_timestamp INTEGER,
    participants TEXT
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    client_message_id TEXT UNIQUE NOT NULL,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_sent INTEGER NOT NULL DEFAULT 0,
    is_delivered INTEGER NOT NULL DEFAULT 0,
    is_failed INTEGER NOT NULL DEFAULT 0,
    sender_username TEXT,
    reply_to_message_id TEXT
);

-- Create indices for messages
CREATE INDEX IF NOT EXISTS idx_message_chat_id ON message(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_timestamp ON message(timestamp);
CREATE INDEX IF NOT EXISTS idx_message_sender_id ON message(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_message_id ON message(message_id);

-- PARTICIPANTS
CREATE TABLE IF NOT EXISTS participant (
    participant_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    role TEXT NOT NULL,
    chat_id TEXT NOT NULL
);

-- FRIENDS
CREATE TABLE IF NOT EXISTS friend (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT,
    name TEXT,
    picture TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    status TEXT,
    is_favorite INTEGER DEFAULT 0
);

-- USER KEYS
CREATE TABLE IF NOT EXISTS user_keys (
    user_id TEXT PRIMARY KEY,
    key1 TEXT,
    key2 TEXT,
    key3 TEXT,
    key4 TEXT,
    private_key1 TEXT,
    private_key2 TEXT,
    private_key3 TEXT,
    private_key4 TEXT
);
