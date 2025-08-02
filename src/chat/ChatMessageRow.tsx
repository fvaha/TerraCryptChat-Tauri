import React from 'react';
import { Message as MessageEntity } from '../services/databaseServiceAsync';
import { normalizeTimestamp } from '../utils/timestampUtils';

interface ChatMessageRowProps {
  message: MessageEntity;
  isGroupChat: boolean;
  isCurrentUser: boolean;
  onReply: (message: MessageEntity) => void;
  onResend: (message: MessageEntity) => void;
  onScrollToMessage: (messageId: string) => void;
  isFirstInGroup?: boolean;
  formatTime: (timestamp: number) => string;
  theme: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    hover: string;
    sidebar: string;
  };
}

const ChatMessageRow: React.FC<ChatMessageRowProps> = ({
  message,
  isGroupChat,
  isCurrentUser,
  onReply,
  onResend,
  onScrollToMessage,
  isFirstInGroup = true,
  formatTime,
  theme
}) => {
  // Normalize timestamp to ensure it's in milliseconds
  const normalizedTimestamp = normalizeTimestamp(message.timestamp);
  
  // Determine bubble color based on message properties
  const bubbleColor = isCurrentUser ? theme.primary : theme.surface;
  
  // Determine text color
  const textColor = isCurrentUser ? "white" : theme.text;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isCurrentUser ? "flex-end" : "flex-start",
        marginBottom: "8px",
        padding: "0 3px" // Reduced from 16px to 3px
      }}
    >
      <div 
        style={{
          maxWidth: message.content.length > 50 ? "70%" : "auto",
          minWidth: message.content.length < 10 ? "120px" : "auto",
                     padding: "3px 16px",
          borderRadius: "12px",
          backgroundColor: bubbleColor,
          color: textColor,
          border: isCurrentUser ? "none" : `1px solid ${theme.border}`,
          position: "relative",
          cursor: "pointer"
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onReply(message);
        }}
      >
        {/* Sender name for group chats */}
        {isGroupChat && !isCurrentUser && isFirstInGroup && message.sender_username && (
          <div style={{
            fontSize: "11px",
            color: "gray",
            marginBottom: "2px",
            paddingLeft: "4px"
          }}>
            {message.sender_username}
          </div>
        )}

                 {/* Reply preview if exists */}
         {message.reply_to_message_id && (
           <div
             style={{
               width: "100%",
               maxWidth: "280px",
               marginBottom: "6px",
               padding: "4px 6px 4px 8px",
               backgroundColor: `${textColor}25`,
               borderRadius: "4px",
               cursor: "pointer",
               borderLeft: `3px solid ${bubbleColor}60`
             }}
             onClick={() => onScrollToMessage(message.reply_to_message_id!)}
           >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "11px",
                  color: `${textColor}90`,
                  fontWeight: "500",
                  maxLines: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  ↩ {message.reply_to_username || 'Unknown'}
                </div>
                <div style={{
                  fontSize: "11px",
                  color: `${textColor}70`,
                  fontStyle: "italic",
                  maxLines: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {message.reply_to_content || message.reply_to_message_id}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message content */}
        <div style={{
          fontSize: "14px",
          lineHeight: "1.4",
          wordBreak: "break-word",
          maxWidth: "100%",
          marginBottom: "4px"
        }}>
          {message.content}
        </div>

        {/* Message metadata - WhatsApp-like layout */}
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: "2px",
          paddingBottom: "0px",
          marginBottom: "0px",
          fontSize: "10px",
          opacity: 0.85
        }}>
          {/* Reply button on left */}
          <button
            onClick={() => onReply(message)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "10px",
              padding: "1px 3px",
              borderRadius: "3px",
              opacity: 0.85,
              marginLeft: "-8px"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.85"}
          >
            Reply
          </button>
          
          {/* Timestamp and status on right */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1px",
            marginRight: "-8px"
          }}>
                         <span style={{ marginRight: "3px", opacity: 0.85, fontSize: "10px" }}>{formatTime(normalizedTimestamp)}</span>
            
            {/* Status indicators for own messages */}
            {isCurrentUser && (
              <div style={{ display: "flex", alignItems: "center", gap: "0px" }}>
                {message.is_failed ? (
                  <span style={{ color: '#ff4444', fontSize: "10px" }}>⚠</span>
                ) : message.is_read ? (
                  <span style={{ color: 'black', opacity: 0.85, fontSize: "10px", marginLeft: "-1px" }}>✓✓</span>
                ) : message.is_delivered ? (
                  <span style={{ color: 'black', opacity: 0.85, fontSize: "10px", marginLeft: "-1px" }}>✓✓</span>
                ) : message.is_sent ? (
                  <span style={{ color: 'black', opacity: 0.85, fontSize: "10px" }}>✓</span>
                ) : (
                  <span style={{ color: 'black', opacity: 0.85, fontSize: "10px" }}>⋯</span>
                )}
              </div>
            )}
            
            {/* Resend button for failed messages */}
            {message.is_failed && (
              <button
                onClick={() => onResend(message)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "10px",
                  padding: "1px 3px",
                  borderRadius: "3px",
                  opacity: 0.85
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "0.85"}
              >
                Resend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageRow; 
