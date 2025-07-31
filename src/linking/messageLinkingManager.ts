import { databaseServiceAsync } from '../services/databaseServiceAsync';

/**
 * Message Linking Manager - handles ACK status messages and message linking
 * Similar to Kotlin MessageLinkingManager
 */
export class MessageLinkingManager {
  /**
   * Update the messageId of a locally pending message (by clientMessageId) to the server-assigned messageId (serverId).
   * Also updates timestamp if server provides it.
   */
  private async replaceMessageIdByClient(
    clientMessageId: string, 
    serverId: string, 
    serverTimestamp?: number
  ): Promise<void> {
    try {
      const oldMessage = await databaseServiceAsync.getMessageByClientId(clientMessageId);
      if (oldMessage) {
        // Update the serverId (messageId) in the local DB
        await databaseServiceAsync.updateMessageIdByClient(clientMessageId, serverId);
        
        // Optionally update timestamp (if server gives strict/accurate time)
        if (serverTimestamp && oldMessage.timestamp !== serverTimestamp) {
          const updated = {
            ...oldMessage,
            message_id: serverId,
            timestamp: serverTimestamp,
            is_sent: true,
            is_failed: false
          };
          await databaseServiceAsync.insertMessage(updated);
        }
        console.log(`[MessageLinkingManager] Linked clientMessageId ${clientMessageId} → serverId ${serverId} (timestamp = ${serverTimestamp || oldMessage.timestamp})`);
      } else {
        console.warn(`[MessageLinkingManager] No local message found for linking: ${clientMessageId}`);
      }
    } catch (error) {
      console.error(`[MessageLinkingManager] Error linking message:`, error);
    }
  }

  /**
   * Find a pending message by sender, chatId, and timestamp for linking.
   * (Used as fallback when no clientMessageId - but in practice, always use clientMessageId.)
   */
  private async findUnlinkedMessageForStatus(
    chatId: string,
    senderId: string,
    serverTimestampMillis: number,
    windowMillis: number = 2000
  ): Promise<any> {
    try {
      const unreadMessages = await databaseServiceAsync.getUnreadMessages(chatId);
      console.log(`[MessageLinkingManager] Attempting robust linking for chat=${chatId} sender=${senderId} timestamp=${serverTimestampMillis}`);
      
      return unreadMessages.find(msg => 
        msg.sender_id === senderId &&
        Math.abs(msg.timestamp - serverTimestampMillis) < windowMillis
      );
    } catch (error) {
      console.error(`[MessageLinkingManager] Error finding unlinked message:`, error);
      return null;
    }
  }

  /**
   * Perform robust linking by clientMessageId (recommended).
   * If not available, fallback to timestamp+sender logic (old legacy).
   */
  async robustLinking(
    chatId: string,
    senderId: string,
    serverId: string,
    clientMessageId?: string,
    serverTimestampMillis?: number
  ): Promise<void> {
    if (clientMessageId && clientMessageId.trim()) {
      await this.replaceMessageIdByClient(clientMessageId, serverId, serverTimestampMillis);
    } else if (serverTimestampMillis) {
      const candidate = await this.findUnlinkedMessageForStatus(chatId, senderId, serverTimestampMillis);
      if (candidate) {
        await this.replaceMessageIdByClient(candidate.client_message_id, serverId, serverTimestampMillis);
      } else {
        console.warn(`[MessageLinkingManager] No candidate found for robust linking: ${serverId}`);
      }
    } else {
      console.warn(`[MessageLinkingManager] Cannot robustly link message (no clientMessageId or timestamp): ${serverId}`);
    }
  }

  /**
   * Update message status based on ACK from server
   */
  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    try {
      switch (status) {
        case 'sent':
          await databaseServiceAsync.updateMessageSentStatusByServerId(messageId, true);
          break;
        case 'delivered':
          await databaseServiceAsync.markMessageDeliveredByServerIdNew(messageId);
          break;
        case 'read':
          await databaseServiceAsync.markMessageReadByServerIdNew(messageId);
          break;
        default:
          console.warn(`[MessageLinkingManager] Unknown status: ${status}`);
      }
    } catch (error) {
      console.error(`[MessageLinkingManager] Error updating message status:`, error);
    }
  }

  /**
   * Mark multiple messages as read by their server IDs
   */
  async markMessagesAsReadByServerIds(messageIds: string[]): Promise<void> {
    try {
      for (const messageId of messageIds) {
        await databaseServiceAsync.markMessageReadByServerIdNew(messageId);
      }
      console.log(`[MessageLinkingManager] Marked ${messageIds.length} messages as read`);
    } catch (error) {
      console.error(`[MessageLinkingManager] Error marking messages as read:`, error);
    }
  }

  /**
   * Update local message ID with server message ID
   */
  async updateLocalMessageId(localId: string, serverId: string): Promise<void> {
    try {
      await databaseServiceAsync.updateMessageIdByClient(localId, serverId);
      console.log(`[MessageLinkingManager] Updated local message ID ${localId} to server ID ${serverId}`);
    } catch (error) {
      console.error(`[MessageLinkingManager] Error updating local message ID:`, error);
    }
  }
}

export const messageLinkingManager = new MessageLinkingManager(); 