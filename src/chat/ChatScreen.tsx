// THIRD WINDOW: ChatScreen component - displays chat messages in the third window
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '../components/ThemeContext';
import { useThemedStyles } from '../components/useThemedStyles';
import { MessageEntity } from '../models/models';
import { messageService } from '../services/messageService';
import { chatService } from '../services/chatService';
import { participantService } from '../participant/participantService';
import { sessionManager } from '../utils/sessionManager';
import { invoke } from '@tauri-apps/api/core';
import ChatMessageRow from './ChatMessageRow';

// Add CSS for spinner animation
const spinnerStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = spinnerStyles;
  document.head.appendChild(styleElement);
}

interface ChatScreenProps {
  chatId: string;
  onClose?: () => void;
}

interface ChatData {
  chatName: string;
  isGroupChat: boolean;
  receiverId: string;
  participantNames: string[];
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ chatId, onClose }) => {
  const { theme } = useTheme();
  const themedStyles = useThemedStyles();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatIdRef = useRef(chatId);
  const isMountedRef = useRef(true);
  
  // Custom scrollbar styles
  const scrollbarStyles = `
    .chat-messages-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .chat-messages-scrollbar::-webkit-scrollbar-track {
      background: ${theme.background};
    }
    .chat-messages-scrollbar::-webkit-scrollbar-thumb {
      background: ${theme.border};
      border-radius: 4px;
    }
    .chat-messages-scrollbar::-webkit-scrollbar-thumb:hover {
      background: ${theme.textSecondary};
    }
  `;

  // Debug chatId prop and handle chatId changes
  useEffect(() => {
    chatIdRef.current = chatId;
    
    // Reload data when chatId changes
    if (chatId && isMountedRef.current) {
      // Reload messages
      const reloadMessages = async () => {
        try {
          if (messageService.getActiveChatId() !== chatId) {
            return;
          }

          const fetched = await messageService.fetchMessages(chatId, 50);
          
          if (!isMountedRef.current) return;
          
          const hasMore = fetched.length > 0;
          const firstTimestamp = fetched.length > 0 ? fetched[0].timestamp : null;

          if (fetched.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(msg => msg.message_id || msg.client_message_id));
              const uniqueNew = fetched.filter(msg => !existingIds.has(msg.message_id || msg.client_message_id));
              return [...uniqueNew, ...prev];
            });
          }
          
          setHasMoreToLoad(hasMore);
          setLastFetchedTimestamp(firstTimestamp);
          
          setTimeout(() => {
            if (messagesEndRef.current && isMountedRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 50);
          
        } catch (error) {
          if (isMountedRef.current) {
            console.error("[ChatScreen] Failed to reload messages:", error);
          }
        }
      };
      
      // Reload chat data
      const reloadChatData = async () => {
        try {
          setIsLoadingChatData(true);
          const chat = await chatService.getChatById(chatId);
          
          if (!isMountedRef.current) return;
          
          if (chat) {
            const chatData = await resolveChatData(chat, chatId);
            setChatData(chatData);
          } else {
            console.warn("[ChatScreen] No chat found for new chatId:", chatId);
          }
        } catch (error) {
          if (isMountedRef.current) {
            console.error("[ChatScreen] Failed to reload chat data:", error);
          }
        } finally {
          setIsLoadingChatData(false);
        }
      };
      
      reloadMessages();
      reloadChatData();
    }
  }, [chatId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle message flow from MessageService
  const handleMessageFlow = useCallback((message: MessageEntity) => {
    console.log("[ChatScreen] Message flow received:", message);
    console.log("[ChatScreen] Current chatId:", chatId);
    console.log("[ChatScreen] Message chat_id:", message.chat_id);
    console.log("[ChatScreen] Component mounted:", isMountedRef.current);
    
    if (message.chat_id === chatId && isMountedRef.current) {
      console.log("[ChatScreen] Processing message for current chat:", message.content);
      
      setMessages(prevMessages => {
        // Check if message already exists
        const exists = prevMessages.some(msg => 
          msg.message_id === message.message_id || 
          msg.client_message_id === message.client_message_id
        );
        
        if (exists) {
          console.log("[ChatScreen] Message already exists, skipping duplicate");
          return prevMessages;
        }
        
        // Add new message and sort by timestamp
        const newMessages = [...prevMessages, message];
        const sortedMessages = newMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        console.log(`[ChatScreen] Added new message, total count: ${sortedMessages.length}`);
        return sortedMessages;
      });
    }
  }, [chatId]);

  // Set up message flow when component mounts
  useEffect(() => {
    console.log("[ChatScreen] Setting up message flow callback for chatId:", chatId);
    messageService.setMessageFlow(handleMessageFlow);
    return () => {
      console.log("[ChatScreen] Cleaning up message flow callback for chatId:", chatId);
      messageService.setMessageFlow(null);
    };
  }, [chatId, handleMessageFlow]);

  // Set active chat when component mounts
  useEffect(() => {
    messageService.setActiveChat(chatId);
    return () => {
      messageService.setActiveChat(null);
    };
  }, [chatId]);

  // Load initial messages
  useEffect(() => {
    const loadInitialMessages = async () => {
      try {
        const fetched = await messageService.fetchMessages(chatId, 50);
        
        if (!isMountedRef.current) return;
        
        // FIXED: Sort messages by timestamp immediately and ensure proper order
        const sortedMessages = fetched.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`[ChatScreen] Loaded ${sortedMessages.length} messages, sorted by timestamp`);
        
        // Log first and last message timestamps for debugging
        if (sortedMessages.length > 0) {
          console.log(`[ChatScreen] First message timestamp: ${new Date(sortedMessages[0].timestamp)}`);
          console.log(`[ChatScreen] Last message timestamp: ${new Date(sortedMessages[sortedMessages.length - 1].timestamp)}`);
        }
        
        setMessages(sortedMessages);
        setHasMoreToLoad(fetched.length >= 50);
        if (fetched.length > 0) {
          setLastFetchedTimestamp(fetched[0].timestamp);
        }
        
        // Scroll to bottom after messages load
        setTimeout(() => {
          if (messagesEndRef.current && isMountedRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        
      } catch (error) {
        if (isMountedRef.current) {
          console.error("[ChatScreen] Failed to load initial messages:", error);
        }
      }
    };
    
    loadInitialMessages();
  }, []);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await sessionManager.getCurrentUser();
        if (user && isMountedRef.current) {
          setCurrentUserId(user.user_id);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("[ChatScreen] Failed to load current user:", error);
        }
      }
    };
    
    loadCurrentUser();
  }, []);

  // Simplified resolveChatData function using local database only
  const resolveChatData = async (chat: any, chatId: string): Promise<ChatData> => {
    try {
      // If chat already has a name, use it
      if (chat.name && chat.name.trim() !== '') {
        console.log(`[ChatScreen] Chat has name: ${chat.name}`);
        return {
          chatName: chat.name,
          isGroupChat: chat.is_group,
          receiverId: '',
          participantNames: []
        };
      }

      // For direct chats, get participant info from local database
      if (!chat.is_group) {
        console.log(`[ChatScreen] Resolving direct chat name for: ${chatId}`);
        
        try {
          // Get participants from local database (fast path)
          let participants = await participantService.get_participants_for_chat(chatId);
          
          if (participants.length > 0) {
            // Find the other participant (not current user)
            const otherParticipant = participants.find(
              (participant: { user_id: string; username?: string; name?: string }) => 
                participant.user_id !== currentUserId
            );
            
            if (otherParticipant) {
              // Always prioritize username over name, never show user ID
              const chatName = otherParticipant.username || 'Unknown User';
              console.log(`[ChatScreen] Resolved chat name from database: ${chatName}`);
              return {
                chatName: chatName,
                isGroupChat: false,
                receiverId: otherParticipant.user_id,
                participantNames: [chatName]
              };
            }
          }
          
          // If no participants found in database, try friends list as fallback
          try {
            const friends = await invoke<any[]>('db_get_cached_friends_only');
            if (friends && friends.length > 0) {
              const potentialFriend = friends.find(friend => 
                friend.user_id !== currentUserId
              );
              if (potentialFriend) {
                // Always prioritize username over name, never show user ID
                const friendName = potentialFriend.username || 'Unknown User';
                console.log(`[ChatScreen] Resolved chat name from friends: ${friendName}`);
                return {
                  chatName: friendName,
                  isGroupChat: false,
                  receiverId: potentialFriend.user_id,
                  participantNames: [friendName]
                };
              }
            }
          } catch (friendError) {
            console.warn('[ChatScreen] Could not get friends for chat name resolution:', friendError);
          }
        } catch (error) {
          console.warn('[ChatScreen] Error getting participants from database:', error);
        }
      }

      // Final fallback - never show user IDs
      const fallbackName = chat.name || 'Unnamed Chat';
      console.log(`[ChatScreen] Using fallback name: ${fallbackName}`);
      return {
        chatName: fallbackName,
        isGroupChat: chat.is_group,
        receiverId: '',
        participantNames: []
      };
    } catch (error) {
      console.error("[ChatScreen] Error resolving chat data:", error);
      return {
        chatName: chat.name || 'Unnamed Chat',
        isGroupChat: chat.is_group,
        receiverId: '',
        participantNames: []
      };
    }
  };

  // Load chat data
  useEffect(() => {
    const loadChatData = async () => {
      try {
        setIsLoadingChatData(true);
        console.log(`[ChatScreen] Loading chat data for chatId: ${chatId}`);
        const chat = await chatService.getChatById(chatId);
        
        if (!isMountedRef.current) return;
        
        if (chat) {
          console.log(`[ChatScreen] Chat found, resolving data...`);
          const chatData = await resolveChatData(chat, chatId);
          setChatData(chatData);
          console.log(`[ChatScreen] Chat data resolved: ${chatData.chatName}`);
        } else {
          console.warn("[ChatScreen] No chat found for chatId:", chatId);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("[ChatScreen] Failed to load chat data:", error);
        }
      } finally {
        setIsLoadingChatData(false);
      }
    };
    
    loadChatData();
  }, [chatId]);

  // Reload data when chatId changes
  useEffect(() => {
    if (chatId && chatId !== chatIdRef.current) {
      const reloadMessages = async () => {
        try {
          const fetched = await messageService.fetchMessages(chatId, 50);
          
          if (!isMountedRef.current) return;
          
          // FIXED: Sort messages by timestamp immediately
          const sortedMessages = fetched.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(sortedMessages);
          setHasMoreToLoad(fetched.length >= 50);
          if (fetched.length > 0) {
            setLastFetchedTimestamp(fetched[0].timestamp);
          }
          
          setTimeout(() => {
            if (messagesEndRef.current && isMountedRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
          
        } catch (error) {
          if (isMountedRef.current) {
            console.error("[ChatScreen] Failed to reload messages:", error);
          }
        }
      };
      
      const reloadChatData = async () => {
        try {
          setIsLoadingChatData(true);
          const chat = await chatService.getChatById(chatId);
          
          if (!isMountedRef.current) return;
          
          if (chat) {
            const chatData = await resolveChatData(chat, chatId);
            setChatData(chatData);
          } else {
            console.warn("[ChatScreen] No chat found for new chatId:", chatId);
          }
        } catch (error) {
          if (isMountedRef.current) {
            console.error("[ChatScreen] Failed to reload chat data:", error);
          }
        } finally {
          setIsLoadingChatData(false);
        }
      };
      
      reloadMessages();
      reloadChatData();
    }
  }, [chatId]);

  // State
  const [messages, setMessages] = useState<MessageEntity[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreToLoad, setHasMoreToLoad] = useState(false);
  const [lastFetchedTimestamp, setLastFetchedTimestamp] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isLoadingChatData, setIsLoadingChatData] = useState(true);
  const [chatData, setChatData] = useState<ChatData>({
    chatName: 'Loading...',
    isGroupChat: false,
    receiverId: '',
    participantNames: []
  });
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Group messages by date for better organization
  const groupMessagesByDate = useMemo(() => {
    const groups: { date: string; messages: MessageEntity[] }[] = [];
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateString = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      let group = groups.find(g => g.date === dateString);
      if (!group) {
        group = { date: dateString, messages: [] };
        groups.push(group);
      }
      
      group.messages.push(message);
    });
    
    return groups;
  }, [messages]);

  // Scroll handling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const threshold = 100;
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < threshold);
  };

  // Send message - FIXED: Prevent double message emission
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) {
      return;
    }
    
    try {
      // Clear input immediately to prevent double sending
      const messageContent = newMessage;
      setNewMessage('');
      
      const clientMessageId = await messageService.sendMessage(messageContent, chatId);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        if (messagesEndRef.current && isMountedRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (error) {
      console.error("[ChatScreen] Failed to send message:", error);
      // Restore message content if sending failed
      setNewMessage(newMessage);
    }
  };

  // Visible messages for performance
  const visibleMessages = useMemo(() => {
    return messages.slice(-displayCount);
  }, [messages, displayCount]);

  // FIXED: Improved message grouping and sorting
  const daySections = useMemo(() => {
    const grouped: { [key: string]: MessageEntity[] } = {};
    
    visibleMessages.forEach(message => {
      const date = new Date(message.timestamp);
      const dayKey = date.toDateString();
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(message);
    });
    
    // FIXED: Sort days chronologically and messages within each day by timestamp
    const sortedDays = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return dateA - dateB;
    });
    
    return sortedDays.map(day => ({
      day,
      messages: grouped[day].sort((a, b) => a.timestamp - b.timestamp)
    }));
  }, [visibleMessages]);

  // FIXED: Function to refresh messages from database to show updated status
  const refreshMessagesFromDatabase = useCallback(async () => {
    try {
      if (!chatId) return;
      
      console.log("[ChatScreen] Refreshing messages from database to show updated status...");
      const fetched = await messageService.fetchMessages(chatId, 50);
      
      if (!isMountedRef.current) return;
      
      // FIXED: Sort messages by timestamp immediately
      const sortedMessages = fetched.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sortedMessages);
      
      console.log("[ChatScreen] Messages refreshed from database, count:", sortedMessages.length);
    } catch (error) {
      if (isMountedRef.current) {
        console.error("[ChatScreen] Failed to refresh messages:", error);
      }
    }
  }, [chatId]);

  // FIXED: Listen for message status updates to refresh UI
  useEffect(() => {
    const handleStatusUpdate = () => {
      console.log("[ChatScreen] Status update detected, refreshing messages...");
      refreshMessagesFromDatabase();
    };

    // Listen for custom events when message status changes
    window.addEventListener('message-status-updated', handleStatusUpdate);
    
    return () => {
      window.removeEventListener('message-status-updated', handleStatusUpdate);
    };
  }, [refreshMessagesFromDatabase]);

  if (!chatId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: theme.textSecondary,
        fontSize: '16px'
      }}>
        No chat selected
      </div>
    );
  }

  if (typeof chatId !== 'string') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: theme.error,
        fontSize: '16px'
      }}>
        Invalid chat ID
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: theme.background,
      color: theme.text,
      position: 'relative'
    }}>
      <style>{scrollbarStyles}</style>
      
      {/* Sticky Chat Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.sidebar,
        height: '52px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
      }}>
        <button
          onClick={() => onClose?.()}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'transparent',
            color: theme.textSecondary,
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginRight: '12px'
          }}
          title="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: chatData.isGroupChat ? theme.accent : theme.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            marginRight: '12px'
          }}>
            {chatData.isGroupChat ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            ) : chatData.chatName.charAt(0).toUpperCase()}
          </div>
          
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: theme.text,
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {isLoadingChatData ? (
                <>
                  <span>{chatData.chatName}</span>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: `2px solid ${theme.border}`,
                    borderTop: `2px solid ${theme.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                </>
              ) : (
                chatData.chatName
              )}
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.textSecondary
            }}>
              {chatData.isGroupChat ? 'Group chat' : 'Direct message'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        <div
          className="chat-messages-scrollbar"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 0',
            ...themedStyles.scrollbar
          }}
          onScroll={handleScroll}
        >
          {messages.length > displayCount && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <button
                onClick={() => setDisplayCount(prev => prev + 20)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Load more messages
              </button>
            </div>
          )}
          
          {/* Messages */}
          <div style={{ padding: '0 16px' }}>
            {isLoadingMore && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ color: theme.textSecondary }}>Loading...</div>
              </div>
            )}
            
            {daySections.map(({ day, messages: dayMessages }) => (
              <div key={day}>
                {/* Date separator */}
                <div style={{
                  textAlign: 'center',
                  margin: '24px 0 16px 0',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: theme.border,
                    zIndex: 1
                  }} />
                  <div style={{
                    position: 'relative',
                    zIndex: 2,
                    backgroundColor: theme.background,
                    padding: '0 12px',
                    fontSize: '12px',
                    color: theme.textSecondary,
                    fontWeight: '500'
                  }}>
                    {(() => {
                      const timestamp = new Date(day);
                      // Check if timestamp is valid (not 1970 or invalid date)
                      if (timestamp.getFullYear() < 2000 || isNaN(timestamp.getTime())) {
                        return 'Recent';
                      }
                      return timestamp.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    })()}
                  </div>
                </div>
                
                {/* Messages for this day */}
                {dayMessages.map((message, index) => (
                  <ChatMessageRow
                    key={`${message.message_id || message.client_message_id}-${index}`}
                    message={message}
                    isOwnMessage={message.sender_id === currentUserId}
                    onReply={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            ))}
            
            {/* Reply preview */}
            {false && (
              <div style={{
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                padding: '8px 12px',
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                  Replying to message
                </div>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.textSecondary,
                    cursor: 'pointer',
                    padding: '4px',
                    marginLeft: '8px',
                    fontSize: '18px'
                  }}
                >
                  ×
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* New messages indicator */}
        {!isNearBottom && (
          <div style={{
            position: 'absolute',
            bottom: '50px',
            right: '16px',
            zIndex: 1000
          }}>
            <button
              onClick={() => {
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              New messages
            </button>
          </div>
        )}
        
        {/* Message Input */}
        <div style={{
          padding: '6px 16px',
          backgroundColor: theme.surface,
          borderTop: `1px solid ${theme.border}`,
          position: 'sticky',
          bottom: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px'
          }}>
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) sendMessage();
                }
              }}
              placeholder="Type a message..."
              style={{
                flex: 1,
                minHeight: '20px',
                maxHeight: '60px',
                padding: '5px 16px',
                borderRadius: '20px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.4'
              }}
            />
            
            <button
              onClick={() => {
                if (newMessage.trim()) {
                  sendMessage();
                }
              }}
              disabled={!newMessage.trim()}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: newMessage.trim() ? theme.primary : theme.border,
                color: 'white',
                border: 'none',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                opacity: newMessage.trim() ? 1 : 0.5
              }}
              title="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22,2 15,22 11,13 2,9"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 

export default ChatScreen; 
