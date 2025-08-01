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
  theme: any;
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
        padding: "0 16px"
      }}
    >
      <div 
        style={{
          maxWidth: message.content.length > 50 ? "70%" : "auto",
          minWidth: message.content.length < 10 ? "120px" : "auto",
          padding: "12px 16px",
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
              backgroundColor: `${textColor}10`,
              borderRadius: "1px",
              cursor: "pointer"
            }}
            onClick={() => onScrollToMessage(message.reply_to_message_id!)}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* Reply indicator line */}
              <div style={{
                width: "3px",
                height: "28px",
                backgroundColor: `${textColor}40`,
                borderRadius: "1px",
                marginRight: "6px"
              }} />
              
                             <div style={{ flex: 1 }}>
                 <div style={{
                   fontSize: "11px",
                   color: `${textColor}85`,
                   maxLines: 1,
                   overflow: "hidden",
                   textOverflow: "ellipsis"
                 }}>
                   ↩ Reply to {message.reply_to_username || 'Unknown'}
                 </div>
                 <div style={{
                   fontSize: "11px",
                   color: `${textColor}60`,
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

        {/* Message metadata - matching Kotlin layout */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "2px",
          fontSize: "11px",
          opacity: 0.7
        }}>
                     {/* Reply indicator on left */}
           {message.reply_to_message_id && (
             <span style={{ fontSize: "9px", opacity: 0.6 }}>
               ↶ Reply to {message.reply_to_username || 'Unknown'}
             </span>
           )}
          
          {/* Timestamp and status on right */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>{formatTime(normalizedTimestamp)}</span>
            
            {/* Status indicators for own messages */}
            {isCurrentUser && (
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                {message.is_failed ? (
                  <span style={{ color: '#ff4444' }}>⚠</span>
                ) : message.is_read ? (
                  <span style={{ color: '#4CAF50' }}>✓✓</span>
                ) : message.is_delivered ? (
                  <span style={{ color: '#2196F3' }}>✓✓</span>
                ) : message.is_sent ? (
                  <span style={{ color: '#9E9E9E' }}>✓</span>
                ) : (
                  <span style={{ color: '#9E9E9E' }}>⋯</span>
                )}
              </div>
            )}
            
            {/* Message actions */}
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => onReply(message)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "11px",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  opacity: 0.7
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
              >
                Reply
              </button>
              
              {message.is_failed && (
                <button
                  onClick={() => onResend(message)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
                >
                  Resend
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageRow; 