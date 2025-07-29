import React, { useState, useEffect, useRef, useCallback } from 'react';
import { databaseService } from './databaseService';
import { messageService } from './messageService';
import { ParticipantService } from './participantService';
import { MessageEntity } from './models';
import { useAppContext } from './AppContext';
import { useWebSocketHandler } from './useWebSocketHandler';
import { websocketService } from './websocketService';
import { useTheme } from './ThemeContext';
import './ChatScreen.css';

interface ChatScreenProps {
  chatId: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId }) => {
  console.log("🚀 ChatScreen: Component rendering with chatId:", chatId);
  
  const { token, user } = useAppContext();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<MessageEntity[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<MessageEntity | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [chatData, setChatData] = useState<{
    chatName: string;
    isGroupChat: boolean;
    receiverId: string;
  }>({
    chatName: 'Loading...',
    isGroupChat: false,
    receiverId: ''
  });
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Monitor WebSocket connection status
  useEffect(() => {
    console.log("🚀 ChatScreen: Setting up WebSocket status monitoring");
    
    const checkConnection = () => {
      const connected = websocketService.isConnectedToServer();
      console.log("🚀 ChatScreen: checkConnection() called, result:", connected);
      setWsConnected(connected);
      console.log("🚀 ChatScreen: WebSocket connection status:", connected);
    };
    
    // Check immediately
    console.log("🚀 ChatScreen: Checking connection immediately");
    checkConnection();
    
    // Set up WebSocket status change listener
    const handleStatusChange = (status: any) => {
      console.log("🚀 ChatScreen: WebSocket status changed:", status);
      const connected = status.connection_state === 'connected' || status.is_connected;
      console.log("🚀 ChatScreen: Setting wsConnected to:", connected);
      setWsConnected(connected);
    };
    
    // Listen for WebSocket status changes
    console.log("🚀 ChatScreen: Registering status change handler");
    websocketService.onStatusChange(handleStatusChange);
    
    // Set up periodic checking as backup
    console.log("🚀 ChatScreen: Setting up periodic connection check");
    const interval = setInterval(checkConnection, 5000);
    
    return () => {
      console.log("🚀 ChatScreen: Component unmounting");
      websocketService.offStatusChange(handleStatusChange);
      clearInterval(interval);
    };
  }, []);

  // Function to load messages from database
  const loadMessagesFromDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`📨 Loading messages from database for chat ${chatId}`);
      const messageEntities = await messageService.fetchMessages(chatId, 50);
      console.log(`📨 Loaded ${messageEntities.length} messages from database:`, messageEntities);
      
      // Sort messages by timestamp (oldest first for display - proper chat flow)
      const sortedMessages = messageEntities.sort((a, b) => a.timestamp - b.timestamp);
      console.log(`📨 Setting ${sortedMessages.length} sorted messages to state`);
      setMessages(sortedMessages);
      console.log(`📨 Messages state updated successfully`);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error("❌ Failed to load messages:", error);
      setError("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  // Use WebSocket handler to listen for new messages
  useWebSocketHandler((message: MessageEntity) => {
    console.log("🚀 ChatScreen: Received new message via WebSocket:", message);
    if (message.chatId === chatId) {
      console.log("🚀 ChatScreen: New message belongs to current chat, refreshing messages");
      loadMessagesFromDatabase();
    }
  });

  // Load current user ID
  const loadCurrentUser = async () => {
    try {
      const currentUser = await databaseService.getCurrentUser();
      if (currentUser) {
        setCurrentUserId(currentUser.user_id);
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  };

  // Load chat data and participant names
  const loadChatData = async () => {
    try {
      console.log(`🔍 Loading chat data for chat ${chatId}`);
      
      // Get chat from database
      const chat = await databaseService.getChat(chatId);
      console.log(`🔍 Chat from database:`, chat);
      
      if (chat) {
        const isGroupChat = Boolean(chat.is_group);
        console.log(`🔍 Is group chat: ${isGroupChat}`);
        
        // Get participants
        const participants = await ParticipantService.fetchParticipantsAsync(chatId);
        console.log(`🔍 Participants:`, participants);
        
        // Determine chat name
        let chatName = 'Unknown Chat';
        let receiverId = '';
        
        if (isGroupChat) {
          chatName = chat.name || chat.group_name || 'Group Chat';
        } else {
          // For direct chats, find the other participant
          const otherParticipant = participants.find(p => p.userId !== currentUserId);
          if (otherParticipant) {
            chatName = otherParticipant.username || otherParticipant.name || 'Unknown User';
            receiverId = otherParticipant.userId;
          }
        }
        
        setChatData({
          chatName,
          isGroupChat,
          receiverId
        });
        
        // Set participant names for group chats
        if (isGroupChat) {
          const names = participants.map(p => p.username || p.name || 'Unknown');
          setParticipantNames(names);
        }
      }
    } catch (error) {
      console.error("Failed to load chat data:", error);
    }
  };

  // Load data on mount and when chatId changes
  useEffect(() => {
    console.log("🚀 ChatScreen: useEffect triggered, chatId:", chatId);
    if (chatId) {
      loadCurrentUser();
      loadChatData();
      loadMessagesFromDatabase();
    }
  }, [chatId, loadMessagesFromDatabase]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !token) return;

    try {
      console.log("📤 Sending message:", newMessage);
      
      // Create message entity
      const messageEntity: MessageEntity = {
        messageId: `temp_${Date.now()}`,
        clientMessageId: `client_${Date.now()}`,
        chatId: chatId,
        senderId: currentUserId,
        content: newMessage,
        timestamp: Date.now(),
        isRead: false,
        isSent: false,
        isDelivered: false,
        isFailed: false,
        senderUsername: user?.username || 'Unknown',
        replyToMessageId: replyTo?.messageId || undefined
      };

      // Add message to local state immediately (optimistic update)
      setMessages(prev => [...prev, messageEntity]);
      setNewMessage('');
      setReplyTo(null);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      // Send message via service
      await messageService.sendMessage(messageEntity);
      
      console.log("✅ Message sent successfully");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      // Remove the optimistic message from state
      setMessages(prev => prev.filter(m => m.client_message_id !== `client_${Date.now()}`));
      setError("Failed to send message");
    }
  };



  // Handle cancel reply
  const handleCancelReply = () => {
    setReplyTo(null);
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group messages by date for display
  const groupMessagesByDate = (messages: MessageEntity[]) => {
    const groups: { [key: string]: MessageEntity[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.background
      }}>
        {/* Header */}
        <div style={{
          padding: "16px",
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.sidebar
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              backgroundColor: theme.primary,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "16px",
              fontWeight: "600"
            }}>
              {chatData.chatName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: theme.text,
                margin: 0
              }}>
                {chatData.chatName}
              </h2>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: wsConnected ? theme.success : theme.error
                }}></div>
                <span style={{
                  fontSize: "12px",
                  color: theme.textSecondary
                }}>
                  {wsConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading content */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px"
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              border: `3px solid ${theme.border}`,
              borderTop: `3px solid ${theme.primary}`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            <span style={{
              fontSize: "14px",
              color: theme.textSecondary
            }}>
              Loading messages...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.background
      }}>
        <div style={{
          padding: "16px",
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.sidebar
        }}>
          <h2 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: theme.text,
            margin: 0
          }}>
            {chatData.chatName}
          </h2>
        </div>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px"
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: theme.error, marginBottom: "16px" }}>{error}</p>
            <button
              onClick={loadMessagesFromDatabase}
              style={{
                padding: "8px 16px",
                backgroundColor: theme.primary,
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: theme.background
    }}>
      {/* Header */}
      <div style={{
        padding: "16px",
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.sidebar
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              backgroundColor: theme.primary,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "16px",
              fontWeight: "600"
            }}>
              {chatData.chatName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: theme.text,
                margin: 0
              }}>
                {chatData.chatName}
              </h2>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: wsConnected ? theme.success : theme.error
                }}></div>
                <span style={{
                  fontSize: "12px",
                  color: theme.textSecondary
                }}>
                  {wsConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Search button */}
          <button
            onClick={() => setIsSearching(!isSearching)}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              backgroundColor: "transparent",
              color: theme.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              transition: "all 0.2s ease"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
        
        {/* Search bar */}
        {isSearching && (
          <div style={{ marginTop: "12px" }}>
            <input
              type="text"
              placeholder="Search messages..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: "14px"
              }}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          backgroundColor: theme.background
        }}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
          setShowScrollToBottom(!isNearBottom);
        }}
      >
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div style={{
              textAlign: "center",
              margin: "16px 0",
              position: "relative"
            }}>
              <div style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: "1px",
                backgroundColor: theme.border,
                zIndex: 1
              }}></div>
              <span style={{
                backgroundColor: theme.background,
                padding: "0 12px",
                fontSize: "12px",
                color: theme.textSecondary,
                position: "relative",
                zIndex: 2
              }}>
                {formatDate(dateMessages[0].timestamp)}
              </span>
            </div>
            
            {/* Messages for this date */}
            {dateMessages.map((message) => {
              const isOwnMessage = message.sender_id === currentUserId;
              const isReply = message.reply_to_message_id;
              
              return (
                <div
                  key={message.client_message_id}
                  style={{
                    display: "flex",
                    justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                    marginBottom: "8px"
                  }}
                >
                  <div style={{
                    maxWidth: "70%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: isOwnMessage ? theme.primary : theme.surface,
                    color: isOwnMessage ? "white" : theme.text,
                    border: isOwnMessage ? "none" : `1px solid ${theme.border}`,
                    position: "relative"
                  }}>
                    {/* Reply indicator */}
                    {isReply && (
                      <div style={{
                        fontSize: "11px",
                        opacity: 0.7,
                        marginBottom: "4px",
                        borderLeft: `2px solid ${isOwnMessage ? "rgba(255,255,255,0.5)" : theme.border}`,
                        paddingLeft: "8px"
                      }}>
                        Replying to a message
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div style={{
                      fontSize: "14px",
                      lineHeight: "1.4",
                      wordBreak: "break-word"
                    }}>
                      {message.content}
                    </div>
                    
                    {/* Message metadata */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "4px",
                      marginTop: "4px",
                      fontSize: "11px",
                      opacity: 0.7
                    }}>
                      <span>{formatTime(message.timestamp)}</span>
                      {isOwnMessage && (
                        <span>
                          {message.is_failed ? "❌" : 
                           message.is_delivered ? "✓✓" : 
                           message.is_sent ? "✓" : "⏳"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div style={{
          padding: "8px 16px",
          backgroundColor: theme.surface,
          borderTop: `1px solid ${theme.border}`,
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{
              fontSize: "12px",
              color: theme.textSecondary
            }}>
              Replying to: {replyTo.content.substring(0, 50)}{replyTo.content.length > 50 ? "..." : ""}
            </div>
            <button
              onClick={handleCancelReply}
              style={{
                background: "none",
                border: "none",
                color: theme.textSecondary,
                cursor: "pointer",
                fontSize: "16px",
                padding: "4px"
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div style={{
        padding: "16px",
        borderTop: `1px solid ${theme.border}`,
        backgroundColor: theme.sidebar
      }}>
        <div style={{
          display: "flex",
          gap: "8px",
          alignItems: "flex-end"
        }}>
          <textarea
            ref={messageInputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            style={{
              flex: 1,
              minHeight: "40px",
              maxHeight: "120px",
              padding: "8px 12px",
              borderRadius: "20px",
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              fontSize: "14px",
              resize: "none",
              outline: "none",
              fontFamily: "inherit"
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !wsConnected}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: newMessage.trim() && wsConnected ? theme.primary : theme.border,
              color: "white",
              cursor: newMessage.trim() && wsConnected ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              transition: "all 0.2s ease"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22,2 15,22 11,13 2,9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          style={{
            position: "absolute",
            bottom: "80px",
            right: "20px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: theme.primary,
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            boxShadow: theme.shadow,
            zIndex: 10
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatScreen;
