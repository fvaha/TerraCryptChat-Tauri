import { databaseServiceAsync } from './databaseServiceAsync';
import { encryptionService } from '../encrypt/encryptionService';
import { messageLinkingManager } from '../linking/messageLinkingManager';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { MessageEntity, Message } from "../models/models";
import { sessionManager } from "../utils/sessionManager";
import { websocketService } from '../websocket/websocketService';
import { chatService } from './chatService';
import { normalizeTimestamp } from '../utils/timestampUtils';
import { participantService } from '../participant/participantService';

/**
 * MessageService - Handles all message operations
 * 
 * ENCRYPTION STRATEGY:
 * - Messages are stored DECRYPTED in the database for performance
 * - Messages are encrypted ONLY when sending via WebSocket
 * - Messages are decrypted ONLY when receiving from WebSocket
 * - This eliminates repeated encryption/decryption operations when displaying messages
 */

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class MessageService {
  private messageFlow: ((message: MessageEntity) => void) | null = null;
  private cachedMessages: MessageEntity[] = [];
  private localDeletes: Set<string> = new Set();
  private activeChatId: string | null = null;
  
  // FIXED: Track processed chat notifications to prevent duplicates
  private processedChatNotifications: Set<string> = new Set();

  constructor() {
    console.log("[MessageService] Constructor called - creating new MessageService instance");
    this.setupWebSocketMessageHandler();
    this.setupTauriEventListeners();
    
    // FIXED: Add startup debugging
    this.logStartupState();
    
    // Clean up any existing duplicate chats on startup
    this.cleanupDuplicateChats();
    
    // Also run cleanup after a delay to catch any late duplicates
    setTimeout(() => {
      this.cleanupDuplicateChats();
    }, 2000);
    

  }

  private attachWebSocketManager() {
    console.log("[MessageService] attachWebSocketManager called - setting up event listeners immediately");
    
    // Use the WebSocket service's onMessage handler instead of Tauri events directly
    this.setupWebSocketMessageHandler();
    
    // Keep Tauri event listeners for status updates and other events
    this.setupTauriEventListeners();
    
    console.log("[MessageService] Event listeners set up immediately");
    console.log("[MessageService] MessageService module: messageService exported");
  }

  private setupWebSocketMessageHandler() {
    console.log("[MessageService] Setting up WebSocket message handler...");
    
    // FIXED: Don't double-encode the message - pass it directly
    websocketService.onMessage((message) => {
      console.log("[MessageService] Received message from WebSocketService:", message);
      // Pass the message object directly, not JSON.stringify(message)
      this.handleIncomingMessage(message);
    });
    
    console.log("[MessageService] WebSocket message handler set up successfully");
  }

  private setupTauriEventListeners() {
    try {
      console.log("[MessageService] Setting up Tauri event listeners...");

      // Listen for test events to verify event system
      listen<{ payload: unknown }>("test-event", async (event) => {
        console.log("[MessageService] Test event received:", event.payload);
      }).then(() => {
        console.log("[MessageService] test-event listener set up successfully");
      }).catch(error => {
        console.error("[MessageService] Failed to set up test-event listener:", error);
      });

      console.log("[MessageService] All Tauri event listeners set up successfully");
    } catch (error) {
      console.error("[MessageService] Failed to set up Tauri event listeners:", error);
    }
  }

  // Set active chat (like Swift's ChatManager.shared.activeChatId)
  setActiveChat(chatId: string | null) {
    console.log("[MessageService] setActiveChat called with:", chatId);
    this.activeChatId = chatId;
    console.log("[MessageService] Active chat set to:", this.activeChatId);
  }

  // Get active chat ID
  getActiveChatId(): string | null {
    return this.activeChatId;
  }

  // MARK: - Message Flow Management (following Swift pattern)
  setMessageFlow(flow: ((message: MessageEntity) => void) | null) {
    console.log("[MessageService] setMessageFlow called with:", flow ? "callback function" : "null");
    console.log("[MessageService] Current active chat:", this.activeChatId);
    console.log("[MessageService] Previous message flow callback existed:", !!this.messageFlow);
    
    this.messageFlow = flow;
    
    if (flow) {
      console.log("[MessageService] Message flow callback set successfully:", !!this.messageFlow);
      console.log("[MessageService] Message flow callback is now active - messages will appear in UI");
    } else {
      console.log("[MessageService] Message flow callback cleared - messages will NOT appear in UI");
    }
  }

  private emitMessage(message: MessageEntity) {
    console.log("[MessageService] emitMessage called for message:", message.message_id || message.client_message_id, "for chat:", message.chat_id);
    console.log("[MessageService] Current active chat:", this.activeChatId);
    console.log("[MessageService] Message flow callback exists:", !!this.messageFlow);
    console.log("[MessageService] Message content:", message.content.substring(0, 50) + "...");
    console.log("[MessageService] Message timestamp:", message.timestamp);
    console.log("[MessageService] Message sender:", message.sender_id);
    
    if (this.messageFlow) {
      console.log("[MessageService] Message flow is set, calling callback");
      try {
        this.messageFlow(message);
        console.log("[MessageService] Message flow callback executed successfully");
      } catch (error) {
        console.error("[MessageService] Error in message flow callback:", error);
      }
    } else {
      console.log("[MessageService] No message flow callback set - message will not appear in UI");
      console.log("[MessageService] This is why messages are not showing in ChatScreen!");
    }
  }

  cacheMessage(message: MessageEntity) {
    this.cachedMessages.push(message);
  }

  getCachedMessages(): MessageEntity[] {
    return [...this.cachedMessages];
  }

  clearCache() {
    this.cachedMessages = [];
  }

  async saveMessage(chat_id: string, content: string, sender_id: string, timestamp: number): Promise<string> {
    try {
      const client_message_id = generateUUID();
      const messageEntity: MessageEntity = {
        message_id: undefined,
        client_message_id: client_message_id,
        chat_id: chat_id,
        sender_id: sender_id,
        content: content, // Store decrypted content
        timestamp,
        is_read: false,
        is_sent: false,
        is_delivered: false,
        is_failed: false
      };

      // Convert MessageEntity to Message for database service
      const messageForDb = {
        message_id: client_message_id, // Use client_message_id as temporary message_id
        chat_id: chat_id,
        sender_id: sender_id,
        content: content, // Store decrypted content in database
        timestamp: Date.now() * 1_000_000, // Convert to nanoseconds for consistent precision
        is_read: false,
        is_sent: false,
        is_delivered: false,
        is_failed: false,
        client_message_id: client_message_id
      };

      await databaseServiceAsync.insertMessage(messageForDb);
      this.emitMessage(messageEntity);
      
      return client_message_id;
    } catch (error) {
      console.error(`[MessageService] Failed to save message:`, error);
      throw error;
    }
  }

  async saveOutgoingMessage(
    client_message_id: string,
    chat_id: string,
    content: string,
    sender_id: string,
    reply_to_message_id?: string
  ): Promise<void> {
    try {
      console.log("[MessageService] saveOutgoingMessage called:", {
        client_message_id, chat_id, content: content.substring(0, 50) + "...", sender_id
      });
      
      // DEBUG: Check content before storing
      console.log("[MessageService] 🔍 DEBUG - saveOutgoingMessage content check:");
      console.log("[MessageService] - Content to store:", content);
      console.log("[MessageService] - Content type:", typeof content);
      console.log("[MessageService] - Content length:", content.length);
      console.log("[MessageService] - Looks encrypted:", content.includes('==') || content.length > 100);
      
      // FIXED: Check if message already exists to prevent duplicates
      const existingMessage = await this.getMessageByClientId(client_message_id);
      if (existingMessage) {
        console.log("[MessageService] Outgoing message already exists, skipping:", client_message_id);
        return;
      }
      
      const sender_username = await this.resolveSenderUsername(sender_id);
      const messageEntity: MessageEntity = {
        message_id: undefined,
        client_message_id: client_message_id,
        chat_id: chat_id,
        sender_id: sender_id,
        content: content, // Store decrypted content
        timestamp: Date.now(),
        is_read: false,
        is_sent: false,
        is_delivered: false,
        sender_username: sender_username,
        reply_to_message_id: reply_to_message_id,
        is_failed: false
      };

      // Convert MessageEntity to Message for database service
      const messageForDb = {
        message_id: client_message_id, // Use client_message_id as temporary message_id
        chat_id: chat_id,
        sender_id: sender_id,
        content: content, // Store decrypted content in database
        timestamp: Date.now() * 1_000_000, // Convert to nanoseconds for consistent precision
        is_read: false,
        is_sent: false,
        is_delivered: false,
        is_failed: false,
        client_message_id: client_message_id,
        sender_username: sender_username,
        reply_to_message_id: reply_to_message_id
      };

      console.log("[MessageService] About to insert outgoing message into database:", messageForDb);
      await databaseServiceAsync.insertMessage(messageForDb);
      console.log("[MessageService] Outgoing message inserted into database successfully");
      
      // FIXED: Emit message to UI immediately after database insertion
      console.log("[MessageService] About to emit outgoing message to UI:", messageEntity);
      this.emitMessage(messageEntity);
      console.log("[MessageService] Outgoing message emitted to UI successfully");
    } catch (error) {
      console.error("[MessageService] Failed to save outgoing message:", error);
      throw error;
    }
  }

  async saveIncomingMessage(
    message_id: string | undefined,
    client_message_id: string | undefined,
    chat_id: string,
    content: string,
    sender_id: string,
    sent_at: number,
    sender_name: string,
    reply_to_message_id?: string
  ): Promise<void> {
    try {
      console.log("[MessageService] saveIncomingMessage called:", {
        message_id, client_message_id, chat_id, content: content.substring(0, 50) + "...", sender_id, sent_at
      });
      
      // FIXED: Check if message already exists to prevent duplicates
      if (message_id) {
        const existingMessage = await this.getMessageById(message_id);
        if (existingMessage) {
          console.log("[MessageService] Message already exists in database, skipping:", message_id);
          return;
        }
      }
      
      // Generate client_message_id if not provided (for incoming messages)
      const finalClientMessageId = client_message_id || message_id || generateUUID();
      
      const messageEntity: MessageEntity = {
        message_id: message_id,
        client_message_id: finalClientMessageId,
        chat_id: chat_id,
        sender_id: sender_id,
        content: content, // Store decrypted content
        timestamp: normalizeTimestamp(sent_at),
        is_read: false,
        is_sent: true,
        is_delivered: true,
        sender_username: sender_name,
        reply_to_message_id: reply_to_message_id,
        is_failed: false
      };

      // Create Message object for database (without is_failed)
      const messageForDb = {
        message_id: message_id || finalClientMessageId,
        chat_id: chat_id,
        sender_id: sender_id,
        content: content, // Store decrypted content in database
        timestamp: normalizeTimestamp(sent_at),
        is_read: false,
        is_sent: true,
        is_delivered: true,
        is_failed: false,
        client_message_id: finalClientMessageId,
        sender_username: sender_name,
        reply_to_message_id: reply_to_message_id
      };

      console.log("[MessageService] About to insert message into database:", messageForDb);
      await databaseServiceAsync.insertMessage(messageForDb);
      console.log("[MessageService] Message inserted into database successfully");
      
      // FIXED: Emit message to UI after successful database insertion
      console.log("[MessageService] About to emit message to UI:", messageEntity);
      this.emitMessage(messageEntity);
      console.log("[MessageService] Message emitted to UI successfully");
    } catch (error) {
      console.error("[MessageService] Failed to save incoming message:", error);
    }
  }

  async getMessages(chatId: string, limit: number = 50, before?: string): Promise<MessageEntity[]> {
    try {
      console.log(`[MessageService] Getting messages for chat ${chatId}, limit: ${limit}`);
      
      // Get messages from database
      const messages = await databaseServiceAsync.getMessagesForChat(chatId);
      

      
      // Convert to MessageEntity - content is already decrypted in database
      const decryptedMessages: MessageEntity[] = messages.map(msg => {
        return {
          message_id: msg.message_id || undefined,
          client_message_id: msg.client_message_id,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          content: msg.content, // Content is already decrypted in database
          timestamp: normalizeTimestamp(msg.timestamp),
          is_read: msg.is_read,
          is_sent: msg.is_sent,
          is_delivered: msg.is_delivered,
          is_failed: msg.is_failed,
          sender_username: msg.sender_username,
          reply_to_message_id: msg.reply_to_message_id
        };
      });
      
      console.log(`[MessageService] Retrieved ${decryptedMessages.length} messages for chat ${chatId}`);
      return decryptedMessages;
    } catch (error) {
      console.error(`[MessageService] Failed to get messages for chat ${chatId}:`, error);
      return [];
    }
  }

  // Add fetchMessages method for compatibility with old code
  async fetchMessages(chatId: string, limit: number = 50, beforeTimestamp?: number): Promise<MessageEntity[]> {
    try {
      console.log(`[MessageService] Fetching messages for chat ${chatId}, limit: ${limit}`);
      
      let messages: Message[];
      if (beforeTimestamp) {
        messages = await databaseServiceAsync.getMessagesBeforeTimestamp(chatId, beforeTimestamp, limit);
      } else {
        messages = await databaseServiceAsync.getMessagesForChat(chatId);
      }
      
      if (!Array.isArray(messages)) {
        console.warn("Invalid messages data received:", messages);
        return [];
      }
      
      // Convert Message to MessageEntity - content is already decrypted in database
      const convertedMessages: MessageEntity[] = messages.map(msg => {
        return {
          message_id: msg.message_id,
          client_message_id: msg.client_message_id || msg.message_id,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          content: msg.content, // Content is already decrypted in database
          timestamp: normalizeTimestamp(msg.timestamp),
          is_read: msg.is_read,
          is_sent: msg.is_sent,
          is_delivered: msg.is_delivered,
          is_failed: false, // Default value for MessageEntity
          sender_username: msg.sender_username,
          reply_to_message_id: msg.reply_to_message_id
        };
      });
      
      // Sort messages by timestamp and limit results
      const sortedMessages = convertedMessages
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
    try {
      const messages = await databaseServiceAsync.getMessagesBeforeTimestamp(chatId, beforeTimestamp, 50);
      
      // Convert Message to MessageEntity - content is already decrypted in database
      return messages.map(msg => {
        return {
          message_id: msg.message_id,
          client_message_id: msg.client_message_id || msg.message_id,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          content: msg.content, // Content is already decrypted in database
          timestamp: normalizeTimestamp(msg.timestamp),
          is_read: msg.is_read,
          is_sent: msg.is_sent,
          is_delivered: msg.is_delivered,
          is_failed: false, // Default value for MessageEntity
          sender_username: msg.sender_username,
          reply_to_message_id: msg.reply_to_message_id
        };
      });
    } catch (error) {
      console.error(`Failed to fetch old messages for chat ${chatId}:`, error);
      return [];
    }
  }

  async getMessageById(message_id: string): Promise<MessageEntity | null> {
    try {
      const message = await databaseServiceAsync.getMessageById(message_id);
      if (!message) return null;
      
      // Convert Message to MessageEntity - content is already decrypted in database
      return {
        message_id: message.message_id,
        client_message_id: message.client_message_id || message.message_id,
        chat_id: message.chat_id,
        sender_id: message.sender_id,
        content: message.content, // Content is already decrypted in database
        timestamp: normalizeTimestamp(message.timestamp),
        is_read: message.is_read,
        is_sent: message.is_sent,
        is_delivered: message.is_delivered,
        is_failed: false, // Default value for MessageEntity
        sender_username: message.sender_username,
        reply_to_message_id: message.reply_to_message_id
      } as MessageEntity;
    } catch (error) {
      console.error(`[MessageService] Failed to get message by ID ${message_id}:`, error);
      return null;
    }
  }

  async getMessageByClientId(client_message_id: string): Promise<MessageEntity | null> {
    try {
      const message = await databaseServiceAsync.getMessageByClientId(client_message_id);
      if (!message) return null;
      
      // Convert Message to MessageEntity - content is already decrypted in database
      return {
        message_id: message.message_id,
        client_message_id: message.client_message_id || message.message_id,
        chat_id: message.chat_id,
        sender_id: message.sender_id,
        content: message.content, // Content is already decrypted in database
        timestamp: normalizeTimestamp(message.timestamp),
        is_read: message.is_read,
        is_sent: message.is_sent,
        is_delivered: message.is_delivered,
        is_failed: false, // Default value for MessageEntity
        sender_username: message.sender_username,
        reply_to_message_id: message.reply_to_message_id
      } as MessageEntity;
    } catch (error) {
      console.error(`[MessageService] Failed to get message by client ID ${client_message_id}:`, error);
      return null;
    }
  }

  async markMessageAsRead(message_id: string): Promise<void> {
    try {
      // Note: This would need to be implemented in the backend
      console.log(`[MessageService] Mark message as read requested for ${message_id}`);
      // TODO: Implement when backend method is available
    } catch (error) {
      console.error(`[MessageService] Failed to mark message as read ${message_id}:`, error);
    }
  }

  async markMessageAsDelivered(message_id: string): Promise<void> {
    try {
      // Note: This would need to be implemented in the backend
      console.log(`[MessageService] Mark message as delivered requested for ${message_id}`);
      // TODO: Implement when backend method is available
    } catch (error) {
      console.error(`[MessageService] Failed to mark message as delivered ${message_id}:`, error);
    }
  }

  async markMessageAsSent(message_id: string): Promise<void> {
    try {
      // Note: This would need to be implemented in the backend
      console.log(`[MessageService] Mark message as sent requested for ${message_id}`);
      // TODO: Implement when backend method is available
    } catch (error) {
      console.error(`[MessageService] Failed to mark message as sent ${message_id}:`, error);
    }
  }

  async markMessageAsFailed(message_id: string): Promise<void> {
    try {
      // Note: This would need to be implemented in the backend
      console.log(`[MessageService] Mark message as failed requested for ${message_id}`);
      // TODO: Implement when backend method is available
    } catch (error) {
      console.error(`[MessageService] Failed to mark message as failed ${message_id}:`, error);
    }
  }

  async deleteMessage(message_id: string): Promise<void> {
    try {
      await databaseServiceAsync.deleteMessageById(message_id);
      this.localDeletes.add(message_id);
      console.log(`[MessageService] Message deleted successfully: ${message_id}`);
    } catch (error) {
      console.error(`[MessageService] Failed to delete message ${message_id}:`, error);
      throw error;
    }
  }

  isMessageLocallyDeleted(message_id: string): boolean {
    return this.localDeletes.has(message_id);
  }

  // MARK: - Message Sending (following Swift pattern)

  async sendMessage(content: string, chatId: string, replyToMessageId?: string): Promise<string> {
    try {
      const currentUserId = await this.getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error("No current user ID available");
      }

      const clientMessageId = generateUUID();

      // DEBUG: Check if content is already encrypted
      console.log("[MessageService] 🔍 DEBUG - sendMessage content check:");
      console.log("[MessageService] - Original content:", content);
      console.log("[MessageService] - Content type:", typeof content);
      console.log("[MessageService] - Content length:", content.length);
      console.log("[MessageService] - Looks encrypted:", content.includes('==') || content.length > 100);

      // Save message locally first (like Swift)
      await this.saveOutgoingMessage(
        clientMessageId,
        chatId,
        content,
        currentUserId,
        replyToMessageId
      );

      // FIXED: Don't emit message here - it's already emitted in saveOutgoingMessage
      // This prevents double message emission

      // Send via Rust WebSocket connection
      await this.actuallySendMessage(clientMessageId, content, chatId, currentUserId);
      
      return clientMessageId;
    } catch (error) {
      console.error(`[MessageService] Failed to send message:`, error);
      throw error;
    }
  }

  // Internal send logic (like Swift)
  private async actuallySendMessage(clientId: string, content: string, chatId: string, senderId: string): Promise<void> {
    try {
      // Check if WebSocket is connected (this would need to be implemented)
      // For now, we'll assume it's connected
      
      // Encrypt the message content only when sending via websocket
      // Content is stored decrypted in database for better performance
      console.log("[MessageService] Encrypting message content for transmission:", content.substring(0, 50) + "...");
      const encryptedContent = encryptionService.encryptMessage(content);
      console.log("[MessageService] Message encrypted successfully, length:", encryptedContent.length);

      // Prepare the payload for sending the message (like Swift/Kotlin)
      const payload = {
        type: "chat",
        message: {
          chat_id: chatId,
          content: encryptedContent, // Send encrypted content via websocket
          sender_id: senderId
        },
        client_message_id: clientId
      };

      console.log("🔍 [MessageService] PREPARED MESSAGE PAYLOAD:");
      console.log("📤 Complete payload object:", payload);
      console.log("📤 Payload type:", payload.type);
      console.log("📤 Message object:", payload.message);
      console.log("📤 Chat ID:", payload.message.chat_id);
      console.log("📤 Content length:", payload.message.content.length);
      console.log("📤 Sender ID:", payload.message.sender_id);
      console.log("📤 Client message ID:", payload.client_message_id);
      console.log("🔍 [MessageService] END PAYLOAD LOG");

      // Send the message using Tauri invoke
      console.log("[MessageService] Sending message via Tauri invoke...");
      await invoke('send_socket_message', { message: JSON.stringify(payload) });
      console.log("[MessageService] Message sent via Tauri invoke successfully");

      // After the message is sent, update the status to 'sent'
      await this.updateMessageStatus(undefined, clientId, "sent");
    } catch (error) {
      console.error(`[MessageService] Failed to actually send message:`, error);
      // If not connected, mark the message as failed
      await this.updateMessageStatus(undefined, clientId, "failed");
      throw error;
    }
  }

  // MARK: - Message Resending (like Swift)

  async resendUnsentMessage(message: MessageEntity): Promise<void> {
    try {
      console.log(`[MessageService] Resending message: ${message.client_message_id || message.message_id}`);
      
      // Check if the message status is 'failed' (like Swift)
      if (!message.is_failed) {
        console.log("[MessageService] Message is not failed, cannot resend.");
        return;
      }

      // Proceed to resend the message (like Swift)
      await this.sendMessage(message.content, message.chat_id, message.reply_to_message_id);
      
      console.log(`[MessageService] Message resent successfully`);
    } catch (error) {
      console.error(`[MessageService] Failed to resend message:`, error);
      throw error;
    }
  }

  async markAllMessagesAsRead(chatId: string): Promise<void> {
    try {
      // Get all unread messages for this chat
      const messages = await this.getMessages(chatId, 1000);
      const currentUserId = await this.getCurrentUserId();
      const unreadMessages = messages.filter(msg => !msg.is_read && msg.sender_id !== currentUserId);
      
      // Mark each message as read
      for (const message of unreadMessages) {
        if (message.message_id) {
          await this.markMessageAsRead(message.message_id);
        }
      }
      
      console.log(`[MessageService] Marked ${unreadMessages.length} messages as read for chat ${chatId}`);
    } catch (error) {
      console.error(`[MessageService] Failed to mark all messages as read for chat ${chatId}:`, error);
    }
  }

  private async resolveSenderUsername(sender_id: string): Promise<string> {
    try {
      // Try to get username from participant service first
      try {
        // Get all chats to find which one this sender is in
        const allChats = await invoke<any[]>('db_get_all_chats');
        if (allChats && Array.isArray(allChats)) {
          for (const chat of allChats) {
            try {
              const participants = await invoke<any[]>('db_get_participants_for_chat', { chatId: chat.chat_id });
              if (participants && Array.isArray(participants)) {
                const participant = participants.find((p: any) => p.user_id === sender_id);
                if (participant && participant.username && participant.username.trim() !== '' && participant.username !== sender_id) {
                  console.log(`[MessageService] Resolved username from participant: ${participant.username}`);
                  return participant.username;
                }
              }
            } catch (error) {
              // Continue to next chat
            }
          }
        }
      } catch (error) {
        console.warn(`[MessageService] Could not get username from participants:`, error);
      }
      
      // Try to get from user service
      try {
        const user = await invoke<any>('db_get_user_by_id', { user_id: sender_id });
        if (user && user.username && user.username.trim() !== '' && user.username !== sender_id) {
          console.log(`[MessageService] Resolved username from user service: ${user.username}`);
          return user.username;
        }
      } catch (error) {
        console.warn(`[MessageService] Could not get username from user service:`, error);
      }
      
      // Try to get from friends list
      try {
        const friends = await invoke<any[]>('db_get_cached_friends_only');
        if (friends && Array.isArray(friends)) {
          const friend = friends.find((f: any) => f.user_id === sender_id);
          if (friend && friend.username && friend.username.trim() !== '' && friend.username !== sender_id) {
            console.log(`[MessageService] Resolved username from friends: ${friend.username}`);
            return friend.username;
          }
        }
      } catch (error) {
        console.warn(`[MessageService] Could not get username from friends:`, error);
      }
      
      // Final fallback: return a truncated user_id as username
      if (sender_id.length > 8) {
        return `user_${sender_id.substring(0, 8)}`;
      } else {
        return `user_${sender_id}`;
      }
    } catch (error) {
      console.error(`[MessageService] Failed to resolve sender username for ${sender_id}:`, error);
      // Return a truncated user_id as fallback
      if (sender_id.length > 8) {
        return `user_${sender_id.substring(0, 8)}`;
      } else {
        return `user_${sender_id}`;
      }
    }
  }



  async handleIncomingMessage(raw_message: string | any) {
    console.log("[MessageService] INCOMING: Processing WebSocket message:", 
      typeof raw_message === 'string' ? raw_message.substring(0, 100) + "..." : JSON.stringify(raw_message).substring(0, 100) + "...");
    
    if (!raw_message) {
      console.log("[MessageService] Invalid message, skipping");
      return;
    }

    try {
      // Parse the message to get the type (if it's a string)
      const messageData = typeof raw_message === 'string' ? JSON.parse(raw_message) : raw_message;
      const messageType = messageData.type;
      
      console.log("[MessageService] Raw message data:", messageData);
      console.log("[MessageService] Message type:", messageType);
      
      if (!messageType) {
        console.warn("[MessageService] Message missing type field:", messageData);
        return;
      }
      
      switch (messageType) {
        case "chat":
          console.log("[MessageService] Processing chat message...");
          // Handle incoming chat messages from other users
          await this.handleChatMessage(raw_message);
          break;
        case "chat-message":
          console.log("[MessageService] Processing chat-message...");
          // Alternative chat message type
          await this.handleChatMessage(raw_message);
          break;
        case "message-status":
          console.log("[MessageService] Processing message status update...");
          console.log("[MessageService] Message status data:", messageData);
          // Handle status updates (sent, delivered, read)
          await this.handleIncomingMessageStatus(messageData);
          break;
        case "message-saved":
          console.log("[MessageService] Message-saved event received, processing...");
          await this.handleMessageSaved(messageData.message || messageData);
          break;
        case "message-status-update":
          console.log("[MessageService] Message-status-update event received, processing...");
          await this.handleMessageStatusUpdate(messageData.message || messageData);
          break;
        case "chat-notification":
          console.log("[MessageService] Chat notification received, processing...");
          await this.handleChatNotification(messageData);
          break;
        case "request-notification":
          console.log("[MessageService] Friend request notification received...");
          await this.handleRequestNotification(messageData);
          break;
        case "connection-status":
          console.log("[MessageService] Connection status message received:", messageData.message?.status);
          break;
        case "error":
          console.log("[MessageService] Error message received:", messageData.message?.error);
          break;
        case "info":
          console.log("[MessageService] Info message received:", messageData.message);
          break;
        default:
          console.log("[MessageService] Unknown message type:", messageType, "Data:", messageData);
      }
    } catch (error) {
      console.error("[MessageService] Error processing incoming message:", error);
    }
  }

  // Handle incoming chat messages (following API documentation format)
  async handleChatMessage(rawMessage: string) {
    try {
      console.log("[MessageService] Processing chat message:", rawMessage);
      
      const messageData = JSON.parse(rawMessage);
      const payload = messageData.message || messageData;
      
      const { message_id, client_message_id, chat_id, content, sender_id, sent_at, sender_name, reply_to_message_id } = payload;
      
      if (!chat_id || !content || !sender_id || !sent_at) {
        console.warn("[MessageService] Invalid chat message format:", payload);
        return;
      }

      // FIXED: Check if chat exists locally, if not create it
      try {
        const existingChat = await invoke('db_get_chat_by_id', { chatId: chat_id });
        if (!existingChat) {
          console.log("[MessageService] Chat not found locally, creating from message data:", chat_id);
          
          // Create a minimal chat from the message data
          // We'll need to get participant info to create the chat properly
          const currentUserId = await this.getCurrentUserId();
          if (currentUserId) {
            // Create a basic chat structure
            const chat = {
              chat_id: chat_id,
              name: null, // Will be generated later
              created_at: sent_at ? new Date(sent_at).getTime() : Date.now(),
              creator_id: sender_id,
              is_group: false, // Assume 1-on-1 for now, will be updated if needed
              description: '',
              group_name: '',
              last_message_content: '',
              last_message_timestamp: null,
              unread_count: 0,
              participants: JSON.stringify([currentUserId, sender_id])
            };

            await invoke('db_insert_chat', { chat });
            console.log("[MessageService] Created missing chat from message:", chat_id);

            // Create participants
            const currentUserParticipant = {
              participant_id: `${chat_id}_${currentUserId}`,
              chat_id: chat_id,
              user_id: currentUserId,
              role: 'member',
              joined_at: Date.now(),
              username: currentUserId
            };

            const senderParticipant = {
              participant_id: `${chat_id}_${sender_id}`,
              chat_id: chat_id,
              user_id: sender_id,
              role: 'member',
              joined_at: sent_at ? new Date(sent_at).getTime() : Date.now(),
              username: sender_name || sender_id
            };

            await invoke('db_insert_participant', { participant: currentUserParticipant });
            await invoke('db_insert_participant', { participant: senderParticipant });
            console.log("[MessageService] Created participants for missing chat:", chat_id);

            // Trigger chat name generation
            try {
              const token = await sessionManager.getToken();
              await invoke('generate_and_save_chat_name', { token, chat_id });
            } catch (nameError) {
              console.warn("[MessageService] Failed to generate chat name for new chat:", nameError);
            }
          }
        }
      } catch (chatError) {
        console.warn("[MessageService] Failed to check/create chat, proceeding with message:", chatError);
      }

      console.log("[MessageService] 🔍 ENCRYPTION DEBUG:");
      console.log("[MessageService] - Raw encrypted content:", content);
      console.log("[MessageService] - Content type:", typeof content);
      console.log("[MessageService] - Content length:", content.length);

      // FIXED: Use Swift approach - check if message already exists first
      const exists = await this.messageExists(client_message_id || "", message_id || "");
      if (exists) {
        console.log("[MessageService] Message already exists, skipping insert.");
        return;
      }

      // Decrypt message content before storing in database
      console.log("[MessageService] Attempting to decrypt message...");
      let decryptedContent: string;
      
      try {
        // Check if content looks encrypted (base64 with == ending)
        const looksEncrypted = content.includes('==') && content.length > 20;
        console.log("[MessageService] - Content looks encrypted:", looksEncrypted);
        
        if (looksEncrypted) {
          decryptedContent = encryptionService.decryptMessage(content);
          console.log("[MessageService] - Decrypted content:", decryptedContent);
          console.log("[MessageService] - Decryption successful:", decryptedContent !== content);
        } else {
          // Content doesn't look encrypted, use as-is
          decryptedContent = content;
          console.log("[MessageService] - Content appears to be already decrypted, using as-is");
        }
      } catch (error) {
        console.warn("[MessageService] Decryption failed, using content as-is:", error);
        decryptedContent = content;
      }

      // FIXED: Use Swift approach - save message regardless of active chat
      // Store decrypted content in database for better performance
      await this.saveIncomingMessage(
        message_id,
        client_message_id,
        chat_id,
        decryptedContent, // Store decrypted content in database
        sender_id,
        sent_at,
        sender_name || sender_id,
        reply_to_message_id
      );

      // FIXED: Use Swift approach - update unread count for non-active chats
      const activeChatId = this.getActiveChatId();
      if (chat_id !== activeChatId) {
        await this.incrementUnreadCount(chat_id);
        console.log("[MessageService] Incremented unread count for non-active chat:", chat_id);
      } else {
        // FIXED: Use Swift approach - reset unread count for active chat
        await this.resetUnreadCount(chat_id);
        console.log("[MessageService] Reset unread count for active chat:", chat_id);
      }

      // FIXED: Use Swift approach - update UI only for active chat
      if (chat_id === activeChatId) {
        console.log("[MessageService] Updating UI for active chat:", chat_id);
        // Trigger message refresh for the active chat
        if (this.messageFlow) {
          // Get fresh messages from database
          const messages = await this.getMessages(chat_id);
          // Find the new message and emit it
          const newMessage = messages.find(msg => 
            (msg.message_id === message_id) || (msg.client_message_id === client_message_id)
          );
          if (newMessage) {
            this.emitMessage(newMessage);
          }
        }
      }

      console.log("[MessageService] Chat message processed successfully");
      
    } catch (error) {
      console.error("[MessageService] Failed to handle chat message:", error);
    }
  }

  // Handle message status updates from Rust backend (following API documentation)
  async handleMessageStatusUpdate(payload: MessageStatusUpdatePayload) {
    try {
      const { message_id, status, chat_id, sender_id, timestamp, client_message_id } = payload;

      if (!message_id || !status) {
        console.warn("[MessageService] Invalid status update payload:", payload);
        return;
      }

      console.log(`[MessageService] Processing status update: ${status} for message ${message_id}`);

      // FIXED: Handle different status types according to API documentation
      switch (status) {
        case "sent":
          if (client_message_id) {
            // Link the client message ID with server message ID
            console.log("[MessageService] Linking message for 'sent' status:", { client_message_id, message_id });
            await messageLinkingManager.robustLinking(
              chat_id,
              sender_id,
              message_id,
              client_message_id,
              timestamp ? new Date(timestamp).getTime() : undefined
            );
          }
          // Update message status to 'sent'
          await messageLinkingManager.updateMessageStatus(message_id, "sent");
          break;
          
        case "delivered":
          if (message_id) {
            console.log("[MessageService] Updating 'delivered' status for message:", message_id);
            console.log("[MessageService] Delivered status payload:", { message_id, status, chat_id, sender_id, timestamp, client_message_id });
            await this.updateMessageStatus(message_id, undefined, "delivered");
          } else {
            console.warn("[MessageService] Missing message_id for 'delivered' status");
          }
          break;
          
        case "read":
          // Update message status to 'read'
          await messageLinkingManager.updateMessageStatus(message_id, "read");
          break;
          
        default:
          console.warn("[MessageService] Unknown status:", status);
          return;
      }
      
      // FIXED: Status updates should NOT emit messages to UI - they only update database
      // The ChatScreen will handle status updates through its own mechanisms
      console.log(`[MessageService] Status update processed for message ${message_id}: ${status}`);
      console.log(`[MessageService] Database updated, no UI emission needed for status updates`);
      
      console.log("[MessageService] Message status updated via MessageLinkingManager");
    } catch (e) {
      console.error("[MessageService] Error handling status update:", e);
    }
  }

  // Handle message saved events from Rust backend
  async handleMessageSaved(payload: MessageSavedPayload) {
    try {
      console.log("[MessageService] handleMessageSaved called with payload:", payload);
      
      const { message_id, chat_id, sender_id, content, timestamp } = payload;
      
      console.log("[MessageService] Message saved event received:", { message_id, chat_id, sender_id, content: content?.substring(0, 50) + "..." });
      
      // Convert timestamp to milliseconds if it's a string
      let timestampMs: number;
      if (typeof timestamp === 'string') {
        timestampMs = new Date(timestamp).getTime();
      } else {
        // Use normalizeTimestamp to handle nanosecond timestamps
        timestampMs = normalizeTimestamp(timestamp);
      }
      
      console.log("[MessageService] Timestamp conversion:", { original: timestamp, converted: timestampMs, date: new Date(timestampMs) });
      
      // Create message entity from saved event
      // Content from backend is already decrypted
      let decryptedContent = content;
      
      const messageEntity: MessageEntity = {
        message_id: message_id,
        client_message_id: message_id, // Use server ID as client ID for incoming messages
        chat_id: chat_id,
        sender_id: sender_id,
        content: decryptedContent, // Use decrypted content
        timestamp: timestampMs,
        is_read: false,
        is_sent: true,
        is_delivered: true,
        sender_username: undefined,
        reply_to_message_id: undefined,
        is_failed: false
      };

      console.log("[MessageService] Created message entity from saved event:", {
        message_id: messageEntity.message_id,
        client_message_id: messageEntity.client_message_id,
        chat_id: messageEntity.chat_id,
        content: messageEntity.content?.substring(0, 50) + "...",
        timestamp: messageEntity.timestamp,
        date: new Date(messageEntity.timestamp)
      });

      // Emit the message to the flow immediately
      console.log("[MessageService] About to emit message to flow...");
      console.log("[MessageService] Message flow callback exists:", !!this.messageFlow);
      console.log("[MessageService] Active chat ID:", this.activeChatId);
      console.log("[MessageService] Message chat ID:", chat_id);
      
      this.emitMessage(messageEntity);
      
      console.log("[MessageService] Message saved event processed and emitted immediately");
    } catch (error) {
      console.error("[MessageService] Error handling message saved event:", error);
    }
  }

  // Handle chat notifications (new chats created with current user)
  async handleChatNotification(messageData: any) {
    try {
      console.log("[MessageService] Processing chat notification:", messageData);
      
      // Extract the message payload from the wrapper
      const payload = messageData.message || messageData;
      const { action, chat_id, members, name, is_group, creator_id, timestamp } = payload;
      
      if (!action || !chat_id || !members) {
        console.warn("[MessageService] Invalid chat-notification format:", messageData);
        return;
      }

      const current_user_id = await this.getCurrentUserId();
      if (!current_user_id) {
        console.warn("[MessageService] No current user ID available");
        return;
      }

      const is_member = members.some((member_id: string) => 
        member_id.toLowerCase() === current_user_id.toLowerCase()
      );

      if (!is_member) {
        console.log("[MessageService] Current user is not a member of this chat, ignoring");
        return;
      }

      // FIXED: More robust duplicate prevention with detailed logging
      console.log("[MessageService] Checking for duplicates...");
      console.log("[MessageService] - Action:", action);
      console.log("[MessageService] - Chat ID:", chat_id);
      console.log("[MessageService] - Members:", members);
      console.log("[MessageService] - Is Group:", is_group);
      
      // Check if this specific chat_id has already been processed
      const chatProcessedKey = `chat_${chat_id}`;
      if (this.processedChatNotifications.has(chatProcessedKey)) {
        console.log("[MessageService] ❌ Chat ID already processed, skipping:", chat_id);
        console.log("[MessageService] Current processed notifications:", Array.from(this.processedChatNotifications));
        return;
      }

      // For 1-on-1 chats, also check if we already have a chat with the same participants
      if (!is_group && members.length === 2) {
        try {
          console.log("[MessageService] Checking for existing 1-on-1 chat with same participants...");
          // Check if we already have a chat with these exact participants
          const existingChat = await this.findExistingChatByParticipants(members);
          if (existingChat) {
            console.log("[MessageService] ❌ Chat with same participants already exists, skipping creation:", {
              existing_chat_id: existingChat.chat_id,
              new_chat_id: chat_id,
              participants: members
            });
            
            // Mark this chat as processed to prevent future processing
            this.processedChatNotifications.add(chatProcessedKey);
            console.log("[MessageService] Added to processed notifications:", chatProcessedKey);
            return;
          } else {
            console.log("[MessageService] ✅ No existing chat found with same participants");
          }
        } catch (error) {
          console.warn("[MessageService] Failed to check for existing chat by participants:", error);
        }
      }

      // FIXED: Check if this notification has already been processed
      const notificationKey = `${chat_id}_${action}_${timestamp}`;
      if (this.processedChatNotifications.has(notificationKey)) {
        console.log("[MessageService] ❌ Chat notification already processed, skipping:", notificationKey);
        console.log("[MessageService] Current processed notifications:", Array.from(this.processedChatNotifications));
        return;
      }
      
      // Mark this notification as processed
      this.processedChatNotifications.add(notificationKey);
      this.processedChatNotifications.add(chatProcessedKey);
      console.log("[MessageService] ✅ Added to processed notifications:", notificationKey, chatProcessedKey);
      console.log("[MessageService] Total processed notifications:", this.processedChatNotifications.size);
      
      // Clean up old notifications to prevent memory leaks (keep last 100)
      if (this.processedChatNotifications.size > 100) {
        const notificationsArray = Array.from(this.processedChatNotifications);
        this.processedChatNotifications = new Set(notificationsArray.slice(-50));
        console.log("[MessageService] Cleaned up old notifications, new size:", this.processedChatNotifications.size);
      }

      console.log("[MessageService] Processing chat notification for user:", current_user_id, "Action:", action);

      switch (action) {
        case "created":
          if (is_member) {
            console.log("[MessageService] 🚀 Chat created - starting sync process (Swift approach)");
            console.log("[MessageService] - Chat ID:", chat_id);
            console.log("[MessageService] - Members:", members);
            console.log("[MessageService] - Is Group:", is_group);
            console.log("[MessageService] - Name:", name);
            
            try {
              // FIXED: Create only the specific new chat instead of syncing all chats
              console.log("[MessageService] Creating specific new chat locally...");
              
              // Create the chat directly from notification data
              await this.createChatFromNotification({
                chat_id: chat_id,
                creator_id: creator_id,
                is_group: is_group,
                timestamp: timestamp,
                members: members,
                name: name
              });
              
              console.log("[MessageService] ✅ Specific chat created locally");
              
              // Verify the chat was created locally
              try {
                console.log("[MessageService] Verifying chat creation in database...");
                const createdChat = await invoke('db_get_chat_by_id', { chatId: chat_id });
                if (createdChat && typeof createdChat === 'object' && createdChat !== null) {
                  const typedChat = createdChat as { name?: string; is_group?: boolean };
                  console.log("[MessageService] ✅ Chat is now saved locally:", {
                    name: typedChat.name || "unnamed",
                    is_group: typedChat.is_group
                  });
                } else {
                  console.warn("[MessageService] ⚠️ Warning: Chat still not found locally after creation");
                }
              } catch (checkError) {
                console.warn("[MessageService] Failed to verify chat creation:", checkError);
              }
              
              // FIXED: Dispatch event only once after successful creation
              console.log("[MessageService] Dispatching chat notification event...");
              this.dispatchChatNotificationEvent('created', chat_id, payload.members, name, is_group, creator_id, timestamp);
              
              // Also trigger a toast notification like Swift
              console.log("[MessageService] ✅ Chat created successfully");
            } catch (error) {
              console.error("[MessageService] ❌ Chat creation failed:", error);
              
              // Fallback: try to fetch all chats to ensure new chat is included
              try {
                console.log("[MessageService] Trying fallback chat fetch...");
                const token = await sessionManager.getToken();
                if (token) {
                  await invoke('fetch_all_chats_and_save', { token });
                  console.log("[MessageService] ✅ Fallback chat fetch completed");
                  
                  // FIXED: Dispatch event only once after fallback completion
                  console.log("[MessageService] Dispatching chat notification event after fallback...");
                  this.dispatchChatNotificationEvent('created', chat_id, payload.members, name, is_group, creator_id, timestamp);
                }
              } catch (fallbackError) {
                console.error("[MessageService] ❌ All fallback methods failed:", fallbackError);
              }
            }
          }
          break;
          
        case "deleted":
          if (is_member) {
            console.log("[MessageService] Chat deleted - cleaning local (Swift approach)");
            
            // FIXED: Use Swift approach - add to local deletes and clean up locally
            try {
              // Add to local deletes set (like Swift's ChatService.localDeletes)
              this.localDeletes.add(chat_id);
              console.log("[MessageService] Added chat to local deletes:", chat_id);
              
              // Clean up locally
              await this.handleChatDeleted(chat_id);
              
              // FIXED: Use consolidated event dispatch method
              this.dispatchChatNotificationEvent('deleted', chat_id, payload.members, '', false, '', 0);
              
              console.log("[MessageService] Chat deletion cleanup completed");
            } catch (error) {
              console.error("[MessageService] Failed to clean up deleted chat:", error);
            }
          }
          break;
          
        case "left":
          if (is_member) {
            console.log("[MessageService] User left chat - removing from participants only");
            const currentUserId = await this.getCurrentUserId();
            if (currentUserId) {
              // Handle user leaving chat (don't delete the chat)
              await this.handleChatLeft(chat_id, currentUserId);
              
              // FIXED: Use consolidated event dispatch method
              this.dispatchChatNotificationEvent('left', chat_id, payload.members, '', false, '', 0);
            }
          }
          break;
          
        case "updated":
          if (is_member) {
            console.log("[MessageService] Chat updated - handling specific update");
            try {
              // FIXED: Handle specific chat update instead of syncing all chats
              console.log("[MessageService] Updating specific chat locally...");
              
              // Update the specific chat with new information
              if (name !== undefined || is_group !== undefined) {
                try {
                  // Get the existing chat first
                  const existingChat = await invoke('db_get_chat_by_id', { chatId: chat_id });
                  if (existingChat && typeof existingChat === 'object' && existingChat !== null) {
                    // Update the existing chat with new information
                    const typedChat = existingChat as { name?: string; is_group?: boolean; [key: string]: any };
                    const updatedChat = {
                      ...typedChat,
                      name: name !== undefined ? name : typedChat.name,
                      is_group: is_group !== undefined ? is_group : typedChat.is_group
                    };
                    
                    await invoke('db_insert_or_update_chat', { chat: updatedChat });
                    console.log("[MessageService] ✅ Specific chat updated locally");
                  }
                } catch (updateError) {
                  console.warn("[MessageService] Failed to update chat locally:", updateError);
                }
              }
              
              // FIXED: Use consolidated event dispatch method
              this.dispatchChatNotificationEvent('updated', chat_id, payload.members, name, is_group, creator_id, timestamp);
            } catch (error) {
              console.error("[MessageService] Chat update failed:", error);
            }
          }
          break;
          
        default:
          console.warn("[MessageService] Unknown chat action:", action);
      }
    } catch (error) {
      console.error("[MessageService] Error handling chat notification:", error);
    }
  }

  // Handle chat deletion locally (like Swift implementation)
  private async handleChatDeleted(chat_id: string) {
    try {
      console.log("[MessageService] Cleaning up deleted chat locally:", chat_id);
      
      // Try direct deletion first for immediate UI update
      try {
        await this.deleteChatFromNotification(chat_id);
        console.log("[MessageService] Chat deletion completed directly");
      } catch (directError) {
        console.warn("[MessageService] Direct deletion failed, using fallback method:", directError);
        
        // Fallback to old method
        // Clear messages for this chat
        await databaseServiceAsync.clearMessagesForChat(chat_id);
        
        // Remove all participants for this chat
        await databaseServiceAsync.removeAllParticipantsForChat(chat_id);
        
        // Delete the chat itself
        await databaseServiceAsync.deleteChatById(chat_id);
        
        console.log("[MessageService] Chat deletion cleanup completed via fallback");
      }
      
    } catch (error) {
      console.error("[MessageService] Error cleaning up deleted chat:", error);
    }
  }

  // FIXED: Handle leaving chat (user leaves, chat remains)
  private async handleChatLeft(chat_id: string, userId: string) {
    try {
      console.log("[MessageService] User left chat, removing from participants:", { chat_id, userId });
      
      // Only remove the current user from participants, don't delete the chat
      try {
        // Get the participant for this user in this chat
        const participants = await databaseServiceAsync.get_participants_for_chat(chat_id);
        const userParticipant = participants.find(p => p.user_id === userId);
        
        if (userParticipant && userParticipant.participant_id) {
          // Remove the specific user from this chat's participants
          await databaseServiceAsync.deleteParticipant(userParticipant.participant_id);
          console.log("[MessageService] User removed from chat participants:", userId);
          
          // Don't delete messages or the chat itself - other users may still be in the chat
          console.log("[MessageService] Chat left successfully, chat remains for other users");
        } else {
          console.warn("[MessageService] User participant not found for chat:", { chat_id, userId });
        }
        
      } catch (directError) {
        console.warn("[MessageService] Direct participant removal failed, using fallback:", directError);
        
        // Fallback: try to remove participant using invoke directly
        try {
          await invoke('db_remove_participant_by_user_and_chat', { 
            user_id: userId, 
            chat_id: chat_id 
          });
          console.log("[MessageService] User removed from chat participants via direct invoke");
        } catch (invokeError) {
          console.error("[MessageService] Direct invoke also failed:", invokeError);
        }
      }
      
    } catch (error) {
      console.error("[MessageService] Error handling chat leave:", error);
    }
  }

  // Handle chat creation directly from notification data
  private async createChatFromNotification(chatData: any): Promise<void> {
    try {
      console.log("[MessageService] Creating chat directly from notification:", chatData);
      
      const { chat_id, name, is_group, creator_id, members, timestamp } = chatData;
      
      // FIXED: Check if chat already exists to prevent duplicates
      try {
        const existingChat = await invoke('db_get_chat_by_id', { chatId: chat_id });
        if (existingChat) {
          console.log("[MessageService] Chat already exists, skipping creation:", chat_id);
          return;
        }
      } catch (checkError) {
        console.log("[MessageService] Chat existence check failed, proceeding with creation:", checkError);
      }
      
      // FIXED: For 1-on-1 chats, determine the proper chat name from other participant
      let chatName = name;
      let isGroupChat = Boolean(is_group);
      
      if (!isGroupChat && members && members.length === 2) {
        // This is a 1-on-1 chat, get the other participant's username
        const currentUserId = await this.getCurrentUserId();
        if (currentUserId) {
          const otherParticipantId = members.find(memberId => memberId !== currentUserId);
          if (otherParticipantId) {
            try {
              // Try to get the other participant's user info from database
              const otherUser = await invoke('db_get_user_by_id', { user_id: otherParticipantId });
              if (otherUser && typeof otherUser === 'object' && otherUser !== null) {
                const typedUserInfo = otherUser as { username?: string; name?: string };
                chatName = typedUserInfo.username || otherParticipantId;
                console.log("[MessageService] 1-on-1 chat name set to other participant username:", chatName);
              } else {
                // Fallback: use the participant ID as name
                chatName = otherParticipantId;
                console.log("[MessageService] Using participant ID as 1-on-1 chat name:", chatName);
              }
            } catch (userError) {
              console.warn("[MessageService] Failed to get other participant info, using ID as name:", userError);
              chatName = otherParticipantId;
            }
          }
        }
      }
      
      // Create chat object for database
      const chat = {
        chat_id: chat_id,
        name: chatName || null, // Use the resolved chat name
        created_at: timestamp ? new Date(timestamp).getTime() : Date.now(),
        creator_id: creator_id || '',
        is_group: isGroupChat,
        description: '',
        group_name: isGroupChat ? (name || '') : '', // Only set group_name for group chats
        last_message_content: '',
        last_message_timestamp: null,
        unread_count: 0,
        participants: JSON.stringify(members || [])
      };

      // Save chat to local database
      await invoke('db_insert_chat', { chat });
      console.log("[MessageService] Chat saved to local database:", chat_id, "with name:", chatName);
      
      // If we have member information, also save participants
      if (members && Array.isArray(members)) {
        try {
          // FIXED: Check for existing participants before creating new ones
          for (const memberId of members) {
            const participantId = `${chat_id}_${memberId}`;
            
            // Check if participant already exists
            try {
              const existingParticipant = await invoke('db_get_participant_by_id', { participantId });
              if (existingParticipant) {
                console.log("[MessageService] Participant already exists, skipping:", participantId);
                continue;
              }
            } catch (checkError) {
              // Participant doesn't exist, proceed with creation
            }
            
            // Try to get user info for better participant data
            let username = memberId;
            let displayName = memberId;
            
            try {
              const userInfo = await invoke('db_get_user_by_id', { user_id: memberId });
              if (userInfo && typeof userInfo === 'object' && userInfo !== null) {
                const typedUserInfo = userInfo as { username?: string; name?: string };
                username = typedUserInfo.username || memberId;
                displayName = typedUserInfo.name || typedUserInfo.username || memberId;
              }
            } catch (userError) {
              console.log("[MessageService] Using member ID as username for participant:", memberId);
            }
            
            const participant = {
              participant_id: participantId,
              chat_id: chat_id,
              user_id: memberId,
              role: memberId === creator_id ? 'admin' : 'member',
              joined_at: timestamp ? new Date(timestamp).getTime() : Date.now(),
              username: username
            };
            
            await invoke('db_insert_participant', { participant });
            console.log("[MessageService] Participant created:", participantId, "with username:", username);
          }
          console.log("[MessageService] Participants saved for chat:", chat_id);
          
          // FIXED: Sync participants from server to get proper usernames
          try {
            console.log("[MessageService] Syncing participants from server for chat:", chat_id);
            await participantService.syncParticipantsFromServer(chat_id);
            console.log("[MessageService] Participants synced from server for chat:", chat_id);
          } catch (syncError) {
            console.warn("[MessageService] Failed to sync participants from server, but local participants were saved:", syncError);
          }
          
          // Trigger chat name generation after saving participants
          try {
            console.log("[MessageService] Triggering chat name generation for:", chat_id);
            const token = await sessionManager.getToken();
            await invoke('generate_and_save_chat_name', { token, chat_id });
            console.log("[MessageService] Chat name generation completed for:", chat_id);
          } catch (nameError) {
            console.warn("[MessageService] Failed to generate chat name, but participants were saved:", nameError);
          }
        } catch (participantError) {
          console.warn("[MessageService] Failed to save participants, but chat was created:", participantError);
        }
      }
      
    } catch (error) {
      console.error("[MessageService] Failed to create chat from notification:", error);
      // Fallback to sync method
      throw error;
    }
  }

  // Handle chat deletion directly from notification data
  private async deleteChatFromNotification(chatId: string): Promise<void> {
    try {
      console.log("[MessageService] Deleting chat directly from notification:", chatId);
      
      // Clear messages for this chat
      await invoke('clear_messages_for_chat', { chat_id: chatId });
      console.log("[MessageService] Messages cleared for chat:", chatId);
      
      // Remove all participants for this chat
      await invoke('remove_all_participants_for_chat', { chat_id: chatId });
      console.log("[MessageService] Participants removed for chat:", chatId);
      
      // Delete the chat itself
      await invoke('db_delete_chat_by_id', { chatId: chatId });
      console.log("[MessageService] Chat deleted from local database:", chatId);
      
    } catch (error) {
      console.error("[MessageService] Failed to delete chat from notification:", error);
      // Fallback to sync method
      throw error;
    }
  }

  // MARK: - Incoming Message Handling (following Swift pattern)

  // Note: We now use the working handleChatMessage function from the old code
  // This function is no longer needed

  private async handleIncomingMessageStatus(messageData: any) {
    try {
      // Extract the message payload from the wrapper
      const payload = messageData.message || messageData;
      const { message_id, status, chat_id, sender_id, message_ids, client_message_id, timestamp, recipient_id } = payload;

      console.log("[MessageService] Status update:", { message_id, status, chat_id, sender_id, client_message_id, recipient_id });

      // Handle bulk READ status (like Swift implementation)
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

      // FIXED: Handle different status types according to API documentation
      switch (status) {
        case "sent":
          if (client_message_id && message_id) {
            try {
              console.log("[MessageService] Linking message for 'sent' status:", { client_message_id, message_id });
              await messageLinkingManager.robustLinking(
                chat_id,
                sender_id,
                message_id,
                client_message_id,
                serverTimestamp
              );
              
              // Update message status to 'sent' (no emission needed)
              await this.updateMessageStatus(message_id, client_message_id, "sent");
              console.log("[MessageService] Message linked and status updated to 'sent'");
            } catch (statusError) {
              console.error("[MessageService] Failed to link message for 'sent' status:", statusError);
            }
          } else {
            console.warn("[MessageService] Missing client_message_id or message_id for 'sent' status");
          }
          break;
          
        case "delivered":
          if (message_id) {
            console.log("[MessageService] Updating 'delivered' status for message:", message_id);
            console.log("[MessageService] Delivered status payload:", { message_id, status, chat_id, sender_id, timestamp, client_message_id });
            await this.updateMessageStatus(message_id, undefined, "delivered");
          } else {
            console.warn("[MessageService] Missing message_id for 'delivered' status");
          }
          break;
          
        case "read":
          if (message_id) {
            console.log("[MessageService] Updating 'read' status for message:", message_id);
            await this.updateMessageStatus(message_id, undefined, "read");
          }
          break;
          
        default:
          console.log("[MessageService] Status update not processed:", { status, message_id, client_message_id });
      }
    } catch (error) {
      console.error("[MessageService] Failed to handle message status:", error);
    }
  }

  private async handleRequestNotification(messageData: any) {
    try {
      console.log("[MessageService] Processing request notification:", messageData);
      // Extract the message payload from the wrapper
      const payload = messageData.message || messageData;
      
      // Dispatch custom event for FriendService to handle
      window.dispatchEvent(new CustomEvent('friend-request-notification-received', {
        detail: {
          type: 'friend-request-notification',
          message: payload
        }
      }));
      
      console.log("[MessageService] Friend request notification dispatched to FriendService");
    } catch (error) {
      console.error("[MessageService] Error handling request notification:", error);
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      return await sessionManager.getCurrentUserId();
    } catch (error) {
      console.error("[MessageService] Failed to get current user ID:", error);
      return null;
    }
  }

  async sync_messages_for_chat(chat_id: string): Promise<void> {
    try {
      const current_user_id = await this.getCurrentUserId();
      if (!current_user_id) {
        console.warn("[MessageService] No current user ID available for message sync");
        return;
      }

      const token = await sessionManager.getToken();
      if (!token) {
        console.warn("[MessageService] No token available for message sync");
        return;
      }

              await invoke("fetch_messages_for_chat_and_save", { chat_id, token });
      console.log("[MessageService] Messages synced for chat successfully");
    } catch (error) {
      console.error("[MessageService] Failed to sync messages for chat:", error);
    }
  }

  // MARK: - Message Linking (like Swift)

  // Note: Message linking now only happens when 'sent' status is received
  // This function is no longer needed since we don't link received messages

  // MARK: - Message Status Updates

  async updateMessageStatus(
    messageId: string | undefined,
    clientMessageId: string | undefined,
    status: string
  ): Promise<void> {
    try {
      console.log("[MessageService] updateMessageStatus called:", { messageId, clientMessageId, status });
      
      // FIXED: Handle status updates properly after message linking
      if (status === "sent") {
        if (clientMessageId) {
          console.log("[MessageService] Updating sent status by client message ID:", clientMessageId);
          // Update sent status by client message ID (before linking)
          await databaseServiceAsync.updateMessageSentStatus(clientMessageId, true);
          console.log("[MessageService] Message sent status updated successfully");
        } else if (messageId) {
          console.log("[MessageService] Updating sent status by server message ID:", messageId);
          // Update sent status by server message ID (after linking)
          await messageLinkingManager.updateMessageStatus(messageId, "sent");
          console.log("[MessageService] Message sent status updated successfully");
        }
      } else if (status === "delivered" && messageId) {
        console.log("[MessageService] Updating delivered status for linked message:", messageId);
        await messageLinkingManager.updateMessageStatus(messageId, "delivered");
        console.log("[MessageService] Message delivered status updated successfully");
      } else if (status === "read" && messageId) {
        console.log("[MessageService] Updating read status for linked message:", messageId);
        await messageLinkingManager.updateMessageStatus(messageId, "read");
        console.log("[MessageService] Message read status updated successfully");
      } else {
        console.warn("[MessageService] Unhandled status update:", { messageId, clientMessageId, status });
      }
      
      // FIXED: Emit event to notify ChatScreen to refresh messages and show updated checkmarks
      console.log("[MessageService] Emitting status update event for UI refresh");
      window.dispatchEvent(new CustomEvent('message-status-updated', {
        detail: { messageId, clientMessageId, status }
      }));
      
      console.log("[MessageService] Status update completed, UI refresh event emitted");
    } catch (error) {
      console.error(`[MessageService] Failed to update message status:`, error);
      throw error;
    }
  }

  // MARK: - Unread Count Management (like Swift)

  async incrementUnreadCount(chatId: string): Promise<void> {
    try {
      // TODO: Implement unread count increment
      console.log("[MessageService] Incrementing unread count for chat:", chatId);
    } catch (error) {
      console.error("[MessageService] Failed to increment unread count:", error);
    }
  }

  async resetUnreadCount(chatId: string): Promise<void> {
    try {
      await this.markAllMessagesAsRead(chatId);
      console.log("[MessageService] Reset unread count for chat:", chatId);
    } catch (error) {
      console.error("[MessageService] Failed to reset unread count:", error);
    }
  }

  // MARK: - Message Existence Check (like Swift)

  async messageExists(clientMessageId: string, serverMessageId: string): Promise<boolean> {
    try {
      if (clientMessageId) {
        const message = await this.getMessageByClientId(clientMessageId);
        return !!message;
      }
      if (serverMessageId) {
        const message = await this.getMessageById(serverMessageId);
        return !!message;
      }
      return false;
    } catch (error) {
      console.error("[MessageService] Error checking message existence:", error);
      return false;
    }
  }

  cleanup() {
    this.messageFlow = null;
    this.cachedMessages = [];
    this.localDeletes.clear();
    // FIXED: Clear processed chat notifications
    this.processedChatNotifications.clear();
  }







  // FIXED: Add method to check for duplicate chats in database
  async checkForDuplicateChats(): Promise<void> {
    try {
      console.log("[MessageService] Checking for duplicate chats in database...");
      
      const allChats = await invoke('db_get_all_chats');
      if (!allChats || !Array.isArray(allChats)) {
        console.log("[MessageService] No chats found or invalid format");
        return;
      }

      console.log(`[MessageService] Found ${allChats.length} total chats`);
      
      // Group chats by participants to find duplicates
      const chatGroups = new Map<string, any[]>();
      
      for (const chat of allChats) {
        try {
          const participants = await invoke('db_get_participants_for_chat', { chatId: chat.chat_id });
          if (participants && Array.isArray(participants)) {
            const sortedParticipantIds = participants
              .map(p => p.user_id)
              .sort()
              .join(',');
            
            if (!chatGroups.has(sortedParticipantIds)) {
              chatGroups.set(sortedParticipantIds, []);
            }
            chatGroups.get(sortedParticipantIds)!.push(chat);
          }
        } catch (error) {
          console.warn("[MessageService] Failed to get participants for chat:", chat.chat_id, error);
        }
      }

      // Report duplicates
      let duplicateCount = 0;
      for (const [participantKey, chats] of chatGroups) {
        if (chats.length > 1) {
          duplicateCount++;
          console.log(`[MessageService] 🚨 Found ${chats.length} chats with same participants:`, participantKey);
          chats.forEach((chat, index) => {
            console.log(`[MessageService]   ${index + 1}. Chat ID: ${chat.chat_id}, Name: ${chat.name || 'unnamed'}, Is Group: ${chat.is_group}`);
          });
        }
      }

      if (duplicateCount === 0) {
        console.log("[MessageService] ✅ No duplicate chats found");
      } else {
        console.log(`[MessageService] 🚨 Found ${duplicateCount} sets of duplicate chats`);
      }
    } catch (error) {
      console.error("[MessageService] Error checking for duplicate chats:", error);
    }
  }

  // FIXED: Add startup debugging to see what's happening
  private logStartupState() {
    console.log("[MessageService] Startup - Current state:");
    console.log("[MessageService] - Processed notifications count:", this.processedChatNotifications.size);
    console.log("[MessageService] - Local deletes count:", this.localDeletes.size);
    console.log("[MessageService] - Active chat ID:", this.activeChatId);
  }

  // FIXED: Method to handle manual chat leaving by the user
  async leaveChat(chatId: string): Promise<void> {
    try {
      console.log("[MessageService] User manually leaving chat:", chatId);
      
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error("No current user ID available");
      }
      
      // First, remove user from local participants
      await this.handleChatLeft(chatId, currentUserId);
      
      // Then notify the server that user is leaving (this will trigger leave_chat)
      try {
        await invoke('leave_chat', { chat_id: chatId });
        console.log("[MessageService] Server notified of chat leave");
      } catch (serverError) {
        console.warn("[MessageService] Server leave notification failed, but local cleanup completed:", serverError);
      }
      
      // Notify UI that user left the chat
      window.dispatchEvent(new CustomEvent('chat-notification-received', {
        detail: {
          type: 'chat-notification',
          message: {
            action: 'left',
            chat_id: chatId,
            members: [currentUserId],
            user_id: currentUserId
          }
        }
      }));
      
      console.log("[MessageService] Chat leave completed successfully");
      
    } catch (error) {
      console.error("[MessageService] Failed to leave chat:", error);
      throw error;
    }
  }

  // FIXED: Check if chat is in local deletes (like Swift's ChatService.localDeletes)
  isChatLocallyDeleted(chatId: string): boolean {
    return this.localDeletes.has(chatId);
  }

  // FIXED: Method to find existing chat by participants (for duplicate prevention)
  private async findExistingChatByParticipants(participants: string[]): Promise<any | null> {
    try {
      console.log("[MessageService] Checking for existing chat with participants:", participants);
      
      // Get all chats from database
      const allChats = await invoke('db_get_all_chats');
      if (!allChats || !Array.isArray(allChats)) {
        console.log("[MessageService] No chats found in database");
        return null;
      }
      
      // For each chat, check if it has the exact same participants
      for (const chat of allChats) {
        if (chat.is_group) {
          continue; // Skip group chats for this check
        }
        
        try {
          // Get participants for this chat
          const chatParticipants = await invoke('db_get_participants_for_chat', { chatId: chat.chat_id });
          if (chatParticipants && Array.isArray(chatParticipants)) {
            const chatParticipantIds = chatParticipants.map((p: any) => p.user_id);
            
            // Check if the participants match exactly (same length and same IDs)
            if (chatParticipantIds.length === participants.length) {
              const allMatch = participants.every(participantId => 
                chatParticipantIds.some(chatParticipantId => 
                  chatParticipantId.toLowerCase() === participantId.toLowerCase()
                )
              );
              
              if (allMatch) {
                console.log("[MessageService] Found existing chat with same participants:", {
                  existing_chat_id: chat.chat_id,
                  participants: chatParticipantIds,
                  new_participants: participants
                });
                return chat;
              }
            }
          }
        } catch (participantError) {
          console.warn("[MessageService] Failed to get participants for chat:", chat.chat_id, participantError);
        }
      }
      
      console.log("[MessageService] No existing chat found with same participants");
      return null;
      
    } catch (error) {
      console.error("[MessageService] Error finding existing chat by participants:", error);
      return null;
    }
  }

  // Manual method to trigger duplicate chat cleanup
  async cleanupDuplicateChatsManually(): Promise<void> {
    console.log("[MessageService] Manual duplicate cleanup triggered");
    await this.cleanupDuplicateChats();
  }

  // FIXED: Clean up duplicate chats (like Swift implementation)
  private async cleanupDuplicateChats(): Promise<void> {
    try {
      console.log("[MessageService] Starting duplicate chat cleanup...");
      
      // Get all chats from the database
      const allChats = await invoke('db_get_all_chats');
      if (!allChats || !Array.isArray(allChats)) {
        console.log("[MessageService] No chats found or invalid format");
        return;
      }

      console.log(`[MessageService] Found ${allChats.length} chats to check for duplicates`);

      // Group chats by sorted participant IDs to identify duplicates
      const chatGroups = new Map<string, any[]>();
      
      for (const chat of allChats) {
        try {
          const participants = await invoke('db_get_participants_for_chat', { chatId: chat.chat_id });
          if (participants && Array.isArray(participants)) {
            // Sort participant IDs to create a consistent key
            const sortedParticipantIds = participants
              .map(p => p.user_id)
              .sort()
              .join(',');
            
            if (!chatGroups.has(sortedParticipantIds)) {
              chatGroups.set(sortedParticipantIds, []);
            }
            chatGroups.get(sortedParticipantIds)!.push(chat);
          }
        } catch (error) {
          console.warn("[MessageService] Failed to get participants for chat:", chat.chat_id, error);
        }
      }

      // Find and remove duplicates
      let totalRemoved = 0;
      for (const [participantKey, chats] of chatGroups) {
        if (chats.length > 1) {
          console.log(`[MessageService] Found ${chats.length} chats with same participants:`, participantKey);
          
          // Keep the first chat, remove the rest
          const chatsToRemove = chats.slice(1);
          console.log(`[MessageService] Removing ${chatsToRemove.length} duplicate chats`);
          
          for (const duplicateChat of chatsToRemove) {
            try {
              console.log(`[MessageService] Removing duplicate chat: ${duplicateChat.chat_id}`);
              
              // Remove messages for this chat
              await invoke('db_clear_messages_for_chat', { chatId: duplicateChat.chat_id });
              
              // Remove all participants for this chat
              await invoke('db_remove_all_participants_for_chat', { chatId: duplicateChat.chat_id });
              
              // Delete the chat itself
              await invoke('db_delete_chat_by_id', { chatId: duplicateChat.chat_id });
              
              totalRemoved++;
              console.log(`[MessageService] Successfully removed duplicate chat: ${duplicateChat.chat_id}`);
            } catch (error) {
              console.error(`[MessageService] Failed to remove duplicate chat ${duplicateChat.chat_id}:`, error);
            }
          }
        }
      }

      if (totalRemoved > 0) {
        console.log(`[MessageService] Cleanup completed: removed ${totalRemoved} duplicate chats`);
        
        // Notify UI to refresh chat list
        window.dispatchEvent(new CustomEvent('chat-notification-received', {
          detail: {
            type: 'chat-notification',
            message: {
              action: 'cleanup',
              chat_id: '',
              members: []
            }
          }
        }));
      } else {
        console.log("[MessageService] No duplicate chats found");
      }
    } catch (error) {
      console.error("[MessageService] Error during duplicate chat cleanup:", error);
    }
  }

  // FIXED: Method to get the correct chat ID for a specific user (for message sending)
  async getChatIdForUser(targetUserId: string): Promise<string | null> {
    try {
      console.log("[MessageService] Looking for chat with user:", targetUserId);
      
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) {
        console.warn("[MessageService] No current user ID available");
        return null;
      }
      
      // Get all chats from database
      const allChats = await invoke('db_get_all_chats');
      if (!allChats || !Array.isArray(allChats)) {
        console.log("[MessageService] No chats found");
        return null;
      }
      
      // Look for a 1-on-1 chat with the target user
      for (const chat of allChats) {
        if (chat.is_group) {
          continue; // Skip group chats
        }
        
        try {
          const participants = await invoke('db_get_participants_for_chat', { chatId: chat.chat_id });
          if (participants && Array.isArray(participants)) {
            const participantIds = participants.map((p: any) => p.user_id);
            
            // Check if this chat has exactly 2 participants: current user and target user
            if (participantIds.length === 2 && 
                participantIds.includes(currentUserId) && 
                participantIds.includes(targetUserId)) {
              
              console.log("[MessageService] Found chat with target user:", {
                chat_id: chat.chat_id,
                participants: participantIds,
                target_user: targetUserId
              });
              return chat.chat_id;
            }
          }
        } catch (error) {
          console.warn("[MessageService] Failed to get participants for chat:", chat.chat_id, error);
        }
      }
      
      console.log("[MessageService] No chat found with target user:", targetUserId);
      return null;
      
    } catch (error) {
      console.error("[MessageService] Error finding chat for user:", error);
      return null;
    }
  }

  private dispatchChatNotificationEvent(action: string, chat_id: string, members: string[], name: string, is_group: boolean, creator_id: string, timestamp: number) {
    window.dispatchEvent(new CustomEvent('chat-notification-received', {
      detail: {
        type: 'chat-notification',
        message: {
          action: action,
          chat_id: chat_id,
          members: members,
          name: name,
          is_group: is_group,
          creator_id: creator_id,
          timestamp: timestamp
        }
      }
    }));
  }
}

export const messageService = new MessageService();
console.log("[MessageService] messageService instance created and exported:", messageService);

interface MessageStatusUpdatePayload {
  message_id?: string;
  client_message_id?: string;
  status: string;
  chat_id?: string;
  sender_id?: string;
  timestamp?: string;
  message_ids?: string[];
}

interface MessageSavedPayload {
  message_id: string;
  client_message_id?: string;
  chat_id: string;
  content: string;
  sender_id: string;
  timestamp: number;
  sender_name: string;
  reply_to_message_id?: string;
}

interface ChatNotificationPayload {
  type: string;
  chat_id: string;
  message_id?: string;
  client_message_id?: string;
  content?: string;
  sender_id?: string;
  timestamp?: number;
  sender_name?: string;
  reply_to_message_id?: string;
  message?: {
    action?: string;
    members?: string[];
    message_id?: string;
    client_message_id?: string;
    chat_id?: string;
    content?: string;
    sender_id?: string;
    timestamp?: number;
    sender_username?: string;
    reply_to_message_id?: string;
  };
}

interface RequestNotificationPayload {
  type: string;
  from_user_id: string;
  from_username: string;
  from_name?: string;
  chat_id?: string;
  message?: string;
}
