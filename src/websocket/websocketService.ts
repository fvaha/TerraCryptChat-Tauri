import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { apiService } from "../api/apiService";

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

export interface WebSocketMessage {
  type: string;
  message: any;
  timestamp: number;
}

export interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  is_read: boolean;
  is_sent: boolean;
  is_delivered: boolean;
}

export interface MessageStatusMessage {
  type: "message-status";
  message: {
    message_id: string;
    status: "sent" | "delivered" | "read";
    chat_id: string;
    sender_id: string;
  };
}

export interface ConnectionStatusMessage {
  type: "connection-status";
  message: {
    status: "connected" | "disconnected" | "heartbeat_timeout";
    timestamp: number;
  };
}

export interface FriendRequestNotification {
  type: "request-notification";
  message: {
    request_id: string;
    sender_id: string;
    receiver_id: string;
    status: "pending" | "accepted" | "declined";
    timestamp: number;
    sender: {
      user_id: string;
      username: string;
      name: string;
      email: string;
      picture?: string;
      is_favorite: boolean;
    };
  };
}

export interface ChatNotification {
  type: "chat-notification";
  message: {
    action: "created" | "deleted";
    chat_id: string;
    members: string[];
    timestamp: number;
  };
}

export class WebSocketService {
  private static instance: WebSocketService;
  private statusHandlers: Array<(status: WebSocketStatus) => void> = [];
  private messageHandlers: Set<(message: any) => void> = new Set();
  private isConnected: boolean = false;
  private connectionInfo: any = {};
  private connectionState: ConnectionState = ConnectionState.Disconnected;
  private reconnectAttempts: number = 0;
  private lastHeartbeat: number = 0;
  private maxReconnectAttempts: number = 5;
  private heartbeatInterval: number = 30000;

