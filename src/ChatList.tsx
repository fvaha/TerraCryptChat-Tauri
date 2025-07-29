import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from './AppContext';

import { useTheme } from './ThemeContext';
import { chatService } from './chatService';
import { friendService } from './friendService';
import { ParticipantService } from './participantService';
import { invoke } from '@tauri-apps/api/core';
import { nativeApiService } from './nativeApiService';

interface ChatData {
  chat_id: string;
  name?: string;
  chat_type?: string;
  is_group: boolean;
  created_at: string;
  creator_id?: string;
  admin_id?: string;
  unread_count?: number;
  description?: string;
  group_name?: string;
  last_message_content?: string;
  last_message_timestamp?: number;
  participants?: Array<{ user_id: string; username: string; role: string }>;
  last_message?: { content: string; timestamp: number; sender_id: string };
  display_name?: string; // Computed display name
}

interface ChatListProps {
  onSelect: (chatId: string) => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const ChatList: React.FC<ChatListProps> = ({ onSelect, onToggleSidebar, sidebarCollapsed }) => {
  const { user, services } = useAppContext();
  
  // Simple cache for chat names to avoid repeated API calls
  const chatNameCache = useRef<Map<string, string>>(new Map());
  const { theme } = useTheme();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Array<{ user_id: string; username: string; name: string; email: string; picture?: string }>>([]);
  const [filteredFriends, setFilteredFriends] = useState<Array<{ user_id: string; username: string; name: string; email: string; picture?: string }>>([]);

  // Load chats function
  const loadChats = async () => {
    const token = services.sessionManager.getToken();
    if (!token) {
      setChats([]);
      setIsLoading(false);
      return;
    }

    // Prevent multiple simultaneous loads
    if (isLoadingChats) {
      console.log("⚠️ Chat loading already in progress, skipping...");
      return;
    }

    setIsLoadingChats(true);
    try {
      console.log("🔄 Loading chats...");
      const chatsData = await nativeApiService.getChats();
      console.log("✅ Chats loaded:", chatsData);
      
      // Save chats to database for caching
      try {
        if (chatsData && Array.isArray(chatsData)) {
          for (const chat of chatsData) {
            await invoke('db_insert_or_update_chat', { chat });
          }
        }
      } catch (dbError) {
        console.error("❌ Failed to save chats to database:", dbError);
        // Continue even if database save fails
      }
      
      console.log("🔍 Raw chats data:", chatsData);
      
      // Process chats and resolve participant names for direct chats
      const chatsWithNames = await Promise.all(
        chatsData
          .filter((chat: any) => chat && chat.chat_id) // Filter out invalid chats
          .map(async (chat: any) => {
            try {
              console.log(`🔍 Raw chat data:`, chat);
              console.log(`🔍 Current user ID:`, user?.userId);
              
              // Resolve chat name using Swift pattern
              const displayName = await resolveChatName(chat, user?.userId);
              
              // Convert the native API response to the expected format
              const chatData: ChatData = {
                chat_id: chat.chat_id,
                name: chat.name || null,
                chat_type: chat.is_group ? "group" : "direct",
                is_group: Boolean(chat.is_group),
                created_at: new Date(chat.created_at * 1000).toISOString(), // Convert timestamp to ISO string
                creator_id: chat.creator_id || "",
                participants: Array.isArray(chat.participants) ? chat.participants : [],
                display_name: displayName
              };
              
              return chatData;
            } catch (error) {
              console.error(`❌ Error processing chat ${chat.chat_id}:`, error);
              return null;
            }
          })
      );
      
      // Filter out null results and sort by creation date (newest first)
      const validChats = chatsWithNames
        .filter((chat): chat is ChatData => chat !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log("✅ Processed chats:", validChats);
      setChats(validChats);
    } catch (error) {
      console.error("❌ Failed to load chats:", error);
      setError("Failed to load chats");
    } finally {
      setIsLoading(false);
      setIsLoadingChats(false);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  };

  // Swift-style resolveChatName function using ParticipantService
  const resolveChatName = async (chat: ChatData, currentUserId?: string): Promise<string> => {
    // Check cache first
    const cacheKey = `${chat.chat_id}_${currentUserId}`;
    if (chatNameCache.current.has(cacheKey)) {
      const cachedName = chatNameCache.current.get(cacheKey);
      console.log(`✅ Using cached chat name for ${chat.chat_id}: ${cachedName}`);
      return cachedName!;
    }
    
    // For group chats, use the group name
    if (chat.is_group) {
      const groupName = chat.name || "Unnamed Group";
      chatNameCache.current.set(cacheKey, groupName);
      return groupName;
    }
    
    // For direct chats, try multiple approaches to get the other participant's username
    if (currentUserId) {
      try {
        console.log(`🔍 Resolving chat name for direct chat: ${chat.chat_id}, currentUserId: ${currentUserId}`);
        
        // First, check if API already provided a name (like "vaha")
        if (chat.name && chat.name !== `Chat ${chat.chat_id.slice(0, 8)}`) {
          console.log(`✅ Using API-provided name: ${chat.name}`);
          return chat.name;
        }
        
        // Try direct API call first (more reliable)
        try {
          console.log(`🔍 Trying direct API call for chat ${chat.chat_id}`);
          const membersResponse = await chatService.getParticipants(chat.chat_id);
          console.log(`🔍 Direct API response for chat ${chat.chat_id}:`, membersResponse);
          
          if (membersResponse && Array.isArray(membersResponse)) {
            const otherParticipant = membersResponse.find(
              (member: { user: { user_id: string; username: string } }) => member.user && member.user.user_id !== currentUserId
            );
            
            if (otherParticipant && otherParticipant.user && otherParticipant.user.username) {
              console.log(`✅ Found other participant via direct API: ${otherParticipant.user.username}`);
              chatNameCache.current.set(cacheKey, otherParticipant.user.username);
              return otherParticipant.user.username;
            }
          }
        } catch (apiError) {
          console.warn(`⚠️ Direct API call failed for ${chat.chat_id}:`, apiError);
        }
        
        // Fallback: Try ParticipantService
        try {
          const participants = await ParticipantService.fetchParticipantsAsync(chat.chat_id);
          console.log(`🔍 Participants from ParticipantService for chat ${chat.chat_id}:`, participants);
          
          if (participants && Array.isArray(participants)) {
            const otherParticipant = participants.find(
              (participant: { user_id: string; username: string }) => participant.user_id !== currentUserId
            );
            
            if (otherParticipant && otherParticipant.username) {
              console.log(`✅ Found other participant via ParticipantService: ${otherParticipant.username}`);
              chatNameCache.current.set(cacheKey, otherParticipant.username);
              return otherParticipant.username;
            }
          }
        } catch (participantError) {
          console.warn(`⚠️ ParticipantService failed for ${chat.chat_id}:`, participantError);
        }
        
      } catch (error) {
        console.warn(`⚠️ All chat name resolution methods failed for ${chat.chat_id}:`, error);
      }
    }
    
    // Final fallback
    let finalName = "Unknown";
    if (chat.name) {
      finalName = chat.name;
    }
    
    // Cache the result
    chatNameCache.current.set(cacheKey, finalName);
    return finalName;
  };

  const getChatName = (chat: ChatData) => {
    return chat.display_name || chat.name || `Chat ${chat.chat_id.slice(0, 8)}`;
  };

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    const chatName = getChatName(chat).toLowerCase();
    return chatName.includes(searchQuery.toLowerCase());
  });

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    onSelect(chatId);
  };



