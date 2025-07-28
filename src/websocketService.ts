import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { apiService } from "./apiService";
// import { MessageEntity } from "./models";

export interface WebSocketStatus {
  is_connected: boolean;
  is_connecting: boolean;
  reconnect_attempts: number;
  last_heartbeat: number;
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
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private lastHeartbeat = 0;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private statusHandlers: ((status: WebSocketStatus) => void)[] = [];

  constructor() {
    this.setupEventListeners();
  }

  // Method to set up message flow callback (called after messageService is initialized)
  // setMessageFlowCallback(callback: (message: MessageEntity) => void) {
  //   this.messageFlowCallback = callback;
  // }

  // private messageFlowCallback: ((message: MessageEntity) => void) | null = null;

  private setupEventListeners() {
    // Listen for WebSocket messages from Tauri
    listen<string>("message", (event) => {
      try {
        // Emit raw message for messageService to handle
        this.emit("raw-message", event.payload);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    }).catch(error => {
      console.error("Failed to set up message listener:", error);
    });

    // Listen for WebSocket status updates
    listen<ConnectionStatusMessage>("websocket-status", (event) => {
      const status = event.payload;
      this.updateConnectionStatus(status.message.status);
    }).catch(error => {
      console.error("Failed to set up status listener:", error);
    });
  }

  private updateConnectionStatus(status: string) {
    switch (status) {
      case "connected":
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastHeartbeat = Date.now();
        break;
      case "disconnected":
        this.isConnected = false;
        this.isConnecting = false;
        break;
      case "heartbeat_timeout":
        this.isConnected = false;
        this.isConnecting = false;
        break;
    }

    this.emitStatus();
  }

  private emitStatus() {
    const status: WebSocketStatus = {
      is_connected: this.isConnected,
      is_connecting: this.isConnecting,
      reconnect_attempts: this.reconnectAttempts,
      last_heartbeat: this.lastHeartbeat,
    };

    this.statusHandlers.forEach(handler => handler(status));
  }

  private emit(event: string, data: any) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Public methods
  async connect(token: string): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      console.log("WebSocket already connected or connecting");
      return;
    }

    try {
      this.isConnecting = true;
      this.emitStatus();

      console.log("Connecting to WebSocket with Bearer token...");
      console.log("Token (first 16 chars):", token.substring(0, 16) + "...");
      await invoke("connect_socket", { token });
      
      // Set the token in the API service
      apiService.setToken(token);
      
      console.log("WebSocket connected successfully");
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      this.isConnecting = false;
      this.emitStatus();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await invoke("disconnect_socket");
      this.isConnected = false;
      this.isConnecting = false;
      this.emitStatus();
      console.log("WebSocket disconnected");
    } catch (error) {
      console.error("Failed to disconnect WebSocket:", error);
    }
  }

  async sendMessage(message: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error("WebSocket not connected");
    }

    try {
      const messageStr = JSON.stringify(message);
      await invoke("send_socket_message", { message: messageStr });
      console.log("Sent WebSocket message:", message);
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
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
        is_connected: false,
        is_connecting: false,
        reconnect_attempts: 0,
        last_heartbeat: 0,
      };
    }
  }

  // Event handling
  on(event: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
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

  // Utility methods
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService(); 