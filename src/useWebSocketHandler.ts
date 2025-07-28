import { listen } from "@tauri-apps/api/event";
import { IncomingWSMessage, MessageStatusMessage, MessageEntity } from "./models";
import { insertMessage, updateMessageStatus, replaceLocalMessageId } from "./messageService";
import { invoke } from "@tauri-apps/api/core";

// You can replace this function with actual decryption logic
function decryptMessage(encrypted: string): string {
  // This is just a placeholder. You can implement actual decryption logic here
  return encrypted;
}

export function useWebSocketHandler(
  onNewMessage: (message: MessageEntity) => void
) {
  listen<string>("message", async (event) => {
    try {
      // Validate event payload
      if (!event || !event.payload) {
        console.warn("⚠️ Received empty WebSocket event");
        return;
      }

      // Get the current user from database (like Kotlin/Swift)
      const currentUser = await invoke<any>('db_get_most_recent_user');

      if (!currentUser || !currentUser.tokenHash) {
        console.error("No token found. Cannot authenticate WebSocket connection.");
        return; // Exit if no token is available
      }

      // Parse the WebSocket message into a structured object
      let wrapper: IncomingWSMessage;
      try {
        wrapper = JSON.parse(event.payload);
      } catch (parseError) {
        console.error("❌ Failed to parse WebSocket message:", event.payload, parseError);
        return;
      }

      // Validate wrapper structure
      if (!wrapper || !wrapper.type) {
        console.warn("⚠️ Invalid WebSocket message structure:", wrapper);
        return;
      }

      // Handle different message types
      switch (wrapper.type) {
        case "chat": {
          const msg = wrapper.message;
          if (!msg || !msg.content || !msg.chat_id || !msg.sender_id) {
            console.warn("⚠️ Invalid chat message structure:", msg);
            return;
          }

          const decrypted = decryptMessage(msg.content);
          if (!decrypted) {
            console.warn("⚠️ Failed to decrypt message content");
            return;
          }

          // Create a MessageEntity object
          const entity: MessageEntity = {
            messageId: msg.message_id || `temp_${Date.now()}`,
            clientMessageId: msg.message_id || `temp_${Date.now()}`,
            chatId: msg.chat_id,
            senderId: msg.sender_id,
            content: decrypted,
            timestamp: Date.now(),
            isRead: false,
            isSent: false,
            isDelivered: false,
            isFailed: false,
            senderUsername: msg.sender_username || "Unknown"
          };

          // Insert the message into local storage and pass it to the callback
          try {
            await insertMessage(entity);
            onNewMessage(entity);
          } catch (dbError) {
            console.error("❌ Failed to save message to database:", dbError);
            // Still pass the message to UI even if database save fails
            onNewMessage(entity);
          }
          break;
        }

        case "message-status": {
          // Cast the message to MessageStatusMessage
          const statusMsg = wrapper as MessageStatusMessage;
          const { message_id, status, chat_id, sender_id } = statusMsg.message;

          // Update the status of the message
          if (message_id) {
            try {
              await updateMessageStatus(message_id, status);
            } catch (statusError) {
              console.error("❌ Failed to update message status:", statusError);
            }
          }

          // If the message is marked as sent, replace the local message ID
          if (status === "sent" && message_id && chat_id && sender_id) {
            try {
              await replaceLocalMessageId(chat_id, sender_id, message_id, message_id);
            } catch (replaceError) {
              console.error("❌ Failed to replace local message ID:", replaceError);
            }
          }
          break;
        }

        case "connection-status":
          console.info("WS Connected:", wrapper.message?.timestamp);
          break;

        case "info":
          console.info("Info:", wrapper.message);
          break;

        case "error":
          console.error("WS Error:", wrapper.message);
          break;

        default:
          console.warn("Unknown message type:", wrapper.type);
      }
    } catch (e) {
      console.error("❌ Failed to process WebSocket message:", e);
    }
  });
}
