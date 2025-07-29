
export interface UserEntity {
  id: string;
  userId: string;  // For database operations
  username: string;
  name?: string;
  email?: string;
  password?: string;
  picture?: string;
  avatarUrl?: string;
  role?: string;
  tokenHash?: string;
  verified: boolean;
  isDarkMode?: boolean;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  lastSeen?: number;
  lastLogin?: Date;
}

export interface MessageEntity {
  id?: number; // Auto-generated database ID
  messageId?: string; // Server ID, can be null while waiting for ACK
  clientMessageId: string; // Always present, UUID generated locally
  chatId: string;
  senderId: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  isSent: boolean;
  isDelivered: boolean;
  isFailed: boolean;
  senderUsername?: string;
  replyToMessageId?: string;
  // UI-only fields
  profilePictureUrl?: string;
  replyPreviewSender?: string;
  replyPreviewText?: string;
  bubbleColorHex?: string;
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
  chatId: string;
  chatType: string;
  chatName?: string;
  createdAt: number;
  adminId?: string;
  unreadCount: number;
  description?: string;
  groupName?: string;
  lastMessageContent?: string;
  lastMessageTimestamp?: number;
  participants?: string;
  isGroup: boolean;
  creatorId?: string;
}

// Friend Entity
export interface FriendEntity {
  friendId: string;
  username: string;
  email: string;
  name: string;
  picture?: string;
  createdAt?: number;
  updatedAt?: number;
  status?: string;
  isFavorite: boolean;
}

// Participant Entity
export interface ParticipantEntity {
  participantId: string;
  userId: string;
  username: string;
  joinedAt: number;
  role: string;
  chatId: string;
}

// API Models (matching Rust backend)
export interface Chat {
  chat_id: string;
  name: string;
  creator_id: string;
  is_group: boolean;
  description?: string;
  group_name?: string;
  last_message_content?: string;
  last_message_timestamp?: number;
  unread_count: number;
  created_at: number;
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
