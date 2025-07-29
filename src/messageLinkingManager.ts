import { invoke } from "@tauri-apps/api/core";
import { MessageEntity } from "./models";

export class MessageLinkingManager {
  private static instance: MessageLinkingManager;

  static get shared(): MessageLinkingManager {
    if (!MessageLinkingManager.instance) {
      MessageLinkingManager.instance = new MessageLinkingManager();
    }
    return MessageLinkingManager.instance;
  }

  /**
   * Updates local message ID by linking client message ID to server message ID
   * This is called when a message is sent and we receive the server's message ID
   */
  async updateLocalMessageId(oldClientId: string, newServerId: string): Promise<void> {
    if (oldClientId === newServerId) {
      console.log("[MessageLinkingManager] Client and server IDs are the same, skipping update");
      return;
    }

    try {
      console.log(`[MessageLinkingManager] Linking clientMessageId ${oldClientId} → serverMessageId ${newServerId}`);
      
      // Update the message in the database
      await invoke("db_update_message_id_by_client", { 
        clientMessageId: oldClientId, 
        serverId: newServerId 
      });

      // Mark the message as sent
      await invoke("db_update_message_sent_status", { 
        clientMessageId: oldClientId, 
        isSent: true 
      });

      console.log(`[MessageLinkingManager] Successfully linked message ${oldClientId} → ${newServerId}`);
    } catch (error) {
      console.error(`[MessageLinkingManager] Failed to link message ${oldClientId} → ${newServerId}:`, error);
    }
  }

  /**
   * Finds a local unlinked message by client message ID
   * This is used to find pending messages that haven't been linked to server IDs yet
   */
  async findLocalUnlinkedMessageByClientId(clientId: string): Promise<MessageEntity | null> {
    try {
      console.log(`[MessageLinkingManager] Looking for local unlinked message with clientMessageId: ${clientId}`);
      
      const message = await invoke<MessageEntity | null>("db_get_message_by_client_id", { 
        clientMessageId: clientId 
      });

      if (message && !message.isSent && !message.isDelivered) {
        console.log(`[MessageLinkingManager] Found local unlinked message with clientMessageId: ${clientId}`);
        return message;
      }

      console.log(`[MessageLinkingManager] No unlinked message found with clientMessageId: ${clientId}`);
      return null;
    } catch (error) {
      console.error(`[MessageLinkingManager] Error finding unlinked message ${clientId}:`, error);
      return null;
    }
  }

  /**
   * Robust linking that handles both client and server message IDs
   * This is the main method used for linking messages when status updates are received
   */
  async robustLinking(
    chatId: string,
    senderId: string,
    clientMessageId: string,
    serverMessageId: string
  ): Promise<void> {
    try {
      console.log(`[MessageLinkingManager] 🔗 Robust linking: ${clientMessageId} → ${serverMessageId}`);
      console.log(`[MessageLinkingManager] 📍 Context: chatId=${chatId}, senderId=${senderId}`);
      
      // First, try to find the message by client ID
      const localMessage = await this.findLocalUnlinkedMessageByClientId(clientMessageId);
      
      if (localMessage) {
        console.log(`[MessageLinkingManager] ✅ Found local message for linking:`, localMessage.clientMessageId);
        
        // Link the message
        await this.updateLocalMessageId(clientMessageId, serverMessageId);
        
        console.log(`[MessageLinkingManager] ✅ Successfully linked message ${clientMessageId} → ${serverMessageId}`);
      } else {
        console.log(`[MessageLinkingManager] ⚠️ No local message found for linking ${clientMessageId} → ${serverMessageId}`);
        
        // Check if message already exists with server ID
        const existingMessage = await this.findMessageByServerId(serverMessageId);
        if (existingMessage) {
          console.log(`[MessageLinkingManager] ℹ️ Message already exists with server ID: ${serverMessageId}`);
        } else {
          console.log(`[MessageLinkingManager] ❌ No message found for either client ID or server ID`);
        }
      }
    } catch (error) {
      console.error(`[MessageLinkingManager] ❌ Error in robust linking ${clientMessageId} → ${serverMessageId}:`, error);
    }
  }

  /**
   * Updates message status by server message ID
   */
  async updateStatusByServerId(serverMessageId: string, status: string): Promise<void> {
    try {
      console.log(`[MessageLinkingManager] Updating status for server message ${serverMessageId} to ${status}`);
      
      switch (status) {
        case "sent":
          await invoke("db_mark_message_sent_by_server_id", { messageId: serverMessageId });
          break;
        case "delivered":
          await invoke("db_mark_message_delivered_by_server_id", { messageId: serverMessageId });
          break;
        case "read":
          await invoke("db_mark_message_read_by_server_id", { messageId: serverMessageId });
          break;
        default:
          console.warn(`[MessageLinkingManager] Unknown status: ${status}`);
      }
      
      console.log(`[MessageLinkingManager] Successfully updated status for ${serverMessageId} to ${status}`);
    } catch (error) {
      console.error(`[MessageLinkingManager] Error updating status for ${serverMessageId}:`, error);
    }
  }

  /**
   * Marks multiple messages as read by their server IDs
   */
  async markMessagesAsReadByServerIds(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    try {
      console.log(`[MessageLinkingManager] Marking ${messageIds.length} messages as read by server IDs`);
      
      await invoke("db_mark_messages_read_by_server_ids", { messageIds });
      
      console.log(`[MessageLinkingManager] Successfully marked ${messageIds.length} messages as read`);
    } catch (error) {
      console.error(`[MessageLinkingManager] Error marking messages as read:`, error);
    }
  }

  /**
   * Finds a message by server message ID
   */
  async findMessageByServerId(serverMessageId: string): Promise<MessageEntity | null> {
    try {
      const message = await invoke<MessageEntity | null>("db_get_message_by_id", { 
        messageId: serverMessageId 
      });
      
      if (message) {
        console.log(`[MessageLinkingManager] Found message by server ID: ${serverMessageId}`);
      }
      
      return message;
    } catch (error) {
      console.error(`[MessageLinkingManager] Error finding message by server ID ${serverMessageId}:`, error);
      return null;
    }
  }

  /**
   * Checks if a message exists by either client or server ID
   */
  async messageExists(clientMessageId: string, serverMessageId: string): Promise<boolean> {
    try {
      const byClient = await this.findLocalUnlinkedMessageByClientId(clientMessageId);
      const byServer = await this.findMessageByServerId(serverMessageId);
      
      return byClient !== null || byServer !== null;
    } catch (error) {
      console.error(`[MessageLinkingManager] Error checking message existence:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const messageLinkingManager = MessageLinkingManager.shared; 