import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Debounce utility function - commented out as unused
// function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
//   let timeout: ReturnType<typeof setTimeout>;
//   return ((...args: any[]) => {
//     clearTimeout(timeout);
//     timeout = setTimeout(() => func(...args), wait);
//   }) as T;
// }

import { databaseServiceAsync, Message as MessageEntity } from '../services/databaseServiceAsync';
import { messageService } from '../services/messageService';
import ChatMessageRow from './ChatMessageRow';

import { useTheme } from '../components/ThemeContext';
import { sessionManager } from '../utils/sessionManager';
import { normalizeTimestamp, getRelativeDateLabel, formatDateSeparator } from '../utils/timestampUtils';

interface ChatScreenProps {
  chatId: string;
}

interface ChatData {
  chatName: string;
  isGroupChat: boolean;
  receiverId: string;
  participantNames: string[];
}

interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  hover: string;
  sidebar: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId }) => {
  console.log(" ChatScreen: Component rendering with chatId:", chatId);
  
  const { theme } = useTheme();
  
  // State management following Kotlin patterns
  const [rawMessages, setRawMessages] = useState<MessageEntity[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<MessageEntity | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [chatData, setChatData] = useState<ChatData>({
    chatName: 'Loading...',
    isGroupChat: false,
    receiverId: '',
    participantNames: []
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const isLoadingOlderMessages = useRef(false);

  // Pastel colors for user avatars (following Kotlin pattern) - commented out as unused
  // const pastelColors = [
  //   '#667C73', '#6D99AD', '#7687B3', '#998C61',
  //   '#8C80B7', '#949494', '#709E70', '#6D917D',
  //   '#948A66', '#66A6BF', '#999969', '#6B9994', '#80A68C'
  // ];

  // Simple hashCode function for string - commented out as unused
  // const hashCode = (str: string): number => {
  //   let hash = 0;
  //   for (let i = 0; i < str.length; i++) {
  //     const char = str.charCodeAt(i);
  //     hash = ((hash << 5) - hash) + char;
  //     hash = hash & hash; // Convert to 32-bit integer
  //   }
  //   return Math.abs(hash);
  // };



  // Load current user
  const loadCurrentUser = useCallback(async () => {
    try {
      const currentUser = await sessionManager.getCurrentUser();
      if (currentUser) {
        setCurrentUserId(currentUser.user_id);
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  }, []);

  // Load chat data with optimized naming
  const loadChatData = useCallback(async () => {
    try {
      console.log(` Loading chat data for chat ${chatId}`);
      
      const chat = await databaseServiceAsync.getChatById(chatId);
      console.log(` Chat from database:`, chat);
      
      if (chat) {
        const isGroupChat = Boolean(chat.is_group);
        console.log(` Is group chat: ${isGroupChat}`);
        
        // Use the chat name from database (which should be properly set)
        let chatName = chat.name;
        
        // If no chat name is set, try to get it from participants
        if (!chatName || chatName === 'Unknown Chat') {
          if (isGroupChat) {
            chatName = 'Group Chat';
          } else {
            // For direct chats, try to get the other participant's name
            const participants = chat.participants ? JSON.parse(chat.participants) : [];
            if (participants.length > 0 && currentUserId) {
              const otherParticipant = participants.find((p: string) => p !== currentUserId);
              if (otherParticipant) {
                // Try to get the username from the participant data
                if (typeof otherParticipant === 'object' && otherParticipant.username) {
                  chatName = otherParticipant.username;
                } else if (typeof otherParticipant === 'string') {
                  chatName = otherParticipant;
                } else {
                  chatName = 'Direct Chat';
                }
              }
            }
          }
        }
        
        // Fallback if still no name
        if (!chatName || chatName === 'Unknown Chat') {
          chatName = isGroupChat ? 'Group Chat' : 'Direct Chat';
        }
        
        let receiverId = '';
        let participantNames: string[] = [];
        
        if (isGroupChat) {
          // For group chats, use the stored name
          participantNames = chat.participants ? JSON.parse(chat.participants) : [];
        } else {
          // For direct chats, the name should already be set to the other participant's name
          // Just extract receiver ID if needed
          if (currentUserId) {
            // Try to get the other participant's ID from the chat name or participants
            const participants = chat.participants ? JSON.parse(chat.participants) : [];
                         const otherParticipant = participants.find((p: string) => p !== currentUserId);
            if (otherParticipant) {
              receiverId = otherParticipant;
            }
          }
        }
        
        setChatData({
          chatName,
          isGroupChat,
          receiverId,
          participantNames
        });
      } else {
        console.warn(` No chat found for ID: ${chatId}`);
        setChatData({
          chatName: 'Chat Not Found',
          isGroupChat: false,
          receiverId: '',
          participantNames: []
        });
      }
    } catch (error) {
      console.error("Failed to load chat data:", error);
      setChatData({
        chatName: 'Error Loading Chat',
        isGroupChat: false,
        receiverId: '',
        participantNames: []
      });
    }
  }, [chatId, currentUserId]);

  // Load messages for this chat in background task
  const loadMessages = useCallback(async () => {
    try {
      console.log(` Loading messages for chat ${chatId} from database...`);
      
      // Load messages from database only (messages come via WebSocket)
      const cachedMessages = await messageService.fetchMessages(chatId, 100);
      console.log(` Found ${cachedMessages.length} messages in database`);
      
      // Set raw messages directly
      setRawMessages(cachedMessages);
      
      console.log(` Loaded ${cachedMessages.length} messages for chat ${chatId}`);
    } catch (error) {
      console.error(` Failed to load messages for chat ${chatId}:`, error);
      setError("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || rawMessages.length === 0) return;
    
    try {
      setIsLoadingMore(true);
      const oldestMessage = rawMessages[0];
      const olderMessages = await messageService.fetchOldMessages(chatId, oldestMessage.timestamp);
      
      if (olderMessages.length > 0) {
        setRawMessages(prev => {
          const combined = [...olderMessages, ...prev];
          const sorted = combined.sort((a, b) => a.timestamp - b.timestamp);
          return sorted;
        });
      } else {
        // No more messages to load
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, isLoadingMore, hasMoreMessages, rawMessages]);

  // Handle new message from WebSocket
  const handleNewMessage = useCallback((newMessage: MessageEntity) => {
    console.log("  handleNewMessage called with:", newMessage.client_message_id || newMessage.message_id);
    console.log(" Message content:", newMessage.content?.substring(0, 50) + "...");
    console.log(" Message status - is_delivered:", newMessage.is_delivered, "is_sent:", newMessage.is_sent);
    
    setRawMessages(prev => {
      console.log(" Previous messages count:", prev.length);
      
      // Check if this is an update to an existing message (same ID but different status)
      const existingMessageIndex = prev.findIndex(msg => 
        (msg.message_id && msg.message_id === newMessage.message_id) ||
        (msg.client_message_id && msg.client_message_id === newMessage.client_message_id)
      );
      
      if (existingMessageIndex !== -1) {
        // Update existing message
        console.log("  Updating existing message:", newMessage.client_message_id || newMessage.message_id);
        console.log(" Old message status - is_delivered:", prev[existingMessageIndex].is_delivered, "is_sent:", prev[existingMessageIndex].is_sent);
        console.log(" New message status - is_delivered:", newMessage.is_delivered, "is_sent:", newMessage.is_sent);
        const updatedMessages = [...prev];
        updatedMessages[existingMessageIndex] = newMessage;
        return updatedMessages;
      } else {
        // Add new message
        console.log("  Adding new message:", newMessage.client_message_id || newMessage.message_id);
        const newMessages = [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp);
        console.log("  New count:", newMessages.length);
        return newMessages;
      }
    });
  }, []);



  // Initialize data when chatId changes
  const initializeData = useCallback(async () => {
    console.log(` Initializing data for chat ${chatId}`);
    setIsLoading(true);
    setError(null);
    
    try {
      await loadCurrentUser();
      await loadChatData();
      await loadMessages();
      
      // Mark messages as read when opening chat
      await messageService.markAllMessagesAsRead(chatId);
      
      // Connect to MessageService flow for real-time updates
      console.log(` Setting up message flow for chat: ${chatId}`);
      

      
      const messageFlowCallback = (message: MessageEntity) => {
        console.log("  Received message from MessageService flow:", message);
        console.log(" Message status - is_delivered:", message.is_delivered, "is_sent:", message.is_sent);
        console.log(" Current chat ID:", chatId);
        console.log(" Message chat ID:", message.chat_id);
        console.log(" Message content:", message.content?.substring(0, 50) + "...");
        
        // Only add messages for current chat
        if (message.chat_id === chatId) {
          console.log("  Adding message to current chat:", message.client_message_id || message.message_id);
          handleNewMessage(message);
        } else {
          console.log("  Skipping message for different chat:", message.chat_id, "current chat:", chatId);
        }
      };
      
      console.log("  Setting up message flow callback for chat:", chatId);
      messageService.setMessageFlow(messageFlowCallback);
      console.log("  Message flow callback set successfully");
      
      
    } catch (error) {
      console.error("Failed to initialize chat data:", error);
      setError("Failed to load chat data");
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  // Message service handles all WebSocket messages automatically
  // No need for separate WebSocket handler

  // Initialize when chatId changes
  useEffect(() => {
    initializeData();
    
    // Cleanup function to disconnect from MessageService flow
    return () => {
      console.log(`  Cleaning up message flow for chat: ${chatId}`);
      messageService.setMessageFlow(null);
      console.log(`  Message flow cleaned up for chat: ${chatId}`);
    };
  }, [chatId]);

  // Scroll to bottom when messages are loaded
  useEffect(() => {
    if (rawMessages.length > 0 && !isLoading) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
      }, 100);
    }
  }, [rawMessages.length, isLoading]);

  // Prepare messages for display - extract reply information from content
  const prepareMessagesForDisplay = useCallback((messages: MessageEntity[]) => {
    return messages.map(message => {
      // Check if message content contains reply information in format: ⟪username⟫: content\nnew message
      const replyRegex = /⟪(.+?)⟫: (.+)\n/;
      const match = message.content.match(replyRegex);
      
      if (match) {
        const [, replyToUsername, replyToContent] = match;
        // Extract the actual message content (everything after the reply info)
        const actualContent = message.content.replace(replyRegex, '');
        
        return {
          ...message,
          content: actualContent,
          reply_to_username: replyToUsername,
          reply_to_content: replyToContent
        };
      }
      
      return message;
    });
  }, []);

  // Prepare messages for display
  const preparedMessages = useMemo(() => {
    return prepareMessagesForDisplay(rawMessages);
  }, [rawMessages, prepareMessagesForDisplay]);

  // Group messages by date (following Kotlin pattern)
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: MessageEntity[] } = {};
    
    preparedMessages.forEach(message => {
      const normalizedTimestamp = normalizeTimestamp(message.timestamp);
      const date = new Date(normalizedTimestamp);
      const dateKey = date.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages: messages.sort((a, b) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp))
    }));
  }, [preparedMessages]);

  // Format time function (matching Kotlin format)
  const formatTime = useCallback((timestamp: number) => {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    const date = new Date(normalizedTimestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  // Format date function
  const formatDate = useCallback((timestamp: number) => {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    return getRelativeDateLabel(normalizedTimestamp);
  }, []);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Show scroll to bottom button when scrolled up
    setShowScrollToBottom(scrollTop < scrollHeight - clientHeight - 100);
  }, []);

  // Throttled mark as read function - commented out as unused
  // const markMessagesAsRead = useCallback(async () => {
  //   try {
  //     await messageService.markAllMessagesAsRead(chatId);
  //     setRawMessages(prev => {
  //       const updated = prev.map(msg =>
  //         msg.chat_id === chatId && msg.sender_id !== currentUserId
  //           ? { ...msg, is_read: true }
  //           : msg
  //       );
  //       return updated;
  //     });
  //   } catch (error) {
  //     console.error("Failed to mark messages as read:", error);
  //   }
  // }, [chatId, currentUserId]);



  // Handle reply to message
  const handleReply = useCallback((message: MessageEntity) => {
    setReplyTo(message);
    messageInputRef.current?.focus();
  }, []);

  // Handle resend message
  const handleResend = useCallback(async (message: MessageEntity) => {
    try {
      // For now, just send the message again
      await messageService.sendMessage(message.content, message.chat_id, message.reply_to_message_id);
    } catch (error) {
      console.error("Failed to resend message:", error);
    }
  }, []);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !currentUserId) return;
    
    console.log(` Sending message: "${newMessage}" to chat: ${chatId}`);
    
    try {
      let messageToSend = newMessage;
      let replyToMessageId = undefined;
      let replyToUsername = undefined;
      let replyToContent = undefined;
      
      if (replyTo) {
        // For one-on-one chats, use the chat name (which is the other participant's name)
        // For group chats, use the sender's username from the message being replied to
        if (chatData.isGroupChat) {
          replyToUsername = replyTo.sender_username || 'Unknown';
        } else {
          // In one-on-one chats, the chat name is the other participant's name
          replyToUsername = chatData.chatName;
        }
        replyToContent = replyTo.content;
        replyToMessageId = replyTo.message_id;
        
        // Format the message with reply information
        messageToSend = `⟪${replyToUsername}⟫: ${replyToContent}\n${newMessage}`;
      }
      
      console.log(` Calling messageService.sendMessage with: content="${messageToSend}", chatId="${chatId}"`);
      await messageService.sendMessage(messageToSend, chatId, replyToMessageId);
      console.log(` Message sent successfully`);
      setNewMessage('');
      setReplyTo(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [newMessage, chatId, currentUserId, replyTo, chatData]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        backgroundColor: theme.background,
        color: theme.text
      }}>
        Loading chat...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        backgroundColor: theme.background,
        color: theme.text
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: theme.background
    }}>
      {/* Header */}
      <ChatScreenHeader
        chatData={chatData}
        isSearching={isSearching}
        setIsSearching={setIsSearching}
        searchText=""
        setSearchText={() => {}}
        theme={theme}
      />

             {/* Messages */}
       <ChatScreenMessages
         groupedMessages={groupedMessages}
         currentUserId={currentUserId}
         chatData={chatData}
         theme={theme}
         onReply={handleReply}
         onResend={handleResend}
         onScroll={handleScroll}
         messagesEndRef={messagesEndRef}
         messagesContainerRef={messagesContainerRef}
         formatTime={formatTime}
         formatDate={formatDate}
         onLoadMore={loadOlderMessages}
         hasMoreMessages={hasMoreMessages}
         isLoadingMore={isLoadingMore}
       />

             {/* Reply view */}
       {replyTo && (
         <ChatScreenReplyView
           replyTo={replyTo}
           onCancel={() => setReplyTo(null)}
           theme={theme}
           chatData={chatData}
         />
       )}

      {/* Input */}
      <ChatScreenInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSend={handleSend}
        theme={theme}
        messageInputRef={messageInputRef}
      />

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
            backgroundColor: theme.primary,
            color: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
          }}
        >
          ↓
        </button>
      )}
    </div>
  );
};

