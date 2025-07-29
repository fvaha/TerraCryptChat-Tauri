import { invoke } from "@tauri-apps/api/core";
import { MessageEntity, IncomingWSMessage, MessageStatusMessage, ChatMessageWrapper, RequestNotificationWrapper, ChatNotificationWrapper, MessageSendStatus } from "./models";
import { encryptionService } from "./encryptionService";
import { websocketService } from "./websocketService";
import { messageLinkingManager } from "./messageLinkingManager";
import { sessionManager } from "./sessionManager";
import { chatService } from "./chatService";
import { databaseService } from "./databaseService";

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
    // Remove WebSocket message listener from constructor to avoid conflicts
    // Message handling is now done in useWebSocketHandler.ts
  }

  setMessageFlow(callback: (message: MessageEntity) => void) {
    this.messageFlow = callback;
  }

  getMessageFlow() {
    return this.messageFlow;
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
        messages = await invoke<MessageEntity[]>('db_get_messages_before_timestamp', { 
          chat_id: chatId, 
          before_timestamp: beforeTimestamp, 
          limit 
        });
      } else {
        messages = await invoke<MessageEntity[]>('db_get_messages_for_chat', { chat_id: chatId });
      }
      
      if (!Array.isArray(messages)) {
        console.warn("Invalid messages data received:", messages);
        return [];
      }
      
      // Sort messages by timestamp and limit results
      const sortedMessages = messages
        .filter(msg => msg && msg.chatId) // Filter out invalid messages
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
    return await invoke<MessageEntity[]>("db_get_messages_before_timestamp", { 
      chat_id: chatId, 
      before_timestamp: beforeTimestamp, 
      limit: 50 
    });
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
      return await invoke<string | null>("db_get_chat_id_for_message", { message_id: messageId });
    } catch (error) {
      console.error(`[MessageService] Error finding chat ID for message ${messageId}:`, error);
      return null;
    }
  }

  async messageExists(clientMessageId: string, serverMessageId: string): Promise<boolean> {
    try {
      return await invoke<boolean>("db_message_exists", { client_message_id: clientMessageId, server_message_id: serverMessageId });
    } catch (error) {
      console.error(`[MessageService] Error checking message existence:`, error);
      return false;
    }
  }

  // MARK: - Message Saving

  async saveOutgoingMessage(
    clientMessageId: string,
    chatId: string,
    content: string,
    senderId: string,
    replyToMessageId?: string
  ): Promise<void> {
    try {
      console.log(`[MessageService] Saving outgoing message: ${clientMessageId}`);
      
      // Create the message object that matches the Rust Message struct
      const message = {
        id: null,
        message_id: null,
        client_message_id: clientMessageId,
        chat_id: chatId,
        sender_id: senderId,
        content: content,
        timestamp: Date.now(),
        is_read: false,
        is_sent: false,
        is_delivered: false,
        is_failed: false,
        sender_username: "Me",
        reply_to_message_id: replyToMessageId || null
      };

      await invoke("db_insert_message", { message });

      console.log(`[MessageService] Outgoing message saved successfully: ${clientMessageId}`);

      // Trigger UI update through message flow
      if (this.messageFlow) {
        console.log("[MessageService] Triggering message flow for outgoing message");
        const messageEntity: MessageEntity = {
          messageId: undefined, // Will be set when server responds
          clientMessageId: clientMessageId,
          chatId: chatId,
          senderId: senderId,
          content: content,
          timestamp: Date.now(),
          isRead: false,
          isSent: false,
          isDelivered: false,
          isFailed: false,
          senderUsername: "Me"
        };
        console.log("[MessageService] Calling messageFlow with entity:", messageEntity);
        this.messageFlow(messageEntity);
        console.log("[MessageService] Message flow called successfully");
      } else {
        console.warn("[MessageService] No message flow callback set!");
      }
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
    try {
      console.log(`[MessageService] Saving incoming message: ${messageId || clientMessageId}`);
      
      // Check if message already exists
      if (messageId && clientMessageId) {
        const exists = await this.messageExists(clientMessageId, messageId);
        if (exists) {
          console.log(`[MessageService] Message already exists, skipping: ${messageId}`);
          return;
        }
      }

      // Create the message object that matches the Rust Message struct
      const message = {
        id: null,
        message_id: messageId || null,
        client_message_id: clientMessageId || messageId || `temp_${Date.now()}`,
        chat_id: chatId,
        sender_id: senderId,
        content: content,
        timestamp: sentAt,
        is_read: false,
        is_sent: true,
        is_delivered: false,
        is_failed: false,
        sender_username: senderName,
        reply_to_message_id: replyToMessageId || null
      };

      await invoke("db_insert_message", { message });

      console.log(`[MessageService] Incoming message saved successfully: ${messageId || clientMessageId}`);
    } catch (error) {
      console.error(`[MessageService] Failed to save incoming message:`, error);
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
      console.log(`[MessageService] Updating message status: ${status} for ${messageId || clientMessageId}`);
      
      // Convert MessageSendStatus to boolean for is_sent
      const isSent = status === MessageSendStatus.SENT || 
                    status === MessageSendStatus.DELIVERED || 
                    status === MessageSendStatus.READ;
      
      if (clientMessageId) {
        // Use the available command for client message ID
        await invoke("db_update_message_sent_status", { clientMessageId: clientMessageId, isSent: isSent });
        console.log(`[MessageService] Message status updated successfully: ${status} for client ID: ${clientMessageId}`);
      } else if (messageId) {
        // For server message ID, we need to handle differently
        // For now, just log that we can't update by server ID
        console.warn(`[MessageService] Cannot update status by server message ID: ${messageId}`);
      } else {
        console.warn("[MessageService] No message ID provided for status update");
        return;
      }

      console.log(`[MessageService] Message status updated successfully: ${status}`);
    } catch (error) {
      console.error(`[MessageService] Failed to update message status:`, error);
      throw error;
    }
  }

  // MARK: - Unread Count Management

  async resetUnreadCount(chatId: string): Promise<void> {
    try {
      await invoke("db_reset_unread_count", { chat_id: chatId });
    } catch (error) {
      console.error(`[MessageService] Failed to reset unread count for chat ${chatId}:`, error);
    }
  }

  async incrementUnreadCount(chatId: string): Promise<void> {
    try {
      await invoke("db_increment_unread_count", { chat_id: chatId });
    } catch (error) {
      console.error(`[MessageService] Failed to increment unread count for chat ${chatId}:`, error);
    }
  }

  async getUnreadCount(chatId: string): Promise<number> {
    try {
      return await invoke<number>("db_get_unread_count", { chat_id: chatId });
    } catch (error) {
      console.error(`[MessageService] Failed to get unread count for chat ${chatId}:`, error);
      return 0;
    }
  }

  async markMessagesAsRead(chatId: string): Promise<void> {
    try {
      await invoke("db_mark_messages_as_read", { chat_id: chatId });
    } catch (error) {
      console.error(`[MessageService] Failed to mark messages as read for chat ${chatId}:`, error);
    }
  }

  async markMessagesAsReadByIds(messageIds: string[]): Promise<void> {
    try {
      await invoke("db_mark_messages_as_read_by_ids", { message_ids: messageIds });
    } catch (error) {
      console.error(`[MessageService] Failed to mark messages as read by IDs:`, error);
    }
  }

  // MARK: - Message Sending

  async sendMessage(content: string, chatId: string, replyToMessageId?: string): Promise<string> {
    console.log("MessageService: sendMessage called");
    console.log("Content:", content);
    console.log("Chat ID:", chatId);
    console.log("Reply to:", replyToMessageId);
    
    if (!content.trim()) {
      console.log("MessageService: Empty content, cannot send message");
      throw new Error("Message content cannot be empty");
    }

    // Get current user
    const currentUser = await databaseService.getMostRecentUser();
    if (!currentUser) {
      console.log("MessageService: No current user found");
      throw new Error("No current user found");
    }

    console.log("Current user:", currentUser.user_id);

    // Generate client message ID
    const clientId = generateUUID();
    console.log("Generated client ID:", clientId);

    // Save message locally first (like iOS implementation) - PLAIN TEXT
    console.log("Saving outgoing message locally (plain text)...");
    await this.saveOutgoingMessage(clientId, chatId, content, currentUser.user_id, replyToMessageId);
    console.log("Outgoing message saved locally");

    // Update chat last message
    await this.updateChatLastMessage(chatId, content, Date.now());

    // Send message via WebSocket
    console.log("Sending message via WebSocket...");
    await this.actuallySendMessage(clientId, content, chatId, currentUser.user_id);
    console.log("Message sent via WebSocket");

    return clientId;
  }

  private async actuallySendMessage(clientId: string, content: string, chatId: string, senderId: string): Promise<void> {
    console.log("[MessageService] Starting message send process for client ID:", clientId);
    
    // Check if WebSocket is connected using local state (more efficient)
    const localConnected = websocketService.isConnectedToServer();
    
    if (!localConnected) {
      console.log("[MessageService] WebSocket not connected, marking as failed.");
      await this.updateMessageStatus(undefined, clientId, MessageSendStatus.FAILED);
      return;
    }

    const encryptedContent = encryptionService.encryptMessage(content);

    // Prepare the payload for sending the message
    // Based on Swift implementation - client_message_id should be at root level
    const payload = {
      type: "chat",
      message: {
        chat_id: chatId,
        content: encryptedContent,
        sender_id: senderId
      },
      client_message_id: clientId
    };

    try {
      console.log("[MessageService] About to send WebSocket message with payload:", JSON.stringify(payload, null, 2));
      
      // Send as text message to match iOS WebSocketEngine behavior
      await websocketService.sendMessage(payload);
      console.log("[MessageService] WebSocket message sent successfully with client_message_id:", clientId);
      
      // Update status to sent immediately after sending
      await this.updateMessageStatus(undefined, clientId, MessageSendStatus.SENT);
      console.log("[MessageService] Message status updated to SENT");
    } catch (error) {
      console.error("[MessageService] Failed to send message:", error);
      await this.updateMessageStatus(undefined, clientId, MessageSendStatus.FAILED);
    }
  }

  // MARK: - Message Resending

  async resendUnsentMessage(message: MessageEntity): Promise<void> {
    if (!message.isFailed) {
      console.log("[MessageService] Message is not failed, cannot resend.");
      return;
    }

    console.log("[MessageService] Resending failed message with clientMessageId:", message.clientMessageId);
    await this.actuallySendMessage(message.clientMessageId, message.content, message.chatId, message.senderId);
  }

  // MARK: - Message Flow

  // This method is called by useWebSocketHandler when a new message is received
  async handleIncomingMessage(rawMessage: string) {
    console.log("[MessageService] INCOMING:", rawMessage);
    
    if (!rawMessage || rawMessage.length < 5 || !rawMessage.includes('"type"')) {
      console.log("[MessageService] Skipping invalid message:", rawMessage);
      return;
    }

    try {
      const wrapper: IncomingWSMessage = JSON.parse(rawMessage);
      
      console.log("[MessageService] Parsed message type:", wrapper.type);
      
      switch (wrapper.type) {
        case "chat":
          await this.handleChatMessage(rawMessage);
          break;
        case "message-status":
          await this.handleMessageStatus(rawMessage);
          break;
        case "connection-status":
          this.handleConnectionStatus(rawMessage);
          break;
        case "error":
          this.handleErrorMessage(rawMessage);
          break;
        case "info":
          this.handleInfoMessage(rawMessage);
          break;
        case "request-notification":
          this.handleRequestNotification(rawMessage);
          break;
        case "chat-notification":
          await this.handleChatNotification(rawMessage);
          break;
        default:
          console.warn("[MessageService] Unknown message type:", wrapper.type);
      }
    } catch (error) {
      console.error("[MessageService] Exception parsing message:", rawMessage, error);
    }
  }

  private async handleChatMessage(rawMessage: string) {
    const wrapper = this.parseJson<ChatMessageWrapper>(rawMessage);
    const chatMessage = wrapper?.message;
    if (!chatMessage) return;

    console.log("[MessageService] Processing chat message:", chatMessage);

    const decryptedContent = encryptionService.decryptMessage(chatMessage.content, chatMessage.sender_id);
    if (!decryptedContent) {
      console.warn("[MessageService] Failed to decrypt message content");
      return;
    }

    // Link the local pending message if needed (like Swift implementation)
    if (chatMessage.message_id && wrapper?.client_message_id) {
      try {
        await this.linkLocalPendingMessageIfNeeded(wrapper.client_message_id, chatMessage.message_id);
        console.log("[MessageService] Linked local pending message:", wrapper.client_message_id, "→", chatMessage.message_id);
      } catch (linkError) {
        console.error("[MessageService] Failed to link message:", linkError);
      }
    }

    // Check if message already exists
    const exists = await this.messageExists(
      wrapper?.client_message_id || "",
      chatMessage.message_id || ""
    );
    if (exists) {
      console.log("[MessageService] Message already exists, skipping insert.");
      return;
    }

    // Save the incoming message
    await this.saveIncomingMessage(
      chatMessage.message_id,
      wrapper?.client_message_id,
      chatMessage.chat_id,
      decryptedContent,
      chatMessage.sender_id,
      chatMessage.sent_at ? new Date(chatMessage.sent_at).getTime() : Date.now(),
      chatMessage.sender_username || "Unknown"
    );

    // Create a MessageEntity for the UI
    const entity: MessageEntity = {
      messageId: chatMessage.message_id || `temp_${Date.now()}`,
      clientMessageId: wrapper?.client_message_id || chatMessage.message_id || `temp_${Date.now()}`,
      chatId: chatMessage.chat_id,
      senderId: chatMessage.sender_id,
      content: decryptedContent,
      timestamp: chatMessage.sent_at ? new Date(chatMessage.sent_at).getTime() : Date.now(),
      isRead: false,
      isSent: true,
      isDelivered: false,
      isFailed: false,
      senderUsername: chatMessage.sender_username || "Unknown"
    };

    // Notify UI through message flow
    if (this.messageFlow) {
      this.messageFlow(entity);
    }

    // Update chat metadata
    await this.updateChatLastMessage(chatMessage.chat_id, decryptedContent, entity.timestamp);
  }

  private async linkLocalPendingMessageIfNeeded(clientMessageIdStr: string | undefined, serverMessageId: string): Promise<void> {
    if (!clientMessageIdStr) {
      console.log("[MessageService] Invalid or missing clientMessageId string, skipping link.");
      return;
    }

    const found = await this.findMessageByServerId(serverMessageId);
    if (found != null) {
      return;
    }

    const entity = await messageLinkingManager.findLocalUnlinkedMessageByClientId(clientMessageIdStr);
    if (entity) {
      await messageLinkingManager.updateLocalMessageId(entity.clientMessageId, serverMessageId);
      console.log("[MessageService] Linked local pending message", entity.clientMessageId, "→", serverMessageId);
      // Update status to sent after linking (matches Swift behavior)
      await this.updateMessageStatus(serverMessageId, undefined, MessageSendStatus.SENT);
    }
  }

  private async handleMessageStatus(rawMessage: string) {
    const wrapper = this.parseJson<MessageStatusMessage>(rawMessage);
    if (!wrapper) return;

    const { message_id, status, chat_id, sender_id, message_ids } = wrapper.message;

    console.log("[MessageService] Status update:", { message_id, status, chat_id, sender_id });

    // Handle bulk READ status (like Swift implementation)
    if (status === "read" && message_ids && message_ids.length > 0) {
      try {
        // Mark multiple messages as read
        for (const id of message_ids) {
          await this.updateMessageStatus(id, undefined, MessageSendStatus.READ);
        }
        console.log("[MessageService] Bulk read status updated for", message_ids.length, "messages");
      } catch (statusError) {
        console.error("[MessageService] Failed to update bulk read status:", statusError);
      }
      return;
    }

    // Update the status of the message
    if (message_id) {
      try {
        const messageStatus = status === "sent" ? MessageSendStatus.SENT :
                            status === "delivered" ? MessageSendStatus.DELIVERED :
                            status === "read" ? MessageSendStatus.READ :
                            MessageSendStatus.FAILED;
        
        await this.updateMessageStatus(message_id, undefined, messageStatus);
        console.log("[MessageService] Message status updated successfully:", status);
      } catch (statusError) {
        console.error("[MessageService] Failed to update message status:", statusError);
      }
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
      this.cachedMessages = messages;
    } catch (error) {
      console.error(`[MessageService] Failed to refresh messages for chat ${chatId}:`, error);
    }
  }

  getCachedMessages(): MessageEntity[] {
    return this.cachedMessages;
  }

  // MARK: - Utility Methods

  private async resolveSenderUsername(senderId: string): Promise<string> {
    // This would typically query the database for user information
    return "Unknown";
  }

  private async updateChatLastMessage(chatId: string, content: string, timestamp: number): Promise<void> {
    try {
      // Update chat last message in database
      await invoke("db_update_chat_last_message", { chat_id: chatId, content, timestamp });
    } catch (error) {
      console.error(`[MessageService] Failed to update chat last message:`, error);
    }
  }

  private parseJson<T>(jsonString: string): T | null {
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error("[MessageService] Failed to parse JSON:", error);
      return null;
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();

// Export convenience functions
export const fetchMessages = (chatId: string, limit: number = 50) => messageService.fetchMessages(chatId, limit);
export const handleIncomingWebSocketMessage = (rawMessage: string) => messageService.handleIncomingMessage(rawMessage);

// Export functions for useWebSocketHandler
export const insertMessage = async (message: MessageEntity) => {
  try {
    // Create the message object that matches the Rust Message struct
    const dbMessage = {
      id: null,
      message_id: message.messageId || null,
      client_message_id: message.clientMessageId,
      chat_id: message.chatId,
      sender_id: message.senderId,
      content: message.content,
      timestamp: message.timestamp,
      is_read: message.isRead,
      is_sent: message.isSent,
      is_delivered: message.isDelivered,
      is_failed: message.isFailed,
      sender_username: message.senderUsername,
      reply_to_message_id: null
    };

    await invoke("db_insert_message", { message: dbMessage });
  } catch (error) {
    console.error("[MessageService] Failed to insert message:", error);
    throw error;
  }
};

export const updateMessageStatus = async (messageId: string, status: string) => {
  try {
    const messageStatus = status === "sent" ? MessageSendStatus.SENT :
                        status === "delivered" ? MessageSendStatus.DELIVERED :
                        status === "read" ? MessageSendStatus.READ :
                        MessageSendStatus.FAILED;
    
    // Convert MessageSendStatus to boolean for is_sent
    const isSent = messageStatus === MessageSendStatus.SENT || 
                  messageStatus === MessageSendStatus.DELIVERED || 
                  messageStatus === MessageSendStatus.READ;
    
    // For now, we can only update by client message ID, not server message ID
    console.warn(`[MessageService] Cannot update status by server message ID: ${messageId}`);
    
    // TODO: We need to find the client message ID for this server message ID first
    // For now, just log the attempt
    console.log(`[MessageService] Attempted to update status: ${status} for server message ID: ${messageId}`);
  } catch (error) {
    console.error("[MessageService] Failed to update message status:", error);
    throw error;
  }
};

export const replaceLocalMessageId = async (localId: string, serverId: string) => {
  try {
    await messageLinkingManager.updateLocalMessageId(localId, serverId);
    await messageService.updateMessageStatus(serverId, undefined, MessageSendStatus.SENT);
  } catch (error) {
    console.error("[MessageService] Failed to replace local message ID:", error);
    throw error;
  }
};
