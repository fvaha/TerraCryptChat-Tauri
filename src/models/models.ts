
export interface UserEntity {
  id: string;
  user_id: string;  // For database operations
  username: string;
  name?: string;
  email?: string;
  password?: string;
  picture?: string;
  avatar_url?: string;
  role?: string;
  token_hash?: string;
  verified: boolean;
  is_dark_mode?: boolean;
  created_at?: number;
  updated_at?: number;
  deleted_at?: number;
  last_seen?: number;
  last_login?: Date;
  color_scheme?: string;
}

export interface MessageEntity {
  id?: number; // Auto-generated database ID
  message_id?: string; // Server ID, can be null while waiting for ACK
  client_message_id: string; // Always present, UUID generated locally
  chat_id: string;
  sender_id: string;
  content: string;
  message_text?: string; // Alternative field name for content
  timestamp: number;
  is_read: boolean;
  is_sent: boolean;
  is_delivered: boolean;
  is_failed: boolean;
  sender_username?: string;
  reply_to_message_id?: string;
  // UI-only fields
  profile_picture_url?: string;
  reply_preview_sender?: string;
  reply_preview_text?: string;
  bubble_color_hex?: string;
}

// Message send status enum
export enum MessageSendStatus {
  SENT = "sent",
  DELIVERED = "delivered", 
  READ = "read",
  FAILED = "failed"
}

// WebSocket Message Types
export interface ChatMessage {
  message_id: string;
  client_message_id?: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  timestamp?: string;
  sender_username?: string;
  reply_to_message_id?: string;
}

export interface ChatMessageWrapper {
  message: ChatMessage;
  type: "chat";
  client_message_id?: string;
}

export interface DirectChatMessage {
  type: "chat-message";
  message: {
    message_id?: string;
    chat_id: string;
    content: string;
    sender_id: string;
    client_message_id?: string;
    timestamp?: string;
    sender_username?: string;
  };
}

export interface OutgoingChatMessage {
  chat_id: string;
  content: string;
}

export interface OutgoingChatMessageWrapper {
  message: OutgoingChatMessage;
  client_message_id: string;
  type: "chat";
}

export interface MessageStatusPayload {
  message_id?: string;
  client_message_id?: string;
  status: "sent" | "delivered" | "read";
  chat_id?: string;
  sender_id?: string;
  recipient_id?: string;
  timestamp: string;
  message_ids?: string[]; // For bulk read status
}

export interface MessageStatusMessage {
  type: "message-status";
  message: MessageStatusPayload;
}

export interface ConnectionStatusPayload {
  status: string;
  timestamp: string;
}

export interface ConnectionStatusMessage {
  type: "connection-status";
  message: ConnectionStatusPayload;
}

export interface ErrorWebSocketMessage {
  type: "error";
  message: string;
}

export interface InfoWebSocketMessage {
  type: "info";
  message: string;
}

export interface RequestNotification {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  timestamp: string;
}

export interface RequestNotificationWrapper {
  type: "request-notification";
  message: RequestNotification;
}

export interface ChatNotificationMessage {
  chat_id: string;
  creator_id: string;
  name: string;
  is_group: boolean;
  timestamp: string;
  members: string[];
  action: string;
}

export interface ChatNotificationWrapper {
  type: "chat-notification";
  message: ChatNotificationMessage;
}

export type IncomingWSMessage =
  | ChatMessageWrapper
  | DirectChatMessage
  | MessageStatusMessage
  | ConnectionStatusMessage
  | ErrorWebSocketMessage
  | InfoWebSocketMessage
  | RequestNotificationWrapper
  | ChatNotificationWrapper;

// Chat Entity
export interface ChatEntity {
  chat_id: string;
  name?: string;
  created_at: number;
  creator_id?: string;
  is_group: boolean;
  participants?: string;
  unread_count: number;
  last_message_content?: string;
  last_message_timestamp?: number;
}

// Friend Entity
export interface FriendEntity {
  friend_id: string;
  username: string;
  email: string;
  name: string;
  picture?: string;
  created_at?: number;
  updated_at?: number;
  status?: string;
  is_favorite: boolean;
}

// Participant Entity
export interface ParticipantEntity {
  id: string;
  participant_id: string;
  user_id: string;
  chat_id: string;
  username: string;
  name?: string;
  email?: string;
  picture?: string;
  role?: string;
  joined_at: number;
  left_at?: number;
  is_active: boolean;
}

// API Models (matching Rust backend)
export interface Chat {
  chat_id: string;
  name: string;
  created_at: string;
  creator_id: string;
  is_group: boolean;
  group_name?: string;
  description?: string;
  participants?: string[];
  unread_count: number;
  last_message_content?: string;
  last_message_timestamp?: number;
}

export interface Friend {
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  status?: string;
  is_favorite?: boolean;
}

export interface ChatMember {
  user: Friend;
  is_admin: boolean;
  joined_at: string;
}

// User interface (alias for UserEntity)
export interface User extends UserEntity {}

// Message interface (alias for MessageEntity)
export interface Message extends MessageEntity {}

// Participant interface (alias for ParticipantEntity)
export interface Participant extends ParticipantEntity {}

// UserKeys interface for encryption keys
export interface UserKeys {
  user_id: string;
  public_key: string;
  private_key: string;
  created_at: number;
  updated_at: number;
}
