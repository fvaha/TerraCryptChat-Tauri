import { invoke } from "@tauri-apps/api/core";
import { MessageEntity } from "./models";

export class MessageLinkingManager {
  /**
   * Links a pending message (by clientMessageId) with the server-assigned messageId.
   * Updates status and timestamp, but does NOT overwrite clientMessageId.
   */
  async replaceMessageIdByClient(
    clientMessageId: string,
    serverId: string,
    serverTimestamp?: number
  ): Promise<void> {
    try {
      await invoke("db_update_message_id_by_client", { clientMessageId, serverId });
      console.log(
        `[MessageLinkingManager] Linked serverId=${serverId} to local clientId=${clientMessageId}`
      );
    } catch (error) {
      console.error("[MessageLinkingManager] Failed to replace message ID:", error);
    }
  }

  /**
   * Fallback: Finds a message without serverId based on timestamp and sender.
   */
  async findUnlinkedMessageByTimestamp(
    chatId: string,
    senderId: string,
    serverTimestampMillis: number,
    windowMillis: number = 3000
  ): Promise<MessageEntity | null> {
    try {
      const messages = await invoke<MessageEntity[]>("db_get_messages_for_chat", { chat_id: chatId });
      return messages.find(
        (msg) =>
          msg.senderId === senderId &&
          !msg.messageId &&
          Math.abs(msg.timestamp - serverTimestampMillis) <= windowMillis
      ) || null;
    } catch (error) {
      console.error("[MessageLinkingManager] Failed to find unlinked message:", error);
      return null;
    }
  }

  /**
   * Main linking function — tries clientMessageId first, then timestamp fallback.
   */
  async robustLinking(
    chatId: string,
    senderId: string,
    clientMessageId: string | null,
    serverId: string,
    serverTimestampMillis?: number
  ): Promise<void> {
    if (clientMessageId && clientMessageId.trim()) {
      await this.replaceMessageIdByClient(clientMessageId, serverId, serverTimestampMillis);
    } else if (serverTimestampMillis) {
      const match = await this.findUnlinkedMessageByTimestamp(
        chatId,
        senderId,
        serverTimestampMillis
      );
      if (match) {
        await this.replaceMessageIdByClient(match.clientMessageId, serverId, serverTimestampMillis);
        console.log(`[MessageLinkingManager] Linked serverId=${serverId} via timestamp fallback`);
      } else {
        console.warn(`[MessageLinkingManager] No fallback match found for serverId=${serverId} with timestamp=${serverTimestampMillis}`);
      }
    } else {
      console.warn(`[MessageLinkingManager] Missing clientMessageId and timestamp for serverId=${serverId} — cannot link`);
    }
  }

  /**
   * Applies status update by serverId — handles all types: sent, delivered, read.
   * Assumes robustLinking was already attempted.
   */
  async updateStatusByServerId(
    serverId: string,
    status: string,
    // timestamp?: number
  ): Promise<void> {
    try {
      switch (status.toLowerCase()) {
        case "sent":
          // Sent status is handled by replaceMessageIdByClient
          break;
        case "delivered":
          await invoke("db_mark_message_delivered_by_server_id", { messageId: serverId });
          break;
        case "read":
          await invoke("db_mark_message_read_by_server_id", { messageId: serverId });
          break;
        default:
          console.warn(`[MessageLinkingManager] Unknown status: ${status} for serverId=${serverId}`);
      }
    } catch (error) {
      console.error(`[MessageLinkingManager] Failed to apply ${status} to serverId=${serverId}`, error);
    }
  }

  /**
   * Find message by client ID
   */
  async findMessageByClientId(clientMessageId: string): Promise<MessageEntity | null> {
    try {
      const message = await invoke<any>("db_get_message_by_client_id", { clientMessageId });
      if (message) {
        return {
          id: message.id,
          messageId: message.message_id,
          clientMessageId: message.client_message_id,
          chatId: message.chat_id,
          senderId: message.sender_id,
          senderUsername: message.sender_username,
          content: message.content,
          timestamp: message.timestamp,
          isRead: message.is_read,
          isSent: message.is_sent,
          isDelivered: message.is_delivered,
          isFailed: message.is_failed,
          replyToMessageId: message.reply_to_message_id
        };
      }
      return null;
    } catch (error) {
      console.error("[MessageLinkingManager] Failed to find message by client ID:", error);
      return null;
    }
  }

  /**
   * Handle bulk read status updates
   */
  async markMessagesAsReadByServerIds(messageIds: string[]): Promise<void> {
    try {
      if (messageIds.length > 0) {
        await invoke("db_mark_messages_read_by_server_ids", { messageIds });
        console.log(`[MessageLinkingManager] Marked ${messageIds.length} messages as read by serverIds`);
      }
    } catch (error) {
      console.error("[MessageLinkingManager] Failed to mark messages as read:", error);
    }
  }
}

// Export singleton instance
export const messageLinkingManager = new MessageLinkingManager(); 