// ChatScreenHeader Component
const ChatScreenHeader: React.FC<{
  chatData: ChatData;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  theme: Theme;
}> = ({ chatData, isSearching, setIsSearching, theme }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: `1px solid ${theme.border}`,
    backgroundColor: theme.surface,
    height: "56px"
  }}>
    <div style={{
      display: "flex",
      alignItems: "center",
      flex: 1
    }}>
      <div style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        backgroundColor: theme.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "16px",
        fontWeight: "bold",
        marginRight: "12px"
      }}>
        {chatData.chatName.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style={{
          fontSize: "16px",
          fontWeight: "600",
          color: theme.text
        }}>
          {chatData.chatName}
        </div>
        <div style={{
          fontSize: "12px",
          color: theme.textSecondary
        }}>
          {chatData.isGroupChat ? `${chatData.participantNames.length} participants` : "Direct message"}
        </div>
      </div>
    </div>
    
    <div style={{
      display: "flex",
      gap: "8px"
    }}>
      <button
        onClick={() => setIsSearching(!isSearching)}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          border: `1px solid ${theme.border}`,
          backgroundColor: isSearching ? theme.primary : "transparent",
          color: isSearching ? "white" : theme.textSecondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "16px",
          transition: "all 0.2s ease"
        }}
        title="Search"
        onMouseEnter={(e) => {
          if (!isSearching) {
            e.currentTarget.style.backgroundColor = theme.hover;
            e.currentTarget.style.borderColor = theme.primary;
            e.currentTarget.style.color = theme.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSearching) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.color = theme.textSecondary;
          }
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
    </div>
  </div>
);

