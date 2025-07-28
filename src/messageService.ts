import { invoke } from "@tauri-apps/api/core";
import { MessageEntity, IncomingWSMessage, MessageStatusMessage, ChatMessageWrapper, RequestNotificationWrapper, ChatNotificationWrapper } from "./models";
import { encryptionService } from "./encryptionService";
import { messageLinkingManager } from "./messageLinkingManager";
import { websocketService } from "./websocketService";
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

  constructor() {
    // Listen for WebSocket messages from Tauri
    websocketService.on("message", (rawMessage: string) => {
      this.handleIncomingMessage(rawMessage);
    });
  }

  setMessageFlow(callback: (message: MessageEntity) => void) {
    this.messageFlow = callback;
  }

  getMessageFlow() {
    return this.messageFlow;
  }

  async saveMessage(chatId: string, content: string, senderId: string, _timestamp: number): Promise<string> {
    if (!chatId || !content || !senderId) {
      console.error("Invalid parameters for saveMessage:", { chatId, content, senderId });
      throw new Error("Invalid parameters for saveMessage");
    }

    const clientMessageId = generateUUID();
    const senderUsername = await this.resolveSenderUsername(senderId);
    const msTimestamp = Date.now();

    const messageEntity: MessageEntity = {
      messageId: undefined,
      clientMessageId: clientMessageId,
      chatId: chatId,
      senderId: senderId,
      senderUsername: senderUsername,
      content: content,
      timestamp: msTimestamp,
      isSent: false,
      isDelivered: false,
      isRead: false,
      isFailed: false
    };

    console.log("[MessageService] INSERT LOCAL:", messageEntity);
    
    try {
      // Save to database first
      const dbMessage = {
        id: undefined,
        message_id: messageEntity.messageId,
        client_message_id: messageEntity.clientMessageId,
        chat_id: messageEntity.chatId,
        sender_id: messageEntity.senderId,
        content: messageEntity.content,
        timestamp: messageEntity.timestamp,
        is_read: messageEntity.isRead,
        is_sent: messageEntity.isSent,
        is_delivered: messageEntity.isDelivered,
        is_failed: messageEntity.isFailed,
        sender_username: messageEntity.senderUsername,
        reply_to_message_id: messageEntity.replyToMessageId
      };
      console.log("[MessageService] Saving to database:", dbMessage);
      await invoke('db_insert_message', { message: dbMessage });
      console.log("[MessageService] Successfully saved to database");
      
      // Emit to UI
      if (this.messageFlow) {
        this.messageFlow(messageEntity);
      }
      
      return clientMessageId;
    } catch (error) {
      console.error("❌ Failed to save message:", error);
      // Still emit to UI even if database save fails
      if (this.messageFlow) {
        this.messageFlow(messageEntity);
      }
      throw error;
    }
  }

  private async resolveSenderUsername(_senderId: string): Promise<string> {
    // TODO: Implement proper user resolution
    // For now, return a placeholder
    return "Me";
  }

  async handleIncomingMessage(rawMessage: string) {
    console.log("[MessageService] INCOMING:", rawMessage);
  if (!rawMessage || rawMessage.length < 5 || !rawMessage.includes('"type"')) {
    return;
  }

  try {
    const wrapper: IncomingWSMessage = JSON.parse(rawMessage);
    
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
          console.warn("[MessageService] Unknown type:", rawMessage);
    }
  } catch (error) {
      console.error("[MessageService] Exception:", rawMessage, error);
  }
}

  private async handleChatMessage(rawMessage: string) {
    const wrapper = this.parseJson<ChatMessageWrapper>(rawMessage);
    const chatMessage = wrapper?.message;
    if (!chatMessage) return;

  const decryptedContent = encryptionService.decryptMessage(chatMessage.content, chatMessage.sender_id);
    if (!decryptedContent) return;

    // TODO: Sync participants with API
    // await participantService.syncParticipantsWithAPI(chatMessage.chat_id);
    
    const isCurrentUserSender = false; // TODO: Get from session manager

    const senderUsername = chatMessage.sender_username || await this.resolveSenderUsername(chatMessage.sender_id);

    const msgTimestampMs: number = (() => {
      try {
        return new Date(chatMessage.sent_at).getTime();
  } catch {
        return Date.now();
  }
    })();

  const messageEntity: MessageEntity = {
    messageId: chatMessage.message_id,
      clientMessageId: chatMessage.message_id, // Same messageId for both columns
    chatId: chatMessage.chat_id,
    senderId: chatMessage.sender_id,
      senderUsername: senderUsername,
    content: decryptedContent,
      timestamp: msgTimestampMs,
      isSent: isCurrentUserSender,
      isDelivered: false,
    isRead: false,
      isFailed: false
    };

    await this.insertAndEmit(messageEntity);

    // TODO: Update chat metadata
    // const existingChat = await chatManager.getChatById(chatMessage.chat_id);
    // const unreadCount = isCurrentUserSender ? 0 : await this.getUnreadMessages(chatMessage.chat_id).length;
    // await chatManager.createOrUpdateChat(...);
  }

  private async handleChatNotification(rawMessage: string) {
    const wrapper = this.parseJson<ChatNotificationWrapper>(rawMessage);
    if (!wrapper) return;
    
    const message = wrapper.message;

    switch (message.action) {
      case "created":
        // TODO: Handle chat created event
        console.log("[MessageService] Chat created:", message.chat_id);
        break;
      case "deleted":
        // TODO: Handle chat deleted event
        console.log("[MessageService] Chat deleted:", message.chat_id);
        break;
    }
  }

  private async handleMessageStatus(rawMessage: string) {
    const statusMessage = this.parseJson<MessageStatusMessage>(rawMessage);
    if (!statusMessage) return;
    
    const payload = statusMessage.message;

    const clientMessageId = payload.client_message_id;
    const serverMessageId = payload.message_id;
    const messageIds = payload.message_ids || [];
    const status = payload.status;
    const chatId = payload.chat_id;
    const senderId = payload.sender_id;

    if (!chatId) {
      console.warn("[MessageService] Missing chatId in status payload, skipping");
      return;
    }

    if (!senderId) {
      console.warn("[MessageService] Missing senderId in status payload, skipping");
      return;
    }

    const serverTimestamp = (() => {
      try {
        return new Date(payload.timestamp).getTime();
      } catch {
        console.warn("[MessageService] Invalid timestamp format:", payload.timestamp);
        return null;
      }
    })();

    console.log(
      "[MessageService] STATUS:",
      `id=${serverMessageId}, clientId=${clientMessageId}, status=${status}, chatId=${chatId}, senderId=${senderId}, ts=${serverTimestamp}`
    );

    // === Bulk READ support ===
    if (status === "read" && messageIds.length > 0) {
      console.log("[MessageService] Bulk read status for", messageIds.length, "messages");
      await messageLinkingManager.markMessagesAsReadByServerIds(messageIds);
      return;
    }

    if (!serverMessageId) {
      console.warn("[MessageService] Missing messageId in single status update, skipping");
      return;
    }

    // === STEP 1: Link message only for 'sent' ===
    if (status === "sent" && clientMessageId) {
      await messageLinkingManager.robustLinking(
        chatId,
        senderId,
        clientMessageId,
        serverMessageId,
        serverTimestamp || undefined
      );
    }

    // === STEP 2: Always apply status to messageId ===
    await messageLinkingManager.updateStatusByServerId(
      serverMessageId,
      status
    );
  }

  private handleRequestNotification(rawMessage: string) {
    try {
      const wrapper = this.parseJson<RequestNotificationWrapper>(rawMessage);
      if (!wrapper) return;
      
      const notification = wrapper.message;

      switch (notification.status) {
        case "pending":
          // TODO: Notify pending request change
          console.log("[MessageService] Pending friend request");
          break;
        case "accepted":
          // TODO: Notify friends list changed
          console.log("[MessageService] Friend request accepted");
          break;
      }
    } catch (error) {
      console.error("[MessageService] Failed to handle request-notification:", error);
    }
  }

  private handleConnectionStatus(rawMessage: string) {
    const wrapper = this.parseJson<IncomingWSMessage>(rawMessage);
    if (wrapper) {
      console.log("[MessageService] WebSocket connected at:", wrapper.message);
}
  }

  private handleInfoMessage(rawMessage: string) {
    const wrapper = this.parseJson<IncomingWSMessage>(rawMessage);
    if (wrapper) {
      console.info("[MessageService] Info:", wrapper.message);
}
  }

  private handleErrorMessage(rawMessage: string) {
    const wrapper = this.parseJson<IncomingWSMessage>(rawMessage);
    if (wrapper) {
      console.error("[MessageService] WebSocket Error:", wrapper.message);
}
  }

  async sendMessage(
    type: string,
    payload: Record<string, any>,
    onSent: () => void
  ) {
    try {
      const clientMessageId = payload.client_message_id || generateUUID();
      const processedPayload = type === "chat" ? this.prepareChatMessagePayload(payload) : payload;

      const finalPayload = {
        type: type,
        message: processedPayload,
        client_message_id: clientMessageId
      };

      console.log("[MessageService] OUTGOING:", finalPayload);
      await websocketService.sendMessage(finalPayload);
      onSent();
    } catch (error) {
      console.error("[MessageService] Failed to send message", error);
    }
  }

  private prepareChatMessagePayload(payload: Record<string, any>): Record<string, any> {
    const text = payload.message_text;
    if (!text) {
      throw new Error("Missing message_text");
    }
    
    return {
      chat_id: payload.chat_id,
      content: encryptionService.encryptMessage(text)
    };
  }

  // Message State Updates
  async markMessageAsSent(messageId: string) {
    await invoke("mark_message_as_sent", { messageId });
  }

  async markMessageAsDelivered(messageId: string) {
    await invoke("mark_message_as_delivered", { messageId });
  }

  async markMessageAsRead(messageId: string) {
    await invoke("mark_message_as_read", { messageId });
  }

  async markAllMessagesAsRead(chatId: string) {
    await invoke('db_mark_messages_as_read', { chat_id: chatId });
    // TODO: Update unread count
  }

  async getUnreadMessages(chatId: string): Promise<MessageEntity[]> {
    const messages = await invoke<any[]>('db_get_unread_messages', { chat_id: chatId });
    return messages.map(msg => ({
      id: msg.id,
      messageId: msg.message_id,
      clientMessageId: msg.client_message_id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username || "Unknown",
      content: msg.content,
      timestamp: msg.timestamp,
      isRead: msg.is_read,
      isSent: msg.is_sent,
      isDelivered: msg.is_delivered,
      isFailed: msg.is_failed,
      replyToMessageId: msg.reply_to_message_id
    }));
  }

  async fetchMessages(chatId: string, limit: number = 50): Promise<MessageEntity[]> {
    if (!chatId) {
      console.error("❌ Invalid chatId for fetchMessages:", chatId);
      return [];
    }

    try {
      console.log(`[MessageService] Fetching messages for chat ${chatId}, limit: ${limit}`);
      
      const messages = await invoke<MessageEntity[]>('db_get_messages_for_chat', { chat_id: chatId });
      
      if (!Array.isArray(messages)) {
        console.warn("⚠️ Invalid messages data received:", messages);
        return [];
      }
      
      // Sort messages by timestamp and limit results
      const sortedMessages = messages
        .filter(msg => msg && msg.messageId && msg.chatId) // Filter out invalid messages
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-limit);
      
      console.log(`[MessageService] Retrieved ${sortedMessages.length} messages for chat ${chatId}`);
      return sortedMessages;
    } catch (error) {
      console.error(`❌ Failed to fetch messages for chat ${chatId}:`, error);
      return [];
    }
  }

  async fetchOldMessages(chatId: string, beforeTimestamp: number): Promise<MessageEntity[]> {
    return await invoke<MessageEntity[]>("fetch_old_messages", { chatId, beforeTimestamp });
  }

  // Helper methods
  private async insertAndEmit(message: MessageEntity) {
    // Save to database
    const dbMessage = {
      id: message.id,
      message_id: message.messageId,
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
      reply_to_message_id: message.replyToMessageId
    };
    await invoke('db_insert_message', { message: dbMessage });
    
    // Emit to UI
    if (this.messageFlow) {
      this.messageFlow(message);
    }
  }

  private parseJson<T>(jsonString: string): T | null {
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();

// Export individual functions for backward compatibility
export const fetchMessages = (chatId: string, limit: number = 50) => messageService.fetchMessages(chatId, limit);
export const handleIncomingWebSocketMessage = (rawMessage: string) => messageService.handleIncomingMessage(rawMessage);

// Additional exports for useWebSocketHandler
export const insertMessage = async (message: MessageEntity) => {
  const dbMessage = {
    id: message.id,
    message_id: message.messageId,
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
    reply_to_message_id: message.replyToMessageId
  };
  await invoke('db_insert_message', { message: dbMessage });
  const messageFlow = messageService.getMessageFlow();
  if (messageFlow) {
    messageFlow(message);
  }
};

export const updateMessageStatus = async (messageId: string, status: string) => {
  // TODO: Implement status update logic
  console.log(`Updating message ${messageId} status to ${status}`);
};

export const replaceLocalMessageId = async (_chatId: string, _senderId: string, localId: string, serverId: string) => {
  // TODO: Implement message ID replacement logic
  console.log(`Replacing local message ID ${localId} with server ID ${serverId}`);
};
