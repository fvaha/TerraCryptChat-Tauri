import React, { useState, useEffect, useRef, useCallback } from 'react';
import { databaseService } from './databaseService';
import { nativeApiService } from './nativeApiService';
import { messageService } from './messageService';
import { participantService } from './participantService';
import { MessageEntity } from './models';
import { useAppContext } from './AppContext';
import './ChatScreen.css';

interface ChatScreenProps {
  chatId: string;
}

interface ChatMember {
  user: {
    user_id: string;
    username: string;
    name: string;
    email: string;
    picture?: string;
  };
  is_admin: boolean;
  joined_at: string;
}

interface ChatMemberResponse {
  data: ChatMember[];
  limit: number;
  offset: number;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId }) => {
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

  // Load current user and set up message flow
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

    // Set up message flow for incoming messages
    messageService.setMessageFlow((message: MessageEntity) => {
      if (message.chatId === chatId) {
        console.log(`📨 Received new message for chat ${chatId}:`, message);
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m.clientMessageId === message.clientMessageId);
          if (exists) {
            console.log(`📨 Message already exists, skipping:`, message.clientMessageId);
            return prev;
          }
          console.log(`📨 Adding new message to state:`, message.clientMessageId);
          return [message, ...prev];
        });
      }
    });

    return () => {
      messageService.setMessageFlow(() => {});
    };
  }, [chatId]);

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
          const membersResponse = await nativeApiService.getChatMembers(chatId);
          console.log(`🔍 Members response:`, membersResponse);
          
          if (membersResponse && membersResponse.data && Array.isArray(membersResponse.data)) {
            const validMembers = membersResponse.data.filter(member => 
              member && member.user && member.user.user_id
            );
            
            console.log(`🔍 Valid members:`, validMembers);
            console.log(`🔍 Current user ID:`, user.userId);
            
            const otherMember = validMembers.find(member => member.user.user_id !== user.userId);
            console.log(`🔍 Other member:`, otherMember);
            
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
          } else {
            console.warn(`⚠️ Invalid members response for chat ${chatId}:`, membersResponse);
            throw new Error('Invalid members response');
          }
        } catch (participantError) {
          console.warn('Failed to load chat members, using fallback:', participantError);
          setChatData({
            chatName: `Chat ${chatId.slice(0, 8)}`,
            isGroupChat: false,
            receiverId: ""
          });
          setParticipantNames([]);
        }

        // Load messages from database
        try {
          console.log(`📨 Loading messages for chat ${chatId}`);
          const messageEntities = await messageService.fetchMessages(chatId, 50);
          console.log(`📨 Loaded ${messageEntities.length} messages:`, messageEntities);
          
          // Sort messages by timestamp (newest first for display)
          const sortedMessages = messageEntities.sort((a, b) => b.timestamp - a.timestamp);
          setMessages(sortedMessages);

          // Mark messages as read
          await messageService.markAllMessagesAsRead(chatId);
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
    if (!newMessage.trim() || !token) return;

    try {
      // Store the message text before clearing
      const messageText = newMessage.trim();
      
      const content = replyTo 
        ? `⟪${participantService.getSenderName(replyTo.senderId, chatId)}⟫: ${replyTo.content}\n${messageText}`
        : messageText;

      // Save message locally first
      const clientMessageId = await messageService.saveMessage(chatId, messageText, currentUserId, Date.now());
      
      // Add to local state immediately
      const newMessageEntity: MessageEntity = {
        id: 0,
        messageId: undefined,
        clientMessageId,
        chatId,
        senderId: currentUserId,
        content: content, // Use the content with reply if present
        timestamp: Date.now(),
        isRead: false,
        isSent: false,
        isDelivered: false,
        isFailed: false,
        senderUsername: "Me",
        replyToMessageId: replyTo?.messageId || undefined
      };

      console.log(`📨 Adding sent message to state:`, newMessageEntity);
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(m => m.clientMessageId === newMessageEntity.clientMessageId);
        if (exists) {
          console.log(`📨 Sent message already exists, skipping:`, newMessageEntity.clientMessageId);
          return prev;
        }
        return [newMessageEntity, ...prev];
      });
      
      // Clear input immediately
      console.log('🧹 Clearing input, current value:', newMessage);
      setNewMessage('');
      setReplyTo(null);
      console.log('🧹 Input cleared');
      
      // Focus back to input
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 0);

             // Send via WebSocket
      const payload = {
        chat_id: chatId,
        message_text: messageText,
        client_message_id: clientMessageId
      };
      await messageService.sendMessage("chat", payload, () => {
        console.log("Message sent successfully");
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
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
        return dateB.getTime() - dateA.getTime();
      })
      .map(([date, msgs]) => ({
        date,
        messages: msgs.sort((a, b) => b.timestamp - a.timestamp)
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
          >
            🔍
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
        <div className="error">
          {error}
          <button onClick={() => window.location.reload()}>Retry</button>
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
        </div>
        <button 
          onClick={() => setIsSearching(!isSearching)} 
          className="search-button"
        >
          🔍
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
                    <div className="sender-name">{participantService.getSenderName(message.senderId, chatId)}</div>
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
            <div className="reply-sender">{participantService.getSenderName(replyTo.senderId, chatId)}</div>
            <div className="reply-text">{replyTo.content}</div>
          </div>
          <button onClick={handleCancelReply} className="cancel-reply">
            ✕
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="message-input-container">
        <div className="message-input-wrapper">
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
            className="message-input"
            rows={1}
        />
        <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="send-button"
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
        >
          ↓
        </button>
      )}
    </div>
  );
};

export default ChatScreen;
