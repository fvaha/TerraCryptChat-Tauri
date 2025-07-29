import React, { useState, useEffect, useRef, useCallback } from 'react';
import { databaseService } from './databaseService';
import { nativeApiService } from './nativeApiService';
import { messageService } from './messageService';
import { ParticipantService } from './participantService';
import { MessageEntity } from './models';
import { useAppContext } from './AppContext';
import { useWebSocketHandler } from './useWebSocketHandler';
import { websocketService } from './websocketService';
import './ChatScreen.css';

interface ChatScreenProps {
  chatId: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId }) => {
  console.log("🚀 ChatScreen: Component rendering with chatId:", chatId);
  
  const { token, user } = useAppContext();
  const [messages, setMessages] = useState<MessageEntity[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<MessageEntity | null>(null);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
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
      console.error('Failed to load messages from database:', error);
      setError('Failed to load messages. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  // Set up WebSocket handler for incoming messages
  useWebSocketHandler((message: MessageEntity) => {
    if (message.chatId === chatId) {
      console.log(`Received new message for chat ${chatId}:`, message);
      // Add the new message to the current state
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, message];
        // Sort by timestamp to maintain chronological order
        return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
      });
      // Scroll to bottom after adding new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  });

  // Set up message flow callback
  useEffect(() => {
    console.log("🚀 ChatScreen: Setting up message flow callback");
    
    const handleNewMessage = (message: MessageEntity) => {
      console.log("🚀 ChatScreen: New message received:", message);
      console.log("🚀 ChatScreen: Message chat ID:", message.chatId);
      console.log("🚀 ChatScreen: Current chat ID:", chatId);
      
      // Only add messages for the current chat
      if (message.chatId === chatId) {
        console.log("🚀 ChatScreen: Adding message to current chat");
        setMessages(prevMessages => {
          // Check if message already exists (by client message ID or server message ID)
          const exists = prevMessages.some(m => 
            m.clientMessageId === message.clientMessageId || 
            (message.messageId && m.messageId === message.messageId)
          );
          
          if (exists) {
            console.log("🚀 ChatScreen: Message already exists, updating instead");
            return prevMessages.map(m => 
              (m.clientMessageId === message.clientMessageId || 
               (message.messageId && m.messageId === message.messageId)) 
                ? message 
                : m
            ).sort((a, b) => a.timestamp - b.timestamp);
          } else {
            console.log("🚀 ChatScreen: Adding new message to list");
            const updatedMessages = [...prevMessages, message];
            return updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
          }
        });
        
        // Scroll to bottom after a short delay to ensure the message is rendered
        setTimeout(() => { scrollToBottom(); }, 100);
      } else {
        console.log("🚀 ChatScreen: Message is for different chat, ignoring");
      }
    };

    messageService.setMessageFlow(handleNewMessage);
    
    return () => {
      console.log("🚀 ChatScreen: Cleaning up message flow callback");
      messageService.setMessageFlow(undefined as any);
    };
  }, [chatId]);

  // Load messages on component mount
  useEffect(() => {
    if (chatId) {
      console.log(`🔄 Loading initial messages for chat ${chatId}`);
      loadMessagesFromDatabase();
    } else {
      console.log(`🔄 No chatId provided, skipping initial message load`);
    }
  }, [chatId, loadMessagesFromDatabase]);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await databaseService.getMostRecentUser();
        if (user) {
          setCurrentUserId(user.user_id);
        }
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load chat data and participants
  useEffect(() => {
    const loadChatData = async () => {
      if (!token || !user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        console.log(`🔄 Loading chat data for chat ${chatId}`);

        // Load chat members to get chat info
        try {
          console.log(`🔍 Loading chat members for chat ${chatId}`);
          console.log(`🔍 Current user object:`, user);
          console.log(`🔍 Current user ID:`, user?.userId);
          
          const membersResponse = await nativeApiService.getChatMembers(chatId);
          console.log(`🔍 Members response:`, membersResponse);
          
          if (membersResponse && membersResponse.data && Array.isArray(membersResponse.data)) {
            const validMembers = membersResponse.data.filter(member => 
              member && member.user && member.user.user_id
            );
            
            console.log(`🔍 Valid members:`, validMembers);
            console.log(`🔍 Valid members user IDs:`, validMembers.map(m => m.user.user_id));
            console.log(`🔍 Current user ID:`, user?.userId);
            
            const otherMember = validMembers.find(member => member.user.user_id !== user?.userId);
            console.log(`🔍 Other member:`, otherMember);
            console.log(`🔍 Other member username:`, otherMember?.user?.username);
            console.log(`🔍 Other member name:`, otherMember?.user?.name);
            
            const isGroup = validMembers.length > 2;
            
            const chatName = isGroup 
              ? `Group Chat (${validMembers.length} members)`
              : (otherMember?.user.username || otherMember?.user.name || "Unknown");

            console.log(`✅ Setting chat name to: ${chatName}`);

            setChatData({
              chatName,
              isGroupChat: isGroup,
              receiverId: otherMember?.user.user_id || ""
            });

            // Set participant names
            const names = validMembers.map(m => m.user.username).sort();
            setParticipantNames(names);
            console.log(`✅ Set participant names:`, names);
          } else {
            console.warn(`⚠️ Invalid members response for chat ${chatId}:`, membersResponse);
            throw new Error('Invalid members response');
          }
        } catch (participantError) {
          console.warn('Failed to load chat members, using fallback:', participantError);
          console.error('Participant error details:', participantError);
          setChatData({
            chatName: `Chat ${chatId.slice(0, 8)}`,
            isGroupChat: false,
            receiverId: ""
          });
          setParticipantNames([]);
        }

        // Load messages from database
        try {
          await loadMessagesFromDatabase();
          // Mark messages as read
          await messageService.markMessagesAsRead(chatId);
        } catch (dbError) {
          console.warn('Failed to load messages from database, continuing with empty messages:', dbError);
          setMessages([]);
        }
        
        setIsLoading(false);
        console.log(`✅ Finished loading chat data for chat ${chatId}`);
      } catch (error) {
        console.error('Failed to load chat data:', error);
        setError('Failed to load chat data');
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [chatId, token, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle scroll to show/hide scroll to bottom button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    }
  }, []);

  // Send message
  const handleSendMessage = async () => {
    console.log("=== handleSendMessage called ===");
    console.log("Function execution started");
    console.log("newMessage:", newMessage);
    console.log("newMessage.trim():", newMessage.trim());
    console.log("token exists:", !!token);
    console.log("chatId:", chatId);
    
    if (!newMessage.trim()) {
      console.log("ChatScreen: Cannot send message - empty message");
      return;
    }
    
    if (!token) {
      console.log("ChatScreen: Cannot send message - no token");
      setError('No authentication token available');
      return;
    }

    // Re-enable WebSocket connection check
    if (!wsConnected) {
      console.log("ChatScreen: Cannot send message - WebSocket not connected");
      setError('Not connected to server. Please check your connection.');
      return;
    }

    try {
      // Store the message text before clearing
      const messageText = newMessage.trim();
      
      console.log(`ChatScreen: Sending message: "${messageText}" to chat ${chatId}`);

      // Clear input immediately for better UX
      setNewMessage('');
      setReplyTo(null);
      
      // Send message via message service (it will handle UI updates through message flow)
      console.log("Calling messageService.sendMessage...");
      const result = await messageService.sendMessage(messageText, chatId);
      console.log("messageService.sendMessage result:", result);
      
      // Focus back to input
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 0);

      console.log("ChatScreen: Message sent successfully");
      
    } catch (error) {
      console.error('ChatScreen: Failed to send message:', error);
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Restore the message text if sending failed
      setNewMessage(newMessage);
      setError('Failed to send message. Please try again.');
    }
  };



  // Handle reply to message
  const handleReply = (message: MessageEntity) => {
    setReplyTo(message);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyTo(null);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShowScrollToBottom(false);
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: MessageEntity[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: MessageEntity[] } = {};

    messages.forEach(message => {
      const messageDate = new Date(message.timestamp);
      let dateLabel = '';

      if (messageDate.toDateString() === today.toDateString()) {
        dateLabel = 'Today';
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Yesterday';
      } else {
        dateLabel = messageDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }

      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(message);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => {
        const dateA = a === 'Today' ? today : a === 'Yesterday' ? yesterday : new Date(a);
        const dateB = b === 'Today' ? today : b === 'Yesterday' ? yesterday : new Date(b);
        return dateA.getTime() - dateB.getTime(); // Sort chronologically (oldest first)
      })
      .map(([date, msgs]) => ({
        date,
        messages: msgs.sort((a, b) => a.timestamp - b.timestamp) // Sort messages chronologically within each group
      }));
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (isLoading) {
    return (
      <div className="chat-screen">
        <div className="chat-header">
          <div className="chat-title">
            <div className="chat-name">{chatData.chatName}</div>
            {chatData.isGroupChat && participantNames.length > 0 && (
              <div className="participant-names">
                {participantNames.join(', ')}
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSearching(!isSearching)} 
            className="search-button"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid #404040",
              backgroundColor: "transparent",
              color: "#9ca3af",
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
        <div className="loading">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-screen">
        <div className="chat-header">
          <div className="chat-title">{chatData.chatName}</div>
        </div>
        <div className="error" style={{
          padding: '20px',
          textAlign: 'center',
          color: '#ef4444'
        }}>
          <div style={{ marginBottom: '10px' }}>{error}</div>
          <button 
            onClick={() => {
              setError(null);
              loadMessagesFromDatabase();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #404040',
              backgroundColor: '#007bff',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-screen">

      
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-title">
          <div className="chat-name">{chatData.chatName}</div>
          {chatData.isGroupChat && participantNames.length > 0 && (
            <div className="participant-names">
              {participantNames.join(', ')}
            </div>
          )}
          <div className="connection-status" style={{
            fontSize: '12px',
            color: wsConnected ? '#4ade80' : '#ef4444',
            marginTop: '4px'
          }}>
            {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
        <button 
          onClick={() => setIsSearching(!isSearching)} 
          className="search-button"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            border: "1px solid #404040",
            backgroundColor: "transparent",
            color: "#9ca3af",
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



      {/* Search Bar */}
      {isSearching && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {/* Debug Info */}
      <div style={{
        padding: '8px',
        fontSize: '12px',
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #333',
        color: '#888'
      }}>
        <div>Messages: {messages.length}</div>
        <div>WS Connected: {wsConnected ? 'Yes' : 'No'}</div>
        <div>Current User: {currentUserId}</div>
        <div>Chat ID: {chatId}</div>
      </div>

      {/* Messages Container */}
      <div 
        className="messages-container"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {groupedMessages.map(({ date, messages: dateMessages }) => (
          <div key={date} className="message-group">
            <div className="date-separator">{date}</div>
            {dateMessages.map((message) => (
              <div
                key={message.clientMessageId}
                className={`message ${message.senderId === currentUserId ? 'own' : 'other'}`}
              >
                <div className="message-content">
                  {message.senderId !== currentUserId && (
                    <div className="sender-name">{ParticipantService.getSenderName(message.senderId, chatId)}</div>
                  )}
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {message.isFailed && (
                    <div className="message-status failed">Failed</div>
                  )}
                  {message.isSent && !message.isDelivered && (
                    <div className="message-status sent">Sent</div>
                  )}
                  {message.isDelivered && !message.isRead && (
                    <div className="message-status delivered">Delivered</div>
                  )}
                  {message.isRead && (
                    <div className="message-status read">Read</div>
                  )}
                </div>
                  <button
                  onClick={() => handleReply(message)}
                  className="reply-button"
                >
                  Reply
                  </button>
              </div>
            ))}
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-content">
            <div className="reply-sender">{ParticipantService.getSenderName(replyTo.senderId, chatId)}</div>
            <div className="reply-text">{replyTo.content}</div>
          </div>
          <button onClick={handleCancelReply} className="cancel-reply"
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              border: "1px solid #404040",
              backgroundColor: "transparent",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px",
              transition: "all 0.2s ease"
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="message-input-container" style={{ position: 'relative', zIndex: 1000 }}>
        <div className="message-input-wrapper" style={{ position: 'relative', zIndex: 1001 }}>
          <textarea
            ref={messageInputRef}
          value={newMessage}
          onChange={(e) => {
            console.log("=== INPUT ONCHANGE ===");
            console.log("Input value:", e.target.value);
            console.log("Input value length:", e.target.value.length);
            console.log("Input value trimmed:", e.target.value.trim());
            setNewMessage(e.target.value);
            console.log("State updated, newMessage should be:", e.target.value);
          }}
            onKeyPress={(e) => {
              console.log("Input onKeyPress:", e.key, "Shift:", e.shiftKey);
              if (e.key === 'Enter' && !e.shiftKey) {
                console.log("Enter pressed, calling handleSendMessage");
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="message-input"
            rows={1}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontSize: '14px',
              resize: 'none',
              outline: 'none'
            }}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
        />
        <button
            onClick={() => {
              console.log("=== SEND BUTTON CLICKED ===");
              console.log("newMessage:", newMessage);
              console.log("newMessage.trim():", newMessage.trim());
              console.log("Button disabled:", !newMessage.trim());
              try {
                handleSendMessage();
                console.log("handleSendMessage called successfully");
              } catch (error) {
                console.error("Error calling handleSendMessage:", error);
              }
            }}
            disabled={!newMessage.trim()}
            className="send-button"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #404040',
              backgroundColor: newMessage.trim() ? '#007bff' : '#2a2a2a',
              color: newMessage.trim() ? '#ffffff' : '#666666',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              minWidth: '60px',
              zIndex: 1000
            }}
          >
            Send
          </button>

        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <button 
          onClick={scrollToBottom}
          className="scroll-to-bottom"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid #404040",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "16px",
            transition: "all 0.2s ease",
            position: "fixed",
            bottom: "80px",
            right: "20px",
            zIndex: 1000
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