  // Load friends for create chat functionality
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const friendsData = await friendService.getCachedFriendsForCurrentUser();
        setFriends(friendsData || []);
        setFilteredFriends(friendsData || []);
      } catch (error) {
        console.error("Failed to load friends:", error);
      }
    };

    if (showCreateChat) {
      loadFriends();
    }
  }, [showCreateChat]);

  // Filter friends based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend => 
        friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const handleCreateChatWithFriend = async (friend: { user_id: string; username: string; name: string; email: string; picture?: string }) => {
    try {
      console.log("Creating chat with friend:", friend);
      // TODO: Implement chat creation logic
      setShowCreateChat(false);
      await loadChats();
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

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
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h2 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: theme.text,
              margin: 0
            }}>
              Chats
            </h2>
            <button
              onClick={() => setShowCreateChat(!showCreateChat)}
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
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Loading skeleton */}
        <div style={{ flex: 1, padding: "12px", overflowY: "auto", overflowX: "hidden" }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ 
              display: "flex", 
              alignItems: "center", 
              padding: "12px", 
              marginBottom: "8px",
              backgroundColor: theme.surface,
              borderRadius: "8px"
            }}>
              <div style={{ 
                width: "48px", 
                height: "48px", 
                backgroundColor: theme.border, 
                borderRadius: "50%",
                marginRight: "12px"
              }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  height: "16px", 
                  backgroundColor: theme.border, 
                  borderRadius: "4px", 
                  marginBottom: "8px",
                  width: "75%"
                }}></div>
                <div style={{ 
                  height: "12px", 
                  backgroundColor: theme.border, 
                  borderRadius: "4px",
                  width: "60%"
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.background
        }}
      >
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
            Chats
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
              onClick={loadChats}
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
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <button
              onClick={onToggleSidebar}
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
              title="Toggle sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h2 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: theme.text,
              margin: 0
            }}>
              Chats
            </h2>
          </div>
          <button
            onClick={() => setShowCreateChat(!showCreateChat)}
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
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: "12px" }}>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {showCreateChat ? (
          <div style={{ padding: "16px" }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: "600",
              color: theme.text,
              marginBottom: "16px"
            }}>
              Create New Chat
            </h3>
            
            {filteredFriends.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px" }}>
                <p style={{ fontSize: "14px", color: theme.textSecondary }}>
                  {searchQuery ? "Try a different search term" : "Add friends to start chatting"}
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.user_id}
                  onClick={() => handleCreateChatWithFriend(friend)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    borderLeft: "3px solid transparent",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Avatar */}
                  <div style={{ 
                    width: "48px", 
                    height: "48px", 
                    borderRadius: "50%",
                    backgroundColor: theme.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "18px",
                    marginRight: "12px"
                  }}>
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Friend Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: theme.text,
                      marginBottom: "4px"
                    }}>
                      {friend.username}
                    </div>
                    <div style={{
                      fontSize: "14px",
                      color: theme.textSecondary
                    }}>
                      {friend.name}
                    </div>
                  </div>

                  {/* Chat Icon */}
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: theme.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px"
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : filteredChats.length === 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "24px"
          }}>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ 
                fontSize: "16px", 
                fontWeight: "500", 
                marginBottom: "8px",
                color: theme.text
              }}>
                No chats yet
              </h3>
              <p style={{ fontSize: "14px", color: theme.textSecondary }}>
                Start a conversation to see your chats here
              </p>
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.chat_id}
              onClick={() => handleChatSelect(chat.chat_id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                cursor: "pointer",
                backgroundColor: selectedChatId === chat.chat_id ? theme.selected : "transparent",
                borderLeft: selectedChatId === chat.chat_id ? `3px solid ${theme.primary}` : "3px solid transparent",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (selectedChatId !== chat.chat_id) {
                  e.currentTarget.style.backgroundColor = theme.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedChatId !== chat.chat_id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {/* Avatar */}
              <div style={{ 
                width: "48px", 
                height: "48px", 
                borderRadius: "50%",
                backgroundColor: theme.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                marginRight: "12px",
                flexShrink: 0
              }}>
                {getChatName(chat).charAt(0).toUpperCase()}
              </div>
              
              {/* Chat Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "4px"
                }}>
                  <h3 style={{ 
                    fontSize: "14px", 
                    fontWeight: "600", 
                    color: theme.text,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {getChatName(chat)}
                  </h3>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0
                  }}>
                    {/* Unread Count Badge */}
                    {chat.unread_count && chat.unread_count > 0 && (
                      <div style={{
                        backgroundColor: theme.error,
                        color: "#ffffff",
                        borderRadius: "50%",
                        minWidth: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "0 6px"
                      }}>
                        {chat.unread_count > 99 ? "99+" : chat.unread_count}
                      </div>
                    )}
                    <span style={{ 
                      fontSize: "12px", 
                      color: theme.textSecondary
                    }}>
                      {formatTime(chat.created_at)}
                    </span>
                  </div>
                </div>
                
                <p style={{ 
                  fontSize: "13px", 
                  color: theme.textSecondary,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {chat.last_message_content || (chat.is_group ? "Group chat" : "Direct message")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;