// ChatScreenMessages Component
const ChatScreenMessages: React.FC<{
  groupedMessages: { date: string; messages: MessageEntity[] }[];
  currentUserId: string;
  chatData: ChatData;
  theme: Theme;
  onReply: (message: MessageEntity) => void;
  onResend: (message: MessageEntity) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  formatTime: (timestamp: number) => string;
  formatDate: (timestamp: number) => string;
  onLoadMore: () => void;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
}> = ({ groupedMessages, currentUserId, chatData, theme, onReply, onResend, onScroll, messagesEndRef, messagesContainerRef, formatTime, onLoadMore, hasMoreMessages, isLoadingMore }) => {
  console.log(" ChatScreenMessages rendering with:", {
    groupedMessagesCount: groupedMessages.length,
    currentUserId,
    chatData
  });
  
  return (
    <div 
      ref={messagesContainerRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        backgroundColor: theme.background
      }}
      onScroll={onScroll}
    >
      {/* Load More Messages Button */}
      {hasMoreMessages && (
        <div style={{
          textAlign: "center",
          margin: "16px 0",
          padding: "12px"
        }}>
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            style={{
              padding: "8px 16px",
              backgroundColor: isLoadingMore ? theme.border : theme.primary,
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: isLoadingMore ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              opacity: isLoadingMore ? 0.7 : 1,
              transition: "all 0.2s ease"
            }}
          >
            {isLoadingMore ? "Loading..." : "Load More Messages"}
          </button>
        </div>
      )}
      
      {groupedMessages.map(({ date, messages }) => (
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
               {formatDateSeparator(normalizeTimestamp(messages[0].timestamp))}
             </span>
          </div>
          
                     {/* Messages for this date */}
           {messages.map((message, index) => {
             const isOwnMessage = message.sender_id === currentUserId;
             const isFirstInGroup = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
             
             return (
               <ChatMessageRow
                 key={message.client_message_id || message.message_id || index}
                 message={message}
                 isGroupChat={chatData.isGroupChat}
                 isCurrentUser={isOwnMessage}
                 isFirstInGroup={isFirstInGroup}
                 onReply={onReply}
                 onResend={onResend}
                 onScrollToMessage={(messageId) => {
                   // Handle scroll to message logic
                   console.log("Scroll to message:", messageId);
                 }}
                 formatTime={formatTime}
                 theme={theme}
               />
             );
           })}
        </div>
      ))}
      
      {/* Invisible element for auto-scroll */}
      <div ref={messagesEndRef} />
    </div>
  );
};

// ChatScreenReplyView Component
const ChatScreenReplyView: React.FC<{
  replyTo: MessageEntity;
  onCancel: () => void;
  theme: Theme;
  chatData: ChatData;
}> = ({ replyTo, onCancel, theme, chatData }) => (
  <div style={{
    padding: "8px 16px",
    backgroundColor: theme.surface,
    borderTop: `1px solid ${theme.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  }}>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: "12px",
        color: theme.textSecondary,
        marginBottom: "2px"
      }}>
        Replying to {chatData.isGroupChat ? (replyTo.sender_username || 'Unknown') : chatData.chatName}
      </div>
      <div style={{
        fontSize: "14px",
        color: theme.text,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}>
        {replyTo.content}
      </div>
    </div>
    <button
      onClick={onCancel}
      style={{
        background: "none",
        border: "none",
        color: theme.textSecondary,
        cursor: "pointer",
        padding: "4px",
        marginLeft: "8px"
      }}
    >
      
    </button>
  </div>
);

// ChatScreenInput Component
const ChatScreenInput: React.FC<{
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSend: () => void;
  theme: Theme;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
}> = ({ newMessage, setNewMessage, onSend, theme, messageInputRef }) => (
  <div style={{
    padding: "8px 12px",
    backgroundColor: theme.surface,
    borderTop: `1px solid ${theme.border}`
  }}>
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px"
    }}>
      <textarea
        ref={messageInputRef}
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="Type a message..."
        style={{
          flex: 1,
          minHeight: "32px",
          maxHeight: "80px",
          padding: "6px 10px",
          borderRadius: "12px",
          border: `1px solid ${theme.border}`,
          backgroundColor: theme.background,
          color: theme.text,
          fontSize: "12px",
          resize: "none",
          outline: "none",
          fontFamily: "inherit"
        }}
      />
      <button
        onClick={onSend}
        disabled={!newMessage.trim()}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          backgroundColor: newMessage.trim() ? theme.primary : theme.border,
          color: "white",
          border: "none",
          cursor: newMessage.trim() ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px"
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 2-7 20-4-9-9-4 20-7z"/>
          <path d="M22 2 11 13"/>
        </svg>
      </button>
    </div>
  </div>
);

export default ChatScreen; 