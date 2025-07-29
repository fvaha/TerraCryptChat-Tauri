import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { IncomingWSMessage, MessageStatusMessage, MessageEntity } from "./models";
import { insertMessage, updateMessageStatus, replaceLocalMessageId } from "./messageService";
import { invoke } from "@tauri-apps/api/core";
import { encryptionService } from "./encryptionService";

// Use the actual encryption service for decryption
function decryptMessage(encrypted: string, senderId?: string): string {
  return encryptionService.decryptMessage(encrypted, senderId);
}

export function useWebSocketHandler(
  onNewMessage: (message: MessageEntity) => void
) {
  useEffect(() => {
    console.log("[WebSocketHandler] Setting up WebSocket message handler...");
    
    let unsubscribe: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        unsubscribe = await listen<string>("message", async (event) => {
          try {
            // Validate event payload
            if (!event || !event.payload) {
              console.warn("[WebSocketHandler] Received empty WebSocket event");
              return;
            }

            console.log("[WebSocketHandler] Received raw message:", event.payload);
            console.log("[WebSocketHandler] Message length:", event.payload.length);
            console.log("[WebSocketHandler] Message preview:", event.payload.substring(0, 200) + (event.payload.length > 200 ? "..." : ""));

            // Get the current user from database (like Kotlin/Swift)
            const currentUser = await invoke<any>('db_get_most_recent_user');

            if (!currentUser || !currentUser.tokenHash) {
              console.error("[WebSocketHandler] No token found. Cannot authenticate WebSocket connection.");
              return; // Exit if no token is available
            }

            console.log("[WebSocketHandler] Current user authenticated:", currentUser.username);

            // Parse the WebSocket message into a structured object
            let wrapper: IncomingWSMessage;
            try {
              wrapper = JSON.parse(event.payload);
              console.log("[WebSocketHandler] Parsed message wrapper:", wrapper);
            } catch (parseError) {
              console.error("[WebSocketHandler] Failed to parse WebSocket message:", event.payload, parseError);
              return;
            }

            // Validate wrapper structure
            if (!wrapper || !wrapper.type) {
              console.warn("[WebSocketHandler] Invalid WebSocket message structure:", wrapper);
              return;
            }

            console.log("[WebSocketHandler] Processing message type:", wrapper.type);

            // Handle different message types
            switch (wrapper.type) {
              case "chat": {
                console.log("[WebSocketHandler] Processing chat message (wrapped format)...");
                const msg = wrapper.message;
                if (!msg || !msg.content || !msg.chat_id || !msg.sender_id) {
                  console.warn("[WebSocketHandler] Invalid chat message structure:", msg);
                  return;
                }

                // Link the local pending message if needed (like Swift implementation)
                if (msg.message_id && wrapper.client_message_id) {
                  try {
                    await replaceLocalMessageId(wrapper.client_message_id, msg.message_id);
                    console.log("[WebSocketHandler] Linked local pending message:", wrapper.client_message_id, "→", msg.message_id);
                  } catch (linkError) {
                    console.error("[WebSocketHandler] Failed to link message:", linkError);
                  }
                }

                const decrypted = decryptMessage(msg.content, msg.sender_id);
                if (!decrypted) {
                  console.warn("[WebSocketHandler] Failed to decrypt message content");
                  return;
                }

                console.log("[WebSocketHandler] Message decrypted successfully:", decrypted);

                // Create a MessageEntity object
                const entity: MessageEntity = {
                  messageId: msg.message_id || `temp_${Date.now()}`,
                  clientMessageId: wrapper.client_message_id || msg.message_id || `temp_${Date.now()}`,
                  chatId: msg.chat_id,
                  senderId: msg.sender_id,
                  content: decrypted,
                  timestamp: msg.sent_at ? new Date(msg.sent_at).getTime() : Date.now(),
                  isRead: false,
                  isSent: true, // Incoming messages are always sent
                  isDelivered: false,
                  isFailed: false,
                  senderUsername: msg.sender_username || "Unknown"
                };

                // Insert the message into local storage and pass it to the callback
                try {
                  await insertMessage(entity);
                  console.log("[WebSocketHandler] Message saved to database successfully");
                  onNewMessage(entity);
                } catch (dbError) {
                  console.error("[WebSocketHandler] Failed to save message to database:", dbError);
                  // Still pass the message to UI even if database save fails
                  onNewMessage(entity);
                }
                break;
              }

              case "message-status": {
                console.log("[WebSocketHandler] Processing message status update...");
                // Cast the message to MessageStatusMessage
                const statusMsg = wrapper as MessageStatusMessage;
                const { message_id, status, chat_id, sender_id, message_ids } = statusMsg.message;

                console.log("[WebSocketHandler] Status update:", { message_id, status, chat_id, sender_id });

                // Handle bulk READ status (like Swift implementation)
                if (status === "read" && message_ids && message_ids.length > 0) {
                  try {
                    // Mark multiple messages as read
                    for (const id of message_ids) {
                      await updateMessageStatus(id, status);
                    }
                    console.log("[WebSocketHandler] Bulk read status updated for", message_ids.length, "messages");
                  } catch (statusError) {
                    console.error("[WebSocketHandler] Failed to update bulk read status:", statusError);
                  }
                  break;
                }

                // Update the status of the message
                if (message_id) {
                  try {
                    await updateMessageStatus(message_id, status);
                    console.log("[WebSocketHandler] Message status updated successfully:", status);
                  } catch (statusError) {
                    console.error("[WebSocketHandler] Failed to update message status:", statusError);
                  }
                }

                // If the message is marked as sent, replace the local message ID
                if (status === "sent" && message_id && chat_id && sender_id) {
                  try {
                    // Note: This needs the client message ID to link properly
                    // For now, we'll skip this as we don't have the client ID in status messages
                    console.log("[WebSocketHandler] Status message received, but client ID not available for linking");
                  } catch (replaceError) {
                    console.error("[WebSocketHandler] Failed to replace local message ID:", replaceError);
                  }
                }
                break;
              }

              case "connection-status":
                console.info("[WebSocketHandler] Connection status update:", wrapper.message?.status, wrapper.message?.timestamp);
                break;

              case "info":
                console.info("[WebSocketHandler] Info message:", wrapper.message);
                break;

              case "error":
                console.error("[WebSocketHandler] Error message:", wrapper.message);
                break;

              default:
                console.warn("[WebSocketHandler] Unknown message type:", wrapper.type);
            }
          } catch (e) {
            console.error("[WebSocketHandler] Failed to process WebSocket message:", e);
          }
        });
      } catch (error) {
        console.error("[WebSocketHandler] Failed to set up listener:", error);
      }
    };

    setupListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        console.log("[WebSocketHandler] Cleaning up WebSocket listener...");
        unsubscribe();
      }
    };
  }, [onNewMessage]);
} 