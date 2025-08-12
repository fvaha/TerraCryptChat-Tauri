# WebSocket Implementation Guide for Tauri

## 🔌 Server-Side WebSocket Architecture

Your Go backend uses a sophisticated WebSocket system with the following components:

### 1. **Connection Flow**
```
HTTP Request → Authentication Middleware → WebSocket Upgrade → Connection Registration → Message Handling
```

### 2. **Key Components**
- **WebSocket Hub**: Manages all active connections
- **Redis Message Broker**: Distributes messages across multiple server instances
- **Connection Tracker**: Tracks user connection status in Redis
- **Messaging Service**: Handles message routing and delivery

### 3. **Message Types**
```go
MessageTypeChat                // Regular chat messages
MessageTypeStatus              // Message delivery status
MessageTypeNotification        // General notifications
MessageTypeRequestNotification // Friend request notifications
MessageTypeChatNotification    // Chat-related notifications
ConnectionTypeStatus           // Connection status updates
MessageTypeError               // Error messages
```

---

## 🦀 **Tauri (Rust + Web Technologies)**

### Connection Setup
```typescript
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private authToken: string) {}

  connect() {
    try {
      // Connect to WebSocket endpoint
      this.ws = new WebSocket(`ws://localhost:8080/api/v1/ws`);
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Send authentication header (if needed)
      this.authenticate();
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.emit('disconnected', event);
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  private authenticate() {
    // Send authentication message if required
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const authMessage = {
        type: 'authentication',
        token: this.authToken
      };
      this.send(authMessage);
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'connection-status':
        this.handleConnectionStatus(data.message);
        break;
      case 'chat':
        this.handleChatMessage(data.message);
        break;
      case 'message-status':
        this.handleMessageStatus(data.message);
        break;
      case 'request-notification':
        this.handleFriendRequest(data.message);
        break;
      case 'chat-notification':
        this.handleChatNotification(data.message);
        break;
      case 'error':
        this.handleError(data.message);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private handleConnectionStatus(message: any) {
    if (message.status === 'established') {
      console.log('Connection established at:', message.timestamp);
      this.emit('connection-established', message);
    }
  }

  private handleChatMessage(message: any) {
    // Handle incoming chat message
    this.emit('chat-message', message);
  }

  private handleMessageStatus(message: any) {
    // Handle message delivery status
    this.emit('message-status', message);
  }

  private handleFriendRequest(message: any) {
    // Handle friend request notification
    this.emit('friend-request', message);
  }

  private handleChatNotification(message: any) {
    // Handle chat creation/deletion notifications
    this.emit('chat-notification', message);
  }

  private handleError(message: any) {
    console.error('Server error:', message.error);
    this.emit('server-error', message);
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('reconnection-failed');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
  }

  // Event emitter methods
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}
```

### Usage in Tauri App
```typescript
// In your main app component
import { WebSocketManager } from './WebSocketManager';

class ChatApp {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = new WebSocketManager(this.getAuthToken());
    this.setupWebSocketHandlers();
    this.connect();
  }

  private setupWebSocketHandlers() {
    this.wsManager.on('connected', () => {
      console.log('Connected to chat server');
      this.updateConnectionStatus(true);
    });

    this.wsManager.on('chat-message', (message) => {
      this.handleIncomingMessage(message);
    });

    this.wsManager.on('message-status', (status) => {
      this.updateMessageStatus(status);
    });

    this.wsManager.on('friend-request', (request) => {
      this.showFriendRequestNotification(request);
    });

    this.wsManager.on('disconnected', () => {
      this.updateConnectionStatus(false);
    });
  }

  private connect() {
    this.wsManager.connect();
  }

  sendMessage(chatId: string, content: string) {
    const message = {
      type: 'chat',
      message: {
        chat_id: chatId,
        content: content,
        client_message_id: this.generateClientId()
      }
    };
    
    this.wsManager.send(message);
  }

  private getAuthToken(): string {
    // Get JWT token from secure storage
    return localStorage.getItem('auth_token') || '';
  }
}
```

### Data Models
```typescript
// Message types
enum MessageType {
  CHAT = 'chat',
  NOTIFICATION = 'notification',
  REQUEST_NOTIFICATION = 'request-notification',
  CHAT_NOTIFICATION = 'chat-notification',
  CONNECTION_STATUS = 'connection-status',
  MESSAGE_STATUS = 'message-status',
  ERROR = 'error'
}

enum ConnectionStatus {
  ESTABLISHED = 'established'
}

enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

// Message structures
interface ConnectionStatusInfo {
  message: ConnectionStatusMessage;
  type: MessageType;
}

interface ConnectionStatusMessage {
  status: ConnectionStatus;
  timestamp: string;
}

interface ChatMessage {
  message: Message;
  type: MessageType;
}

interface Message {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  recipients?: MessageRecipientStatus[];
}

interface MessageRecipientStatus {
  message_id: string;
  recipient_id: string;
  status: MessageStatus;
  updated_at: string;
}

interface StatusMessage {
  message: MessageStatusConfirmation;
  type: MessageType;
}

interface MessageStatusConfirmation {
  message_id: string;
  client_message_id?: string;
  status: MessageStatus;
  recipient_id?: string;
  chat_id?: string;
  sender_id?: string;
  timestamp: string;
}

interface FriendRequestNotificationMessage {
  message: FriendRequestNotification;
  type: MessageType;
}

interface FriendRequestNotification {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  timestamp: string;
}

interface ChatCreationNotificationMessage {
  message: ChatCreationNotification;
  type: MessageType;
}

interface ChatCreationNotification {
  chat_id: string;
  creator_id: string;
  name?: string;
  is_group: boolean;
  timestamp: string;
  members?: string[];
  action?: string;
}

interface ErrorMessage {
  message: ErrorMessageContent;
  type: MessageType;
}

interface ErrorMessageContent {
  error: string;
  timestamp: string;
}
```

---

## 🔧 **Key Implementation Details**

### 1. **Authentication**
- WebSocket connection requires JWT token in Authorization header
- Token is validated before connection upgrade

### 2. **Message Flow**
```
Client → WebSocket → Server → Redis Broker → Other Clients
```

### 3. **Connection Management**
- Automatic reconnection with exponential backoff
- Ping/pong for connection health
- Connection status tracking in Redis

### 4. **Message Types**
- **Chat Messages**: Real-time messaging
- **Status Updates**: Delivery confirmations
- **Notifications**: Friend requests, chat updates
- **Connection Status**: Connection health

### 5. **Error Handling**
- Graceful disconnection handling
- Automatic reconnection
- Error message propagation

### 6. **Performance Features**
- Message buffering
- Connection pooling
- Redis-based message distribution

---

## 📋 **Integration Steps**

1. **Copy the WebSocket manager** for your Tauri app
2. **Initialize with your JWT token** from authentication
3. **Set up message handlers** for your app's needs
4. **Connect to the WebSocket endpoint** at `/api/v1/ws`
5. **Handle incoming messages** based on the `type` field

This implementation provides a robust, scalable WebSocket system that your Tauri app can easily integrate with for real-time chat functionality.
