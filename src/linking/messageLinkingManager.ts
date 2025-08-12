import { databaseServiceAsync } from '../services/databaseServiceAsync';
import { Message } from '../models/models';

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
      console.log(`[MessageLinkingManager] replaceMessageIdByClient called:`, {
        clientMessageId,
        serverId,
        serverTimestamp
      });
      
      const oldMessage = await databaseServiceAsync.getMessageByClientId(clientMessageId);
      if (oldMessage) {
        console.log(`[MessageLinkingManager] Found old message:`, oldMessage);
        
        // Update the serverId (messageId) in the local DB
        await databaseServiceAsync.updateMessageIdByClient(clientMessageId, serverId);
        console.log(`[MessageLinkingManager] Updated message ID in database`);
        
        // Optionally update timestamp (if server gives strict/accurate time)
        if (serverTimestamp && oldMessage.timestamp !== serverTimestamp) {
          // TODO: Implement updateMessageTimestampAndStatus method in DatabaseServiceAsync
          // This should update: timestamp, is_sent=true, is_failed=false
          console.log(`[MessageLinkingManager] Server timestamp differs, but timestamp update not yet implemented`);
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
  ): Promise<Message | null> {
    try {
      const unreadMessages = await databaseServiceAsync.getUnreadMessages(chatId);
      console.log(`[MessageLinkingManager] Attempting robust linking for chat=${chatId} sender=${senderId} timestamp=${serverTimestampMillis}`);
      
      return unreadMessages.find(msg => 
        msg.sender_id === senderId &&
        Math.abs(msg.timestamp - serverTimestampMillis) < windowMillis
      ) || null;
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
    serverMessageId: string,
    clientMessageId?: string,
    serverTimestampMillis?: number
  ): Promise<void> {
    // Input validation
    if (!chatId || !senderId || !serverMessageId) {
      console.error(`[MessageLinkingManager] Invalid parameters: chatId=${chatId}, senderId=${senderId}, serverMessageId=${serverMessageId}`);
      return;
    }
    
    console.log(`[MessageLinkingManager] robustLinking called:`, {
      chatId,
      senderId,
      serverMessageId,
      clientMessageId,
      serverTimestampMillis
    });
    
    if (clientMessageId && clientMessageId.trim()) {
      console.log(`[MessageLinkingManager] Using clientMessageId for linking: ${clientMessageId}`);
      await this.replaceMessageIdByClient(clientMessageId, serverMessageId, serverTimestampMillis);
    } else if (serverTimestampMillis) {
      console.log(`[MessageLinkingManager] No clientMessageId, using timestamp fallback`);
      const candidate = await this.findUnlinkedMessageForStatus(chatId, senderId, serverTimestampMillis);
      if (candidate && candidate.client_message_id) {
        console.log(`[MessageLinkingManager] Found candidate for linking:`, candidate);
        await this.replaceMessageIdByClient(candidate.client_message_id, serverMessageId, serverTimestampMillis);
      } else {
        console.warn(`[MessageLinkingManager] No candidate found for robust linking: ${serverMessageId}`);
      }
    } else {
      console.warn(`[MessageLinkingManager] Cannot robustly link message (no clientMessageId or timestamp): ${serverMessageId}`);
    }
  }

  /**
   * Update message status based on ACK from server
   */
  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    try {
      console.log(`[MessageLinkingManager] updateMessageStatus called: status=${status}, messageId=${messageId}`);
      
      switch (status) {
        case 'sent':
          await databaseServiceAsync.updateMessageSentStatusByServerId(messageId, true);
          console.log(`[MessageLinkingManager] Successfully updated sent status for message: ${messageId}`);
          break;
        case 'delivered':
          // For delivered status, we need to ensure the message exists before updating
          // First try to find the message by server ID
          let message = await databaseServiceAsync.getMessageById(messageId);
          
          if (!message) {
            console.log(`[MessageLinkingManager] Message not found by server ID ${messageId}, attempting to find by other means...`);
            // Try to find the message by looking for recent messages that might not be linked yet
            // This is a fallback for when isDelivered comes in before isSent
            message = await this.findMessageForStatusUpdate(messageId);
          }
          
          if (message) {
            await databaseServiceAsync.markMessageDeliveredByServerId(messageId);
            console.log(`[MessageLinkingManager] Successfully updated delivered status for message: ${messageId}`);
          } else {
            console.warn(`[MessageLinkingManager] Could not find message to update delivered status: ${messageId}`);
          }
          break;
        case 'read':
          await databaseServiceAsync.markMessageReadByServerId(messageId);
          console.log(`[MessageLinkingManager] Successfully updated read status for message: ${messageId}`);
          break;
        default:
          console.warn(`[MessageLinkingManager] Unknown status: ${status}`);
      }
    } catch (error) {
      console.error(`[MessageLinkingManager] Error updating message status:`, error);
    }
  }

  /**
   * Find a message that might not be linked yet for status updates
   * This is used when isDelivered comes in before isSent
   */
  private async findMessageForStatusUpdate(serverMessageId: string): Promise<Message | null> {
    try {
      console.log(`[MessageLinkingManager] findMessageForStatusUpdate called for server ID: ${serverMessageId}`);
      
      // Since we don't have getAllMessages, we'll use a different approach
      // We'll look for recent unread messages in all chats, which are more likely to be unlinked
      
      // Get all chats first
      const allChats = await databaseServiceAsync.getAllChats();
      
      for (const chat of allChats) {
        try {
          // Get recent messages for each chat
          const recentMessages = await databaseServiceAsync.getMessagesForChat(chat.chat_id);
          
          // Look for a message that might match by timestamp or other criteria
          for (const message of recentMessages) {
            // Check if this message has no server message_id but might be the one we're looking for
            if (!message.message_id && message.timestamp) {
              // This is a heuristic approach - in a real implementation, you might want to
              // use more sophisticated matching criteria
              console.log(`[MessageLinkingManager] Found potential unlinked message: ${message.id}`);
              return message;
            }
          }
        } catch (chatError) {
          console.warn(`[MessageLinkingManager] Error checking chat ${chat.chat_id}:`, chatError);
        }
      }
      
      console.log(`[MessageLinkingManager] No suitable message found for status update`);
      return null;
    } catch (error) {
      console.error(`[MessageLinkingManager] Error in findMessageForStatusUpdate:`, error);
      return null;
    }
  }

  /**
   * Mark multiple messages as read by their server IDs
   */
  async markMessagesAsReadByServerIds(messageIds: string[]): Promise<void> {
    try {
      for (const messageId of messageIds) {
        await databaseServiceAsync.markMessageReadByServerId(messageId);
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
