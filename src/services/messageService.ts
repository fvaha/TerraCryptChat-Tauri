import { invoke } from "@tauri-apps/api/core";
import { Message as MessageEntity, IncomingWSMessage, MessageStatusMessage, ChatMessageWrapper, RequestNotificationWrapper, ChatNotificationWrapper, MessageSendStatus } from "../services/databaseServiceAsync";
import { encryptionService } from "../encrypt/encryptionService";
import { websocketService } from "../websocket/websocketService";
import { messageLinkingManager } from "../linking/messageLinkingManager";
import { databaseServiceAsync } from "./databaseServiceAsync";
import { listen } from "@tauri-apps/api/event";

// Generate UUID function
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Message service for handling local message storage and WebSocket message processing
export class MessageService {
  private messageFlow: ((message: MessageEntity) => void) | null = null;
  private cachedMessages: MessageEntity[] = [];

  constructor() {
    console.log("[MessageService] 🚀 Constructor called - initializing MessageService");
    // Attach WebSocket message listener like in Kotlin
    this.attachWebSocketManager();
    console.log("[MessageService] ✅ Constructor completed - MessageService initialized");
  }

  // Attach WebSocket manager for incoming messages (like Kotlin)
  attachWebSocketManager() {
    console.log("[MessageService] 🎯 attachWebSocketManager called - setting up event listeners immediately");
    
    // Try to set up Tauri event listeners
    this.setupTauriEventListeners();
    
    // Set up polling mechanism as fallback
    this.setupPollingMechanism();
    
    console.log("[MessageService] ✅ Event listeners set up immediately");
    console.log("[MessageService] 📦 MessageService module: messageService exported");
  }

  private setupTauriEventListeners() {
    try {
      // Listen for message status updates from Rust backend
      listen<any>("message-status-update", async (event) => {
        console.log("[MessageService] 🎯 Received 'message-status-update' event:", event.payload);
        if (event.payload) {
          await this.handleMessageStatusUpdate(event.payload);
        }
      }).catch(error => {
        console.error("[MessageService] ❌ Failed to set up message-status-update listener:", error);
      });

      // Listen for message saved events from Rust backend
      listen<any>("message-saved", async (event) => {
        console.log("[MessageService] 🎯 Received message-saved event:", event.payload);
        if (event.payload) {
          console.log("[MessageService] 🎯 Processing message-saved event...");
          await this.handleMessageSaved(event.payload);
        } else {
          console.log("[MessageService] ❌ Empty message-saved event payload");
        }
      }).catch(error => {
        console.error("[MessageService] ❌ Failed to set up message-saved listener:", error);
      });

      // Listen for raw WebSocket messages (like Kotlin implementation)
      listen<any>("message", async (event) => {
        console.log("[MessageService] 🎯 Received raw WebSocket message:", event.payload);
        if (event.payload) {
          console.log("[MessageService] 🎯 Processing raw WebSocket message...");
          await this.handleIncomingMessage(event.payload);
        } else {
          console.log("[MessageService] ❌ Empty raw WebSocket message payload");
        }
      }).catch(error => {
        console.error("[MessageService] ❌ Failed to set up message listener:", error);
      });

      // Listen for ALL events to debug what's being received
      listen<any>("*", async (event) => {
        console.log("[MessageService] 🔍 Received ANY event:", event.event, event.payload);
      }).catch(error => {
        console.error("[MessageService] ❌ Failed to set up wildcard listener:", error);
      });

      // Listen for test events to verify event system
      listen<any>("test-event", async (event) => {
        console.log("[MessageService] 🧪 Test event received:", event.payload);
      }).catch(error => {
        console.error("[MessageService] ❌ Failed to set up test-event listener:", error);
      });

      console.log("[MessageService] ✅ Tauri event listeners set up successfully");
    } catch (error) {
      console.error("[MessageService] ❌ Failed to set up Tauri event listeners:", error);
    }
  }

  private setupPollingMechanism() {
    console.log("[MessageService] 🔄 Setting up polling mechanism as fallback");
    
    // Poll for new messages every 2 seconds
    setInterval(async () => {
      try {
        // Check for new messages in the database
        const currentChatId = this.getCurrentChatId();
        if (currentChatId) {
          const messages = await this.fetchMessages(currentChatId, 10);
          if (messages.length > this.cachedMessages.length) {
            const newMessages = messages.slice(this.cachedMessages.length);
            console.log("[MessageService] 🔄 Polling found new messages:", newMessages.length);
            
            for (const message of newMessages) {
              this.emitMessage(message);
            }
          }
          this.cachedMessages = messages;
        }
      } catch (error) {
        console.error("[MessageService] ❌ Error in polling mechanism:", error);
      }
    }, 2000);
    
    console.log("[MessageService] ✅ Polling mechanism set up");
  }

  private getCurrentChatId(): string | null {
    // This is a simple implementation - in a real app, you'd get this from your app state
    // For now, we'll return null and the polling won't work, but the structure is there
    return null;
  }

  setMessageFlow(callback: (message: MessageEntity) => void) {
    console.log(`[MessageService] Setting message flow callback:`, callback ? 'provided' : 'null');
    if (callback) {
      console.log(`[MessageService] Message flow callback is being set`);
    } else {
      console.log(`[MessageService] Message flow callback is being cleared`);
    }
    this.messageFlow = callback;
  }

  getMessageFlow() {
    return this.messageFlow;
  }



  // MARK: - Message Flow Management (following Kotlin pattern)

  /**
   * Emit a message to the flow (like Kotlin's messageFlow.emit)
   */
  private emitMessage(message: MessageEntity) {
    console.log(`[MessageService] 🎯 emitMessage called for message: ${message.client_message_id || message.message_id} for chat: ${message.chat_id}`);
    console.log(`[MessageService] Message status - is_delivered: ${message.is_delivered}, is_sent: ${message.is_sent}, is_failed: ${message.is_failed}`);
    if (this.messageFlow) {
      console.log(`[MessageService] ✅ Message flow is set, calling callback`);
      try {
        this.messageFlow(message);
        console.log(`[MessageService] ✅ Message flow callback executed successfully`);
      } catch (error) {
        console.error(`[MessageService] ❌ Error in message flow callback:`, error);
      }
    } else {
      console.log(`[MessageService] ❌ Message flow is not set, message not emitted`);
    }
  }

  // MARK: - Message Fetching