  constructor() {
    console.log("[WebSocketService] Initializing WebSocket service");
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    console.log("[WebSocketService] Setting up event listeners...");
    
    // Listen for WebSocket status updates
    listen<WebSocketStatus>("websocket-status", (event) => {
      console.log("[WebSocketService] Received websocket-status event:", event);
      this.isConnected = event.payload.is_connected;
      this.connectionInfo = event.payload;
      this.notifyStatusHandlers(event.payload);
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up status listener:", error);
    });

    // Listen for WebSocket messages
    listen<any>("message", (event) => {
      console.log("[WebSocketService] Received message event:", event);
      this.notifyMessageHandlers(event.payload);
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up message listener:", error);
    });
    
    console.log("[WebSocketService] Event listeners set up successfully");
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

  private notifyMessageHandlers(message: any) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error("[WebSocketService] Error in message handler:", error);
      }
    });
  }

  private updateConnectionStatus(status: string) {
    console.log("[WebSocketService] Updating connection status:", status);
    
    if (status === "connected" || status === "established") {
      this.connectionState = ConnectionState.Connected;
      console.log("[WebSocketService] Connection state set to Connected");
    } else if (status === "connecting") {
      this.connectionState = ConnectionState.Connecting;
      console.log("[WebSocketService] Connection state set to Connecting");
    } else if (status === "disconnected" || status === "heartbeat_timeout") {
      this.connectionState = ConnectionState.Disconnected;
      console.log("[WebSocketService] Connection state set to Disconnected");
    } else {
      console.warn("[WebSocketService] Unknown status:", status);
      // Treat unknown status as disconnected for safety
      this.connectionState = ConnectionState.Disconnected;
    }
    
    this.emitStatus();
  }

  private emitStatus() {
    console.log("[WebSocketService]  Emitting status to handlers...");
    console.log("[WebSocketService] Current connection state:", this.connectionState);
    console.log("[WebSocketService] Number of status handlers:", this.statusHandlers.length);
    
    const status: WebSocketStatus = {
      connection_state: this.connectionState,
      is_connected: this.connectionState === ConnectionState.Connected,
      is_connecting: this.connectionState === ConnectionState.Connecting,
      reconnect_attempts: this.reconnectAttempts,
      last_heartbeat: this.lastHeartbeat,
      max_reconnect_attempts: this.maxReconnectAttempts,
      heartbeat_interval: this.heartbeatInterval,
    };

    console.log("[WebSocketService] Status object:", status);
    
    this.statusHandlers.forEach((handler, index) => {
      console.log(`[WebSocketService] Calling status handler ${index + 1}/${this.statusHandlers.length}`);
      try {
        handler(status);
        console.log(`[WebSocketService] Status handler ${index + 1} called successfully`);
      } catch (error) {
        console.error(`[WebSocketService] Error in status handler ${index + 1}:`, error);
      }
    });
  }

  // Public methods
  async connect(token: string): Promise<void> {
    if (this.connectionState !== ConnectionState.Disconnected) {
      console.log("[WebSocketService] WebSocket already connected or connecting");
      return;
    }

    try {
      this.connectionState = ConnectionState.Connecting;
      this.emitStatus();

      console.log("[WebSocketService] Connecting to WebSocket with Bearer token...");
      console.log("[WebSocketService] Token (first 16 chars):", token.substring(0, 16) + "...");
      console.log("[WebSocketService] WebSocket URL: wss://dev.v1.terracrypt.cc/api/v1/ws");
      
      await invoke("connect_socket", { token });
      
      // Set the token in the API service
      apiService.setToken(token);
      
      console.log("[WebSocketService] WebSocket connection initiated successfully");
      
      // Wait a moment for the Rust side to establish connection and emit status
      setTimeout(() => {
        // Check if we're still in connecting state and update if needed
        if (this.connectionState === ConnectionState.Connecting) {
          console.log("[WebSocketService] Connection timeout - checking status...");
          this.getStatus().then(status => {
            console.log("[WebSocketService] Current status from Rust:", status);
            if (status.is_connected) {
              this.connectionState = ConnectionState.Connected;
              this.emitStatus();
            }
          }).catch(error => {
            console.error("[WebSocketService] Failed to get status:", error);
          });
        }
      }, 2000);
      
      // Note: Connection status will be updated via the websocket-status event
      // when the Rust side emits the 'connected' status
    } catch (error) {
      console.error("[WebSocketService] Failed to connect WebSocket:", error);
      this.connectionState = ConnectionState.Disconnected;
      this.emitStatus();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log("[WebSocketService] Disconnecting WebSocket...");
      await invoke("disconnect_socket");
      this.connectionState = ConnectionState.Disconnected;
      this.emitStatus();
      console.log("[WebSocketService] WebSocket disconnect initiated");
    } catch (error) {
      console.error("[WebSocketService] Failed to disconnect WebSocket:", error);
    }
  }

  async sendMessage(message: any): Promise<void> {
    console.log("[WebSocketService] sendMessage called with:", message);
    console.log("[WebSocketService] Current connection state:", this.connectionState);
    
    if (this.connectionState !== ConnectionState.Connected) {
      console.error("[WebSocketService] WebSocket not connected, current state:", this.connectionState);
      throw new Error("WebSocket not connected");
    }

    try {
      const messageStr = JSON.stringify(message);
      console.log("[WebSocketService] Sending WebSocket message:", messageStr);
      await invoke("send_socket_message", { message: messageStr });
      console.log("[WebSocketService] WebSocket message sent successfully");
    } catch (error) {
      console.error("[WebSocketService] Failed to send WebSocket message:", error);
      throw error;
    }
  }

  async sendChatMessage(chatId: string, content: string): Promise<void> {
    await this.sendMessage({
      type: "chat-message",
      chat_id: chatId,
      content: content,
      timestamp: new Date().toISOString(),
    });
  }

  async reconnect(token: string): Promise<void> {
    console.log("[WebSocketService] Attempting to reconnect...");
    try {
      await invoke("reconnect_socket", { token });
      console.log("[WebSocketService] Reconnection initiated");
    } catch (error) {
      console.error("[WebSocketService] Failed to reconnect:", error);
      throw error;
    }
  }

  async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    await this.sendMessage({
      type: "typing",
      chat_id: chatId,
      is_typing: isTyping,
    });
  }

  async sendReadReceipt(chatId: string, messageId: string): Promise<void> {
    await this.sendMessage({
      type: "read-receipt",
      chat_id: chatId,
      message_id: messageId,
    });
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

  // Event handling
  onStatusChange(handler: (status: WebSocketStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  offStatusChange(handler: (status: WebSocketStatus) => void): void {
    const index = this.statusHandlers.indexOf(handler);
    if (index > -1) {
      this.statusHandlers.splice(index, 1);
    }
  }

  onMessage(handler: (message: any) => void): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: (message: any) => void): void {
    this.messageHandlers.delete(handler);
  }

  // Utility methods
  isConnectedToServer(): boolean {
    const connected = this.connectionState === ConnectionState.Connected;
    console.log("[WebSocketService] isConnectedToServer() called - State:", this.connectionState, "Result:", connected);
    return connected;
  }

  // Check if we're actually connected by checking recent activity
  async isActuallyConnected(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      const hasRecentActivity = (Date.now() - this.lastHeartbeat) < 60000; // 1 minute
      const isConnected = status.is_connected && hasRecentActivity;
      console.log("[WebSocketService] isActuallyConnected() - Status:", status.is_connected, "Recent activity:", hasRecentActivity, "Result:", isConnected);
      return isConnected;
    } catch (error) {
      console.error("[WebSocketService] Failed to check actual connection status:", error);
      return false;
    }
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

// Export singleton instance
export const websocketService = new WebSocketService(); 