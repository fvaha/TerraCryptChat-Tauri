import React from 'react';
import { MessageEntity } from '../models/models';
import { normalizeTimestamp } from '../utils/timestampUtils';
import { useTheme } from '../components/ThemeContext';

interface ChatMessageRowProps {
  message: MessageEntity;
  isOwnMessage: boolean;
  onReply: () => void;
  onDelete: () => void;
}

const ChatMessageRow: React.FC<ChatMessageRowProps> = ({
  message,
  isOwnMessage,
  onReply,
  onDelete
}) => {
  const { theme } = useTheme();
  
  // Normalize timestamp to ensure it's in milliseconds
  const normalizedTimestamp = normalizeTimestamp(message.timestamp);
  
  // Determine bubble color based on message properties
  const bubbleColor = isOwnMessage ? theme.primary : theme.surface;
  
  // Determine text color
  const textColor = isOwnMessage ? "white" : theme.text;

  // Format time function
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        marginBottom: "8px",
        padding: "0 3px"
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
          border: isOwnMessage ? "none" : `1px solid ${theme.border}`,
          position: "relative",
          cursor: "pointer"
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onReply();
        }}
      >
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
            onClick={onReply}
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
            <span style={{ marginRight: "3px", opacity: 0.85, fontSize: "10px" }}>
              {formatTime(normalizedTimestamp)}
            </span>
            
            {/* Status indicators for own messages */}
            {isOwnMessage && (
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageRow; 