  async fetchMessages(chatId: string, limit: number = 50, beforeTimestamp?: number): Promise<MessageEntity[]> {
    if (!chatId) {
      console.error("Invalid chatId for fetchMessages:", chatId);
      return [];
    }

    try {
      console.log(`[MessageService] Fetching messages for chat ${chatId}, limit: ${limit}`);
      
      let messages: MessageEntity[];
      if (beforeTimestamp) {
        messages = await databaseServiceAsync.getMessagesBeforeTimestamp(chatId, beforeTimestamp, limit);
      } else {
        messages = await databaseServiceAsync.getMessagesForChat(chatId);
      }
      
      if (!Array.isArray(messages)) {
        console.warn("Invalid messages data received:", messages);
        return [];
      }
      
      // Sort messages by timestamp and limit results
      const sortedMessages = messages
        .filter(msg => msg && msg.chat_id) // Filter out invalid messages
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-limit);
      
      console.log(`[MessageService] Retrieved ${sortedMessages.length} messages for chat ${chatId}`);
      return sortedMessages;
    } catch (error) {
      console.error(`Failed to fetch messages for chat ${chatId}:`, error);
      return [];
    }
  }

  async fetchOldMessages(chatId: string, beforeTimestamp: number): Promise<MessageEntity[]> {
    return await databaseServiceAsync.getMessagesBeforeTimestamp(chatId, beforeTimestamp, 50);
  }

  // MARK: - Message Finding

  async findMessageByClientId(clientId: string): Promise<MessageEntity | null> {
    try {
      return await invoke<MessageEntity | null>("db_get_message_by_client_id", { clientMessageId: clientId });
    } catch (error) {
      console.error(`[MessageService] Error finding message by client ID ${clientId}:`, error);
      return null;
    }
  }

  async findMessageByServerId(serverId: string): Promise<MessageEntity | null> {
    try {
      return await invoke<MessageEntity | null>("db_get_message_by_server_id", { messageId: serverId });
    } catch (error) {
      console.error(`[MessageService] Error finding message by server ID ${serverId}:`, error);
      return null;
    }
  }

  async findChatId(messageId: string): Promise<string | null> {
    try {
      return await invoke<string | null>("db_find_chat_id", { messageId });
    } catch (error) {
      console.error(`[MessageService] Error finding chat ID for message ${messageId}:`, error);
      return null;
    }
  }

  async messageExists(clientMessageId: string, serverMessageId: string): Promise<boolean> {
    try {
      return await invoke<boolean>("db_message_exists", { 
        clientMessageId, 
        serverMessageId 
      });
    } catch (error) {
      console.error(`[MessageService] Error checking message existence:`, error);
      return false;
    }
  }

  // MARK: - Message Saving

  async saveMessage(chatId: string, content: string, senderId: string, timestamp: number): Promise<string> {
    try {
      const clientMessageId = generateUUID();
      const messageEntity: MessageEntity = {
        message_id: undefined,
        client_message_id: clientMessageId,
        chat_id: chatId,
        sender_id: senderId,
        message_text: content,
        content: content,
        timestamp,
        is_read: false,
        is_sent: false,
        is_delivered: false,
        is_failed: false
      };

      await databaseServiceAsync.insertMessage(messageEntity);
      this.emitMessage(messageEntity);
      
      return clientMessageId;
    } catch (error) {
      console.error(`[MessageService] Failed to save message:`, error);
      throw error;
    }
  }

  public async insertAndEmit(message: MessageEntity): Promise<void> {
    try {
      await databaseServiceAsync.insertMessage(message);
      this.emitMessage(message);
    } catch (error) {
      console.error(`[MessageService] Error in insertAndEmit:`, error);
    }
  }

  /**
   * Resolve sender username (like Kotlin's resolveSenderUsername)
   */
  private async resolveSenderUsername(senderId: string): Promise<string> {
    try {
      const currentUser = await databaseServiceAsync.getMostRecentUser();
      if (senderId === currentUser?.user_id) {
        return currentUser.username || "You";
      }
      
      // Try to get user from database
      const user = await databaseServiceAsync.getUserById(senderId);
      return user?.username || "Unknown";
    } catch (error) {
      console.error(`[MessageService] Error resolving username for ${senderId}:`, error);
      return "Unknown";
    }
  }

  async saveOutgoingMessage(
    clientMessageId: string,
    chatId: string,
    content: string,
    senderId: string,
    replyToMessageId?: string
  ): Promise<void> {
    try {
      const senderUsername = await this.resolveSenderUsername(senderId);
      const timestamp = Date.now();

      const messageEntity: MessageEntity = {
        message_id: undefined,
        client_message_id: clientMessageId,
        chat_id: chatId,
        sender_id: senderId,
        sender_username: senderUsername,
        message_text: content,
        content: content,
        timestamp: timestamp,
        is_sent: false,
        is_read: false,
        is_delivered: false,
        is_failed: false,
        reply_to_message_id: replyToMessageId
      };

      // Emit message immediately for instant display
      this.emitMessage(messageEntity);
      
      // Save to database in background
      setTimeout(async () => {
        try {
          await databaseServiceAsync.insertMessage(messageEntity);
          console.log(`[MessageService] Saved outgoing message to database: ${clientMessageId}`);
        } catch (error) {
          console.error(`[MessageService] Failed to save outgoing message to database:`, error);
        }
      }, 0);
      
      console.log(`[MessageService] Emitted outgoing message immediately: ${clientMessageId}`);
    } catch (error) {
      console.error(`[MessageService] Failed to save outgoing message:`, error);
      throw error;
    }
  }

  async saveIncomingMessage(
    messageId: string | undefined,
    clientMessageId: string | undefined,
    chatId: string,
    content: string,
    senderId: string,
    sentAt: number,
    senderName: string,
    replyToMessageId?: string
  ): Promise<void> {
    console.log(`[MessageService] 🎯 saveIncomingMessage called with:`, {
      messageId, clientMessageId, chatId, content: content.substring(0, 50) + "...", senderId, sentAt, senderName
    });
    
    try {
      const messageEntity: MessageEntity = {
        message_id: messageId || undefined,
        client_message_id: clientMessageId || messageId || `temp_${Date.now()}`,
        chat_id: chatId,
        sender_id: senderId,
        sender_username: senderName,
        message_text: content,
        content: content,
        timestamp: sentAt,
        is_read: false,
        is_sent: true,
        is_delivered: false,
        is_failed: false,
        reply_to_message_id: replyToMessageId
      };

      console.log(`[MessageService] 🎯 Created message entity:`, {
        message_id: messageEntity.message_id,
        client_message_id: messageEntity.client_message_id,
        chat_id: messageEntity.chat_id,
        content: messageEntity.content.substring(0, 50) + "..."
      });

      // Emit message immediately for instant display
      console.log(`[MessageService] 🎯 About to emit message to flow...`);
      this.emitMessage(messageEntity);
      
      // Save to database in background
      setTimeout(async () => {
        try {
          await databaseServiceAsync.insertMessage(messageEntity);
          console.log(`[MessageService] ✅ Saved incoming message to database: ${messageEntity.client_message_id}`);
        } catch (error) {
          console.error(`[MessageService] ❌ Failed to save incoming message to database:`, error);
        }
      }, 0);
      
      console.log(`[MessageService] ✅ Emitted incoming message immediately: ${messageEntity.client_message_id}`);
    } catch (error) {
      console.error(`[MessageService] ❌ Failed to save incoming message:`, error);
      throw error;
    }
  }

  // MARK: - Message Status Updates

  async updateMessageStatus(
    messageId: string | undefined,
    clientMessageId: string | undefined,
    status: MessageSendStatus
  ): Promise<void> {
    try {
      // Get the current message from database to emit updated version
      let updatedMessage: MessageEntity | null = null;
      
      if (clientMessageId) {
        switch (status) {
          case MessageSendStatus.SENT:
            await databaseServiceAsync.updateMessageSentStatusByServerId(messageId || "", true);
            // Get updated message for emission
            updatedMessage = await databaseServiceAsync.getMessageById(messageId || "");
            break;
          case MessageSendStatus.DELIVERED:
            await databaseServiceAsync.markMessageDeliveredByServerIdNew(messageId || "");
            // Get updated message for emission
            updatedMessage = await databaseServiceAsync.getMessageById(messageId || "");
            break;
          case MessageSendStatus.READ:
            await databaseServiceAsync.markMessageReadByServerIdNew(messageId);
            // Get updated message for emission
            updatedMessage = await databaseServiceAsync.getMessageById(messageId);
            break;
          case MessageSendStatus.FAILED:
            // Handle failed status
            break;
        }
      } else if (messageId) {
        // Handle case where we only have server message ID
        switch (status) {
          case MessageSendStatus.SENT:
            await databaseServiceAsync.updateMessageSentStatusByServerId(messageId, true);
            // Get updated message for emission
            updatedMessage = await databaseServiceAsync.getMessageById(messageId);
            break;
          case MessageSendStatus.DELIVERED:
            await databaseServiceAsync.markMessageDeliveredByServerIdNew(messageId);
            // Get updated message for emission
            updatedMessage = await databaseServiceAsync.getMessageById(messageId);
            break;
          case MessageSendStatus.READ:
            await databaseServiceAsync.markMessageReadByServerIdNew(messageId);
            // Get updated message for emission
            updatedMessage = await databaseServiceAsync.getMessageById(messageId);
            break;
          case MessageSendStatus.FAILED:
            // Handle failed status
            break;
        }
      }
      
      // Emit the updated message to UI if found
      if (updatedMessage) {
        console.log(`[MessageService] Emitting updated message with status ${status}:`, updatedMessage.client_message_id || updatedMessage.message_id);
        this.emitMessage(updatedMessage);
      }
    } catch (error) {
      console.error(`[MessageService] Failed to update message status:`, error);
    }
  }

  async markMessageAsSent(clientMessageId: string): Promise<void> {
    await databaseServiceAsync.updateMessageSentStatus(clientMessageId, true);
  }

  async markMessageAsDelivered(clientMessageId: string): Promise<void> {
    await databaseServiceAsync.markMessageDeliveredByServerIdNew(clientMessageId);
  }

  async markMessageAsRead(clientMessageId: string): Promise<void> {
    await databaseServiceAsync.markMessageReadByServerIdNew(clientMessageId);
  }

  async markAllMessagesAsRead(chatId: string): Promise<void> {
    try {
      await databaseServiceAsync.markMessagesAsRead(chatId);
    } catch (error) {
      console.error(`[MessageService] Failed to mark messages as read for chat ${chatId}:`, error);
    }
  }

  async getUnreadMessages(chatId: string): Promise<MessageEntity[]> {
    try {
      return await databaseServiceAsync.getUnreadMessages(chatId);
    } catch (error) {
      console.error(`[MessageService] Failed to get unread messages for chat ${chatId}:`, error);
      return [];
    }
  }

  // MARK: - Message Sending

  async sendMessage(content: string, chatId: string, replyToMessageId?: string): Promise<string> {
    try {
      console.log(`[MessageService] Sending message to chat ${chatId}: ${content}`);
      
      // Get current user
      const currentUser = await databaseServiceAsync.getMostRecentUser();
      if (!currentUser) {
        throw new Error("No current user found");
      }

      const clientMessageId = generateUUID();
      const timestamp = Date.now();

      // Save message locally first
      await this.saveOutgoingMessage(
        clientMessageId,
        chatId,
        content,
        currentUser.user_id,
        replyToMessageId
      );

      // Send via Rust WebSocket connection
      const messagePayload = {
        type: "chat",
        message: {
          chat_id: chatId,
          content: encryptionService.encryptMessage(content)
        },
        client_message_id: clientMessageId
      };

      await invoke('send_socket_message', { message: JSON.stringify(messagePayload) });
      
      console.log(`[MessageService] Message sent successfully: ${clientMessageId}`);
      return clientMessageId;
    } catch (error) {
      console.error(`[MessageService] Failed to send message:`, error);
      throw error;
    }
  }

  // MARK: - Outgoing Message Handling (following Kotlin pattern)

  async handleOutgoingMessage(
    type: string,
    payload: any,
    onSent: () => Promise<void>
  ): Promise<void> {
    try {
      const clientMessageId = payload.client_message_id || generateUUID();
      const processedPayload = this.prepareChatMessagePayload(payload);

      // New payload for backend!
      const finalPayload = {
        type: type,
        message: processedPayload,
        client_message_id: clientMessageId
      };
      
      console.log(`[MessageService] OUTGOING: ${JSON.stringify(finalPayload, null, 2)}`);
      await invoke('send_socket_message', { message: JSON.stringify(finalPayload) });
      await onSent();
    } catch (error) {
      console.error(`[MessageService] Failed to send message:`, error);
      throw error;
    }
  }

  private prepareChatMessagePayload(payload: any): any {
    const text = payload.message_text;
    if (!text) {
      throw new Error("Missing message_text");
    }
    
    return {
      chat_id: payload.chat_id,
      content: encryptionService.encryptMessage(text)
    };
  }

  // MARK: - Message Resending

  async resendUnsentMessage(message: MessageEntity): Promise<void> {
    if (!message.is_failed) {
      console.log("[MessageService] Message is not failed, cannot resend.");
      return;
    }

    try {
      // Update message status to retrying
      await this.updateMessageStatus(message.message_id, message.client_message_id, MessageSendStatus.PENDING);
      
      // Resend via WebSocket
      await this.handleOutgoingMessage("chat", {
        chat_id: message.chat_id,
        message_text: message.content,
        client_message_id: message.client_message_id
      }, async () => {
        await this.markMessageAsSent(message.client_message_id);
      });
      
              console.log(`[MessageService] Resent message: ${message.client_message_id}`);
    } catch (error) {
      console.error(`[MessageService] Failed to resend message:`, error);
      await this.updateMessageStatus(message.message_id, message.client_message_id, MessageSendStatus.FAILED);
    }
  }

  // MARK: - Incoming Message Handling (following Kotlin pattern)



  // Handle message status updates from Rust backend (like Kotlin)
  async handleMessageStatusUpdate(payload: any) {
    try {
      const { server_message_id, status, chat_id, sender_id, timestamp } = payload;

      if (!server_message_id || !status) {
        console.warn("[MessageService] Invalid status update payload:", payload);
        return;
      }

      console.log(`[MessageService] Processing status update: ${status} for message ${server_message_id}`);

      // Use MessageLinkingManager to handle the status update
      await messageLinkingManager.robustLinking(
        chat_id,
        sender_id,
        server_message_id,
        undefined, // clientMessageId - not provided by server
        timestamp ? new Date(timestamp).getTime() : undefined
      );

      // Then update the message status
      await messageLinkingManager.updateMessageStatus(server_message_id, status);
      
      // Status updates should NOT emit messages to UI - they only update database
      // The ChatScreen will handle status updates through its own mechanisms
      console.log(`[MessageService] ✅ Status update processed for message ${server_message_id}: ${status}`);
      console.log(`[MessageService] ✅ Database updated, no UI emission needed for status updates`);
      
      console.log("[MessageService] Message status updated via MessageLinkingManager");
    } catch (e) {
      console.error("[MessageService] Error handling status update:", e);
    }
  }

  // Handle message saved events from Rust backend
  async handleIncomingMessage(rawMessage: string) {
    console.log("[MessageService] 🎯 INCOMING: Processing raw WebSocket message:", rawMessage.substring(0, 100) + "...");
    
    if (!rawMessage || rawMessage.length < 5 || !rawMessage.includes('"type"')) {
      console.log("[MessageService] ❌ Invalid raw message, skipping");
      return;
    }

    try {
      // Parse the message to get the type
      const messageData = JSON.parse(rawMessage);
      const messageType = messageData.type;
      
      console.log("[MessageService] 🎯 Message type:", messageType);
      
      switch (messageType) {
        case "chat":
          await this.handleChatMessage(rawMessage);
          break;
        case "message-status":
          await this.handleMessageStatus(rawMessage);
          break;
        case "connection-status":
          console.log("[MessageService] 🎯 Connection status message received");
          break;
        case "error":
          console.log("[MessageService] 🎯 Error message received");
          break;
        case "info":
          console.log("[MessageService] 🎯 Info message received");
          break;
        default:
          console.log("[MessageService] 🎯 Unknown message type:", messageType);
      }
    } catch (error) {
      console.error("[MessageService] ❌ Error processing incoming message:", error);
    }
  }

  async handleChatMessage(rawMessage: string) {
    console.log("[MessageService] 🎯 Processing chat message:", rawMessage.substring(0, 100) + "...");
    
    try {
      const messageData = JSON.parse(rawMessage);
      const message = messageData.message;
      
      if (!message) {
        console.log("[MessageService] ❌ No message field in WebSocket data");
        return;
      }

      const { message_id, chat_id, sender_id, content: encrypted_content, sent_at } = message;
      
      // Decrypt the content (this should match the backend decryption)
      const decrypted_content = this.decryptMessage(encrypted_content);
      
      if (!decrypted_content) {
        console.log("[MessageService] ❌ Failed to decrypt message content");
        return;
      }

      // Parse timestamp
      const timestamp = new Date(sent_at).getTime();
      
      console.log("[MessageService] 🎯 Decrypted message:", {
        message_id,
        chat_id,
        sender_id,
        content: decrypted_content.substring(0, 50) + "...",
        timestamp
      });

      // Create message entity
      const messageEntity: MessageEntity = {
        message_id: message_id,
        client_message_id: message_id, // Use server ID as client ID for incoming messages
        chat_id: chat_id,
        sender_id: sender_id,
        content: decrypted_content,
        message_text: decrypted_content,
        timestamp: timestamp,
        is_read: false,
        is_sent: true,
        is_delivered: true,
        is_failed: false,
        sender_username: undefined,
        reply_to_message_id: undefined
      };

      // Emit the message to the flow immediately (like Kotlin)
      console.log("[MessageService] 🎯 About to emit chat message to flow...");
      this.emitMessage(messageEntity);
      
      console.log("[MessageService] ✅ Chat message processed and emitted immediately");
    } catch (error) {
      console.error("[MessageService] ❌ Error processing chat message:", error);
    }
  }

  private decryptMessage(encryptedString: string): string {
    if (!encryptedString || encryptedString.length === 0) {
      return '';
    }

    try {
      // Decode base64
      const encryptedBytes = atob(encryptedString);
      
      // XOR decrypt with the same key as backend
      const key = "hardcoded_key";
      const keyBytes = new TextEncoder().encode(key);
      
      const decryptedBytes = new Uint8Array(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        decryptedBytes[i] = encryptedBytes.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
      }
      
      // Convert to string
      return new TextDecoder().decode(decryptedBytes);
    } catch (error) {
      console.error("[MessageService] ❌ Failed to decrypt message:", error);
      return encryptedString; // Return original if decryption fails
    }
  }

  async handleMessageSaved(payload: any) {
    try {
      const { message_id, chat_id, sender_id, content, timestamp } = payload;
      
      console.log("[MessageService] 🎯 Message saved event received:", { message_id, chat_id, sender_id, content: content?.substring(0, 50) + "..." });
      
      // Create message entity from saved event
      const messageEntity: MessageEntity = {
        message_id: message_id,
        client_message_id: message_id, // Use server ID as client ID for incoming messages
        chat_id: chat_id,
        sender_id: sender_id,
        content: content,
        message_text: content,
        timestamp: timestamp,
        is_read: false,
        is_sent: true,
        is_delivered: true,
        is_failed: false,
        sender_username: undefined,
        reply_to_message_id: undefined
      };

      console.log("[MessageService] 🎯 Created message entity from saved event:", {
        message_id: messageEntity.message_id,
        client_message_id: messageEntity.client_message_id,
        chat_id: messageEntity.chat_id,
        content: messageEntity.content?.substring(0, 50) + "..."
      });

      // Emit the message to the flow immediately
      console.log("[MessageService] 🎯 About to emit message to flow...");
      this.emitMessage(messageEntity);
      
      console.log("[MessageService] ✅ Message saved event processed and emitted immediately");
    } catch (error) {
      console.error("[MessageService] ❌ Error handling message saved event:", error);
    }
  }

  // Helper method to convert status string to enum
  private getStatusEnum(status: string): MessageSendStatus {
    switch (status) {
      case "sent":
        return MessageSendStatus.SENT;
      case "delivered":
        return MessageSendStatus.DELIVERED;
      case "read":
        return MessageSendStatus.READ;
      default:
        return MessageSendStatus.FAILED;
    }
  }

  private async handleMessageStatus(rawMessage: string) {
    const wrapper = this.parseJson<MessageStatusMessage>(rawMessage);
    if (!wrapper) return;

    const { message_id, status, chat_id, sender_id, message_ids, client_message_id, timestamp } = wrapper.message;

    console.log("[MessageService] Status update:", { message_id, status, chat_id, sender_id, client_message_id });

    // Handle bulk READ status (like Kotlin implementation)
    if (status === "read" && message_ids && message_ids.length > 0) {
      try {
        await messageLinkingManager.markMessagesAsReadByServerIds(message_ids);
        console.log("[MessageService] Bulk read status updated for", message_ids.length, "messages");
      } catch (statusError) {
        console.error("[MessageService] Failed to update bulk read status:", statusError);
      }
      return;
    }

    // Parse server timestamp if available
    const serverTimestamp = timestamp ? new Date(timestamp).getTime() : undefined;

    // Use robust linking for status updates (like Kotlin pattern)
    if (client_message_id && message_id) {
      try {
        await messageLinkingManager.robustLinking(
          chat_id,
          sender_id,
          client_message_id,
          message_id,
          serverTimestamp
        );
        
        // Update message status
        await this.updateMessageStatus(message_id, client_message_id, 
          status === "sent" ? MessageSendStatus.SENT :
          status === "delivered" ? MessageSendStatus.DELIVERED :
          status === "read" ? MessageSendStatus.READ :
          MessageSendStatus.FAILED
        );
        
        console.log("[MessageService] Message status updated successfully:", status);
      } catch (statusError) {
        console.error("[MessageService] Failed to update message status:", statusError);
      }
    } else if (client_message_id) {
      // Update by client message ID only
      await this.updateMessageStatus(undefined, client_message_id, 
        status === "sent" ? MessageSendStatus.SENT :
        status === "delivered" ? MessageSendStatus.DELIVERED :
        status === "read" ? MessageSendStatus.READ :
        MessageSendStatus.FAILED
      );
    } else if (message_id) {
      // Fallback - old backend
      await this.updateMessageStatus(message_id, undefined, 
        status === "sent" ? MessageSendStatus.SENT :
        status === "delivered" ? MessageSendStatus.DELIVERED :
        status === "read" ? MessageSendStatus.READ :
        MessageSendStatus.FAILED
      );
    }
  }

  private async handleChatNotification(rawMessage: string) {
    const wrapper = this.parseJson<ChatNotificationWrapper>(rawMessage);
    if (!wrapper) return;

    console.log("[MessageService] Chat notification:", wrapper.message);
    // Handle chat notifications (new chat, participant updates, etc.)
  }

  private handleRequestNotification(rawMessage: string) {
    const wrapper = this.parseJson<RequestNotificationWrapper>(rawMessage);
    if (!wrapper) return;

    console.log("[MessageService] Request notification:", wrapper.message);
    // Handle friend requests, etc.
  }

  private handleConnectionStatus(rawMessage: string) {
    console.log("[MessageService] Connection status:", rawMessage);
  }

  private handleInfoMessage(rawMessage: string) {
    console.log("[MessageService] Info message:", rawMessage);
  }

  private handleErrorMessage(rawMessage: string) {
    console.log("[MessageService] Error message:", rawMessage);
  }

  // MARK: - Message Management

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await invoke("db_delete_message", { message_id: messageId });
    } catch (error) {
      console.error(`[MessageService] Failed to delete message ${messageId}:`, error);
      throw error;
    }
  }

  async clearMessages(chatId: string): Promise<void> {
    try {
      await invoke("db_clear_messages", { chat_id: chatId });
    } catch (error) {
      console.error(`[MessageService] Failed to clear messages for chat ${chatId}:`, error);
      throw error;
    }
  }

  async refreshMessages(chatId: string): Promise<void> {
    try {
      const messages = await this.fetchMessages(chatId);
              this.cachedMessages = messages as any;
    } catch (error) {
      console.error(`[MessageService] Failed to refresh messages for chat ${chatId}:`, error);
    }
  }

  getCachedMessages(): MessageEntity[] {
    return this.cachedMessages;
  }

  // Test method to manually emit a test message
  testEmitMessage() {
    console.log("[MessageService] 🧪 Testing message emission...");
    const testMessage: MessageEntity = {
      message_id: "test-message-id",
      client_message_id: "test-client-id",
      chat_id: "41d22dac-b005-49db-a248-58b3d0c6b71a", // Use the chat ID from your logs
      sender_id: "58f7d494-c7c9-4f50-a383-a0cc525233df", // Use the sender ID from your logs
      content: "Test message from MessageService",
      message_text: "Test message from MessageService",
      timestamp: Date.now(),
      is_read: false,
      is_sent: true,
      is_delivered: true,
      is_failed: false,
      sender_username: undefined,
      reply_to_message_id: undefined
    };
    
    console.log("[MessageService] 🧪 Emitting test message:", testMessage);
    this.emitMessage(testMessage);
    console.log("[MessageService] 🧪 Test message emission completed");
  }

  // MARK: - Utility Methods

  private async updateChatLastMessage(chatId: string, content: string, timestamp: number): Promise<void> {
    try {
      await invoke("db_update_chat_last_message", { 
        chat_id: chatId, 
        content, 
        timestamp 
      });
    } catch (error) {
      console.error(`[MessageService] Failed to update chat last message:`, error);
    }
  }

  private parseJson<T>(jsonString: string): T | null {
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error(`[MessageService] Failed to parse JSON:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();
console.log("[MessageService] 🚀 MessageService instance created and exported");
console.log('📦 MessageService module: messageService exported');

// Export convenience functions
export const fetchMessages = (chatId: string, limit: number = 50) => messageService.fetchMessages(chatId, limit);

export const insertMessage = async (message: MessageEntity) => {
  await messageService.insertAndEmit(message);
};
export const updateMessageStatus = async (messageId: string, status: string) => {
  const statusEnum = status === "sent" ? MessageSendStatus.SENT :
                    status === "delivered" ? MessageSendStatus.DELIVERED :
                    status === "read" ? MessageSendStatus.READ :
                    MessageSendStatus.FAILED;
  await messageService.updateMessageStatus(messageId, undefined, statusEnum);
};
export const replaceLocalMessageId = async (localId: string, serverId: string) => {
  await messageLinkingManager.updateLocalMessageId(localId, serverId);
};
