import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { apiService } from "./apiService";

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

class WebSocketService {
  private connectionState: ConnectionState = ConnectionState.Disconnected;
  private reconnectAttempts = 0;
  private lastHeartbeat = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval = 30;
  private statusHandlers: ((status: WebSocketStatus) => void)[] = [];

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for WebSocket status updates only
    // Message handling is done in useWebSocketHandler.ts to avoid conflicts
    listen<ConnectionStatusMessage>("websocket-status", (event) => {
      const status = event.payload;
      console.log("[WebSocketService] Received status update:", status);
      this.updateConnectionStatus(status.message.status);
    }).catch(error => {
      console.error("[WebSocketService] Failed to set up status listener:", error);
    });
  }

  private updateConnectionStatus(status: string) {
    console.log("[WebSocketService] Updating connection status:", status);
    console.log("[WebSocketService] Previous state:", this.connectionState);
    
    switch (status) {
      case "connected":
        this.connectionState = ConnectionState.Connected;
        this.reconnectAttempts = 0;
        this.lastHeartbeat = Date.now();
        console.log("[WebSocketService] Connection established - State updated to Connected");
        break;
      case "disconnected":
        this.connectionState = ConnectionState.Disconnected;
        console.log("[WebSocketService] Connection disconnected - State updated to Disconnected");
        break;
      case "heartbeat_timeout":
        this.connectionState = ConnectionState.Disconnected;
        console.log("[WebSocketService] Connection timed out - State updated to Disconnected");
        break;
      default:
        console.log("[WebSocketService] Unknown status:", status);
    }

    console.log("[WebSocketService] New state:", this.connectionState);
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

    this.statusHandlers.forEach(handler => handler(status));
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

  // Utility methods
  isConnectedToServer(): boolean {
    const connected = this.connectionState === ConnectionState.Connected;
    console.log("[WebSocketService] isConnectedToServer() called - State:", this.connectionState, "Result:", connected);
    return connected;
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