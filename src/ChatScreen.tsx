import { useEffect, useRef, useState } from "react";
import { useAppContext } from "./AppContext";
import { MessageEntity } from "./models";
import { useTheme } from "./ThemeContext";
import { nativeApiService } from "./nativeApiService";

interface Props {
  chatId: string;
  messages: MessageEntity[];
  isGroupChat?: boolean;
  onMessageSent?: (message: MessageEntity) => void;
}

function ChatScreen({ chatId, messages, isGroupChat = false, onMessageSent }: Props) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { user } = useAppContext();
  const { theme, isDarkMode } = useTheme();
  const currentUserId = user?.userId;

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !currentUserId || !user?.tokenHash) return;
    
    try {
      setIsSending(true);
      
      // Set token in native API service
      nativeApiService.setToken(user.tokenHash);
      
      // Send message using native API
      const response = await nativeApiService.sendMessage(
        newMessage.trim(),
        chatId
      );
      
      console.log("✅ Message sent successfully:", response);
      
      // Create a local message entity for immediate display
      const localMessage: MessageEntity = {
        messageId: response.message_id,
        clientMessageId: response.message_id,
        chatId: chatId,
        senderId: currentUserId,
        content: newMessage.trim(),
        timestamp: response.timestamp * 1000, // Convert to milliseconds
        isRead: false,
        isSent: true,
        isDelivered: false,
        isFailed: false,
        senderUsername: user.username || user.name || "You"
      };
      
      // Call the callback to add message to the parent component
      if (onMessageSent) {
        onMessageSent(localMessage);
      }
      
      setNewMessage("");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      // TODO: Show error toast/notification
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getBubbleColor = (isMe: boolean, senderId: string) => {
    if (isMe) return theme.primary;
    if (isGroupChat) {
      // Generate a consistent color based on senderId
      const hash = senderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = hash % 360;
      return `hsla(${hue}, 70%, 85%, 0.2)`;
    }
    return isDarkMode ? theme.surface : "#f3f4f6";
  };

  const getTextColor = (isMe: boolean) =>
    isMe ? "#fff" : isDarkMode ? theme.text : "#1f2937";

  const parseReply = (text: string) => {
    const pattern = /⟪(.*?)⟫: (.*)/;
    const match = text.match(pattern);
    if (!match) return null;
    
    const [, originalSender, originalMessage] = match;
    const replyOnly = text.replace(pattern, '').trim();
    
    return {
      originalSender,
      originalMessage: originalMessage.replace(/- \*$/, ''),
      replyMessage: replyOnly
    };
  };

  const getStatusIcon = (message: MessageEntity) => {
    if (message.isFailed) return "⚠️";
    if (message.isDelivered) return "✓✓";
    if (message.isSent) return "✓";
    return "";
  };

  const isUnsafeMessage = (message: MessageEntity) => {
    const cleaned = message.content.replace(/- \*$/, '').trim();
    return !message.isSent && (cleaned.length === 0 || message.content.includes('-*'));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 py-2">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUserId;
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const isFromSameSender = previousMessage?.senderId === msg.senderId;
          
          const replyData = parseReply(msg.content);
          const displayContent = replyData?.replyMessage || msg.content.replace(/- \*$/, '').trim();

          return (
            <div
              key={msg.clientMessageId || msg.messageId}
              className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
              style={{
                paddingTop: isFromSameSender ? 1 : 6,
                paddingBottom: isFromSameSender ? 1 : 6,
              }}
            >
              <div
                className="flex flex-col max-w-[75%]"
                style={{ alignItems: isMe ? "flex-end" : "flex-start" }}
              >
                {/* Username for group chats */}
                {isGroupChat && !isMe && !isFromSameSender && msg.senderUsername && (
                  <span
                    className="text-xs font-medium mb-1"
                    style={{ 
                      color: getBubbleColor(false, msg.senderId),
                      opacity: 0.7
                    }}
                  >
                    {msg.senderUsername}
                  </span>
                )}

                {/* Message bubble */}
                <div
                  className="relative rounded-2xl px-4 py-2 shadow-sm"
                  style={{
                    background: getBubbleColor(isMe, msg.senderId),
                    color: getTextColor(isMe),
                    borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    maxWidth: "75vw",
                    minWidth: 90,
                  }}
                >
                  {/* Reply preview */}
                  {replyData && (
                    <div
                      className="mb-2 p-2 rounded-lg cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        borderLeft: "3px solid rgba(255,255,255,0.3)"
                      }}
                      onClick={() => {
                        // TODO: Scroll to replied message
                        console.log("Scroll to reply:", replyData);
                      }}
                    >
                      <div className="text-xs opacity-75 mb-1">
                        ↩ {replyData.originalSender}
                      </div>
                      <div className="text-xs opacity-50 truncate">
                        {replyData.originalMessage}
                      </div>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="mb-4">
                    <span style={{ wordBreak: "break-word" }}>{displayContent}</span>
                  </div>

                  {/* Timestamp and status */}
                  <div className="flex items-center justify-end gap-1 absolute bottom-2 right-3">
                    <span
                      className="text-xs opacity-85"
                      style={{ color: getTextColor(isMe) }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    
                    {isMe && (
                      <span className="text-xs ml-1" style={{ color: getTextColor(isMe) }}>
                        {getStatusIcon(msg)}
                      </span>
                    )}

                    {!isMe && isUnsafeMessage(msg) && (
                      <span className="text-xs ml-1 text-yellow-500">⚠️</span>
                    )}
                  </div>
                </div>

                {/* Resend button for failed messages */}
                {isMe && msg.isFailed && (
                  <button
                    className="mt-2 p-2 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                    onClick={() => {
                      // TODO: Implement resend logic
                      console.log("Resend message:", msg);
                    }}
                  >
                    ↻
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={isSending}
          className="flex-1 bg-gray-700 text-white rounded px-3 py-2 disabled:opacity-50"
          placeholder={isSending ? "Sending..." : "Type your message..."}
        />
        <button
          onClick={sendMessage}
          disabled={isSending || !newMessage.trim()}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white transition-colors"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default ChatScreen;
