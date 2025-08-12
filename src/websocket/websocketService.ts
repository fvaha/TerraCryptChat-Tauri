import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { apiService } from "../api/apiService";
import { messageLinkingManager } from '../linking/messageLinkingManager';

export enum ConnectionState {
  Connected = "connected",
  Disconnected = "disconnected",
  Connecting = "connecting",
}

export interface WebSocketStatus {
  connection_state: ConnectionState;
  is_connected: boolean;
  is_connecting: boolean;
  reconnect_attempts: number;
  last_heartbeat: number;
  max_reconnect_attempts: number;
  heartbeat_interval: number;
}

// Backend message types based on API documentation
export interface WebSocketMessage {
  type: string;
  message: unknown;
  timestamp?: number;
}

// Chat message structure from backend
export interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  recipients?: MessageRecipientStatus[];
}

export interface MessageRecipientStatus {
  message_id: string;
  recipient_id: string;
  status: "sent" | "delivered" | "read";
  updated_at: string;
}

// Message status update from backend
export interface MessageStatusMessage {
  message_id?: string;
  client_message_id?: string;
  status: "sent" | "delivered" | "read";
  recipient_id?: string;
  chat_id: string;
  sender_id: string;
  timestamp: string;
}

// Connection status from backend
export interface ConnectionStatusMessage {
  status: "established" | "connected" | "disconnected";
  timestamp: string;
}

// Friend request notification from backend
export interface FriendRequestNotification {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  timestamp: string;
  sender?: {
    user_id: string;
    username: string;
    name: string;
    email: string;
    picture?: string;
  };
}

// Chat notification from backend
export interface ChatNotification {
  chat_id: string;
  creator_id: string;
  name?: string;
  is_group: boolean;
  timestamp: string;
  members: string[];
  action: "created" | "deleted";
}

// Error message from backend
export interface ErrorMessage {
  error: string;
  timestamp: string;
}

// Union type for all possible message types
export type WebSocketMessageData = 
  | { type: "chat"; message: ChatMessage }
  | { type: "message-status"; message: MessageStatusMessage }
  | { type: "connection-status"; message: ConnectionStatusMessage }
  | { type: "request-notification"; message: FriendRequestNotification }
  | { type: "chat-notification"; message: ChatNotification }
  | { type: "error"; message: ErrorMessage }
  | { type: "message-saved"; message: any }
  | { type: "message-status-update"; message: any }
  | { type: "typing"; message: any }
  | { type: "read-receipt"; message: any };

export class WebSocketService {
  private static instance: WebSocketService;
  private statusHandlers: Array<(status: WebSocketStatus) => void> = [];
  private messageHandlers: Set<(message: WebSocketMessageData) => void> = new Set();
  private connectionState: ConnectionState = ConnectionState.Disconnected;
  private reconnectAttempts: number = 0;
  private lastHeartbeat: number = 0;
  private maxReconnectAttempts: number = 5;
  private heartbeatInterval: number = 30000;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    console.log("[WebSocketService] Setting up event listeners...");
    
    // Listen for WebSocket status updates
    listen<WebSocketStatus>("websocket-status", (event) => {
      console.log("[WebSocketService] Received websocket-status event:", event);
      this.connectionState = event.payload.connection_state;
      this.notifyStatusHandlers(event.payload);
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up status listener:", error);
    });

    // Listen for connection status updates
    listen("connection-status-update", (event) => {
      if (event.payload) {
        console.log("[WebSocketService] Received connection-status-update:", event.payload);
        this.updateConnectionStatus(event.payload as string);
      }
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up connection-status-update listener:", error);
    });

    // Listen for WebSocket messages from backend
    listen<any>("message", (event) => {
      console.log("[WebSocketService] Received message event:", event.payload);
      if (event.payload) {
        this.handleBackendMessage(event.payload);
      }
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up message listener:", error);
    });

    // Listen for message-saved events from Rust backend
    listen<any>("message-saved", (event) => {
      console.log("[WebSocketService] Received message-saved event:", event.payload);
      if (event.payload) {
        this.notifyMessageHandlers({
          type: "message-saved",
          message: event.payload
        });
      }
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up message-saved listener:", error);
    });

    // Listen for message-status-update events from Rust backend
    listen<any>("message-status-update", (event) => {
      console.log("[WebSocketService] Received message-status-update event:", event.payload);
      if (event.payload) {
        this.notifyMessageHandlers({
          type: "message-status-update",
          message: event.payload
        });
      }
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up message-status-update listener:", error);
    });
    
    console.log("[WebSocketService] Event listeners set up successfully");
  }

  private handleBackendMessage(rawMessage: any) {
    try {
      let messageData: any;
      
      // Parse the message if it's a string
      if (typeof rawMessage === 'string') {
        messageData = JSON.parse(rawMessage);
      } else {
        messageData = rawMessage;
      }
      
      console.log("[WebSocketService] Parsed message data:", messageData);
      
      // Validate message structure
      if (!messageData || !messageData.type) {
        console.warn("[WebSocketService] Message missing type field:", messageData);
        return;
      }
      
      // Handle different message types based on backend format
      switch (messageData.type) {
        case "chat":
          this.handleChatMessage(messageData);
          break;
        case "message-status":
          this.handleMessageStatus(messageData);
          break;
        case "connection-status":
          this.handleConnectionStatus(messageData);
          break;
        case "request-notification":
          this.handleFriendRequestNotification(messageData);
          break;
        case "chat-notification":
          // REMOVED: Chat notification handling - MessageService handles this directly
          // This prevents duplicate processing and duplicate chat creation
          console.log("[WebSocketService] Chat notification received, forwarding to MessageService directly");
          // Forward the raw message data to MessageService without processing
          this.notifyMessageHandlers(messageData as WebSocketMessageData);
          break;
        case "error":
          this.handleErrorMessage(messageData);
          break;
        default:
          console.warn("[WebSocketService] Unknown message type:", messageData.type);
          // Still emit unknown messages for potential handling
          this.notifyMessageHandlers(messageData as WebSocketMessageData);
      }
    } catch (error) {
      console.error("[WebSocketService] Failed to parse WebSocket message:", error);
    }
  }

  private handleChatMessage(messageData: any) {
    console.log("[WebSocketService] Handling chat message:", messageData);
    
    if (messageData.message && typeof messageData.message === 'object') {
      // Backend sends: { type: "chat", message: { ... } }
      const chatMessage: WebSocketMessageData = {
        type: "chat",
        message: messageData.message as ChatMessage
      };
      this.notifyMessageHandlers(chatMessage);
    } else {
      console.warn("[WebSocketService] Invalid chat message format:", messageData);
    }
  }

  private handleMessageStatus(messageData: any) {
    console.log("[WebSocketService] Handling message status:", messageData);
    
    if (messageData.message && typeof messageData.message === 'object') {
      const statusMessage: WebSocketMessageData = {
        type: "message-status",
        message: messageData.message as MessageStatusMessage
      };
      
      // FIXED: Don't update message status directly here
      // Instead, forward to MessageService for proper handling and linking
      console.log("[WebSocketService] Forwarding message status to MessageService:", statusMessage);
      
      this.notifyMessageHandlers(statusMessage);
    } else {
      console.warn("[WebSocketService] Invalid message status format:", messageData);
    }
  }

  private handleConnectionStatus(messageData: any) {
    console.log("[WebSocketService] Handling connection status:", messageData);
    
    if (messageData.message && typeof messageData.message === 'object') {
      const connectionMessage: WebSocketMessageData = {
        type: "connection-status",
        message: messageData.message as ConnectionStatusMessage
      };
      
      // Update local connection state
      const status = connectionMessage.message as ConnectionStatusMessage;
      if (status.status === "established" || status.status === "connected") {
        this.connectionState = ConnectionState.Connected;
      } else if (status.status === "disconnected") {
        this.connectionState = ConnectionState.Disconnected;
      }
      
      this.notifyMessageHandlers(connectionMessage);
      this.emitStatus();
    } else {
      console.warn("[WebSocketService] Invalid connection status format:", messageData);
    }
  }

  private handleFriendRequestNotification(messageData: any) {
    console.log("[WebSocketService] Handling friend request notification:", messageData);
    
    if (messageData.message && typeof messageData.message === 'object') {
      const friendRequestMessage: WebSocketMessageData = {
        type: "request-notification",
        message: messageData.message as FriendRequestNotification
      };
      this.notifyMessageHandlers(friendRequestMessage);
    } else {
      console.warn("[WebSocketService] Invalid friend request notification format:", messageData);
    }
  }

  private handleErrorMessage(messageData: any) {
    console.error("[WebSocketService] Handling error message:", messageData);
    
    if (messageData.message && typeof messageData.message === 'object') {
      const errorMessage: WebSocketMessageData = {
        type: "error",
        message: messageData.message as ErrorMessage
      };
      this.notifyMessageHandlers(errorMessage);
    } else {
      console.warn("[WebSocketService] Invalid error message format:", messageData);
    }
  }

  private notifyStatusHandlers(status: WebSocketStatus) {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error("[WebSocketService] Error in status handler:", error);
      }
    });
  }

  private notifyMessageHandlers(message: WebSocketMessageData) {
    console.log("[WebSocketService] Notifying message handlers:", message);
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error("[WebSocketService] Error in message handler:", error);
      }
    });
  }

  private updateConnectionStatus(status: string) {
    if (status === "connected" || status === "established") {
      this.connectionState = ConnectionState.Connected;
    } else if (status === "connecting") {
      this.connectionState = ConnectionState.Connecting;
    } else if (status === "disconnected" || status === "heartbeat_timeout") {
      this.connectionState = ConnectionState.Disconnected;
    } else {
      this.connectionState = ConnectionState.Disconnected;
    }
    
    this.emitStatus();
  }

  private emitStatus() {
    const status: WebSocketStatus = {
      connection_state: this.connectionState,
      is_connected: this.connectionState === ConnectionState.Connected,
      is_connecting: this.connectionState === ConnectionState.Connecting,
      reconnect_attempts: this.reconnectAttempts,
      last_heartbeat: this.lastHeartbeat,
      max_reconnect_attempts: this.maxReconnectAttempts,
      heartbeat_interval: this.heartbeatInterval,
    };

    this.notifyStatusHandlers(status);
  }

  async connect(token: string): Promise<void> {
    if (this.connectionState !== ConnectionState.Disconnected) {
      return;
    }

    try {
      this.connectionState = ConnectionState.Connecting;
      this.emitStatus();

      // Listen for connection status from Tauri
      const unlisten = await listen('websocket-status', (event) => {
        console.log("[WebSocketService] Received websocket-status event:", event);
        const status = event.payload as any;
        if (status.connection_state === "connected") {
          this.connectionState = ConnectionState.Connected;
          this.emitStatus();
          console.log("[WebSocketService] WebSocket connection confirmed as connected");
        }
      });

      await invoke("connect_socket", { token });
      apiService.setToken(token);
      
      // Wait a bit for the connection to be established
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If still connecting after timeout, assume connection failed
      if (this.connectionState === ConnectionState.Connecting) {
        console.warn("[WebSocketService] WebSocket connection timeout, assuming failed");
        this.connectionState = ConnectionState.Disconnected;
        this.emitStatus();
        unlisten();
        throw new Error("WebSocket connection timeout");
      }
      
      unlisten();
    } catch (error) {
      console.error("[WebSocketService] Failed to connect WebSocket:", error);
      this.connectionState = ConnectionState.Disconnected;
      this.emitStatus();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await invoke("disconnect_socket");
      this.connectionState = ConnectionState.Disconnected;
      this.emitStatus();
    } catch (error) {
      console.error("[WebSocketService] Failed to disconnect WebSocket:", error);
    }
  }

  async sendMessage(message: WebSocketMessageData): Promise<void> {
    if (this.connectionState !== ConnectionState.Connected) {
      throw new Error("WebSocket not connected");
    }

    try {
      const messageStr = JSON.stringify(message);
      
      // Log the complete message payload structure before sending
      console.log("🔍 [WebSocketService] SENDING MESSAGE PAYLOAD:");
      console.log("📤 Raw message object:", message);
      console.log("📤 JSON stringified message:", messageStr);
      console.log("📤 Message type:", message.type);
      console.log("📤 Message content structure:", message.message);
      console.log("📤 Full payload structure:", {
        type: message.type,
        message: message.message
      });
      console.log("📤 Payload size (bytes):", new Blob([messageStr]).size);
      console.log("🔍 [WebSocketService] END PAYLOAD LOG");
      
      await invoke("send_socket_message", { message: messageStr });
    } catch (error) {
      console.error("[WebSocketService] Failed to send WebSocket message:", error);
      throw error;
    }
  }

  async sendChatMessage(chatId: string, content: string, clientMessageId?: string): Promise<void> {
    const message: WebSocketMessageData = {
      type: "chat",
      message: {
        chat_id: chatId,
        content: content,
        client_message_id: clientMessageId || this.generateClientId(),
        timestamp: new Date().toISOString()
      } as any // Cast to any since our ChatMessage interface doesn't have client_message_id
    };
    
    console.log("🔍 [WebSocketService] sendChatMessage PAYLOAD:");
    console.log("📤 Chat ID:", chatId);
    console.log("📤 Content:", content);
    console.log("📤 Client message ID:", clientMessageId || this.generateClientId());
    console.log("📤 Constructed message object:", message);
    console.log("🔍 [WebSocketService] END sendChatMessage LOG");
    
    await this.sendMessage(message);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async reconnect(token: string): Promise<void> {
    try {
      await invoke("reconnect_socket", { token });
    } catch (error) {
      console.error("[WebSocketService] Failed to reconnect:", error);
      throw error;
    }
  }

  async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    const message: WebSocketMessageData = {
      type: "typing",
      message: {
        chat_id: chatId,
        is_typing: isTyping,
        timestamp: new Date().toISOString()
      } as any
    };
    
    await this.sendMessage(message);
  }

  async sendReadReceipt(chatId: string, messageId: string): Promise<void> {
    const message: WebSocketMessageData = {
      type: "read-receipt",
      message: {
        chat_id: chatId,
        message_id: messageId,
        timestamp: new Date().toISOString()
      } as any
    };
    
    await this.sendMessage(message);
  }

  async getStatus(): Promise<WebSocketStatus> {
    try {
      const status = await invoke<WebSocketStatus>("get_websocket_status");
      return status;
    } catch (error) {
      console.error("Failed to get WebSocket status:", error);
      return {
        connection_state: ConnectionState.Disconnected,
        is_connected: false,
        is_connecting: false,
        reconnect_attempts: 0,
        last_heartbeat: 0,
        max_reconnect_attempts: this.maxReconnectAttempts,
        heartbeat_interval: this.heartbeatInterval,
      };
    }
  }

  onStatusChange(handler: (status: WebSocketStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  offStatusChange(handler: (status: WebSocketStatus) => void): void {
    const index = this.statusHandlers.indexOf(handler);
    if (index > -1) {
      this.statusHandlers.splice(index, 1);
    }
  }

  onMessage(handler: (message: WebSocketMessageData) => void): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: (message: WebSocketMessageData) => void): void {
    this.messageHandlers.delete(handler);
  }

  isConnectedToServer(): boolean {
    return this.connectionState === ConnectionState.Connected;
  }

  getConnectionInfo() {
    return {
      connectionState: this.connectionState,
      isConnected: this.connectionState === ConnectionState.Connected,
      isConnecting: this.connectionState === ConnectionState.Connecting,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      maxReconnectAttempts: this.maxReconnectAttempts,
      heartbeatInterval: this.heartbeatInterval,
    };
  }
}

export const websocketService = new WebSocketService(); 
