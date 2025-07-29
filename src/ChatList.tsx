import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { useThemedStyles } from './useThemedStyles';
import { chatService } from './chatService';
import { friendService } from './friendService';
import { ParticipantService } from './participantService';
import { invoke } from '@tauri-apps/api/core';

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
  participants?: any[];
  last_message?: any;
  display_name?: string; // Computed display name
}





interface ChatListProps {
  onSelect: (chatId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelect, isCollapsed, onToggleCollapse }) => {
  const { user, websocketStatus, services } = useAppContext();
  const styles = useThemedStyles();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false); // Prevent multiple simultaneous loads
  const [hasInitialized, setHasInitialized] = useState(false); // Track if we've completed initial load
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [showCreateChat, setShowCreateChat] = useState(false); // Show create chat form
  const [isLoadingFriends, setIsLoadingFriends] = useState(false); // Loading state for friends
  const [friends, setFriends] = useState<any[]>([]); // List of friends

  // Load chats function
  const loadChats = async () => {
    const token = services.sessionManager.getToken();
    if (!token) {
      setChats([]);
      setIsLoading(false);
      setHasInitialized(true);
      return;
    }

    // Prevent multiple simultaneous loads
    if (isLoadingChats) {
      console.log("⚠️ Chat loading already in progress, skipping...");
      return;
    }

    try {
      setIsLoadingChats(true);
      setIsLoading(true);
      setError(null);
      console.log("📂 Loading chats with caching...");
      
      // Use ChatService to get cached chats for current user
      const chatsData = await chatService.getCachedChatsForCurrentUser();
      console.log("✅ Chats loaded with caching:", chatsData);
      
      // Validate chatsData before processing
      if (!Array.isArray(chatsData)) {
        console.error("❌ Invalid chats data received:", chatsData);
        setError("Invalid chat data received from server");
        setHasInitialized(true);
        return;
      }
      
      // Save chats to database with error handling (simplified)
      try {
        for (const chat of chatsData) {
          if (!chat || !chat.chat_id) {
            console.warn("⚠️ Skipping invalid chat:", chat);
            continue;
          }
          
          const chatForDb = {
            chat_id: chat.chat_id,
            chat_type: chat.is_group ? "group" : "direct",
            name: chat.name || null,
            created_at: Math.floor(chat.created_at || Date.now() / 1000),
            admin_id: null,
            unread_count: 0,
            description: null,
            group_name: chat.is_group ? chat.name : null,
            last_message_content: null,
            last_message_timestamp: null,
            participants: null,
            is_group: Boolean(chat.is_group),
            creator_id: chat.creator_id || null
          };
          
          // Save to database
          await invoke('db_insert_chat', { chat: chatForDb });
        }
        console.log(`✅ Saved ${chatsData.length} chats to database`);
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
              let displayName = await resolveChatName(chat, user?.userId);
              
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
      setHasInitialized(true);
    } catch (error) {
      console.error("❌ Failed to load chats:", error);
      setError("Failed to load chats");
      setHasInitialized(true);
    } finally {
      setIsLoading(false);
      setIsLoadingChats(false);
    }
  };

  // Load chats when component mounts or token changes
  useEffect(() => {
    let timeoutId: number;
    
    const loadChatsWithDelay = async () => {
      await loadChats();
    };
    
    // Add a small delay to ensure session manager is ready
    timeoutId = setTimeout(loadChatsWithDelay, 100);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [services.sessionManager.getToken()]);

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
  const resolveChatName = async (chat: any, currentUserId?: string): Promise<string> => {
    // For group chats, use the group name
    if (chat.is_group) {
      return chat.name || "Unnamed Group";
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
              (member: any) => member.user && member.user.user_id !== currentUserId
            );
            
            if (otherParticipant && otherParticipant.user && otherParticipant.user.username) {
              console.log(`✅ Found other participant via direct API: ${otherParticipant.user.username}`);
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
          
          const otherParticipant = participants.find(
            (participant) => participant.userId !== currentUserId
          );
          
          if (otherParticipant && otherParticipant.username) {
            console.log(`✅ Found other participant via ParticipantService: ${otherParticipant.username}`);
            return otherParticipant.username;
          }
        } catch (participantError) {
          console.warn(`⚠️ ParticipantService failed for ${chat.chat_id}:`, participantError);
        }
        
      } catch (error) {
        console.warn(`⚠️ All chat name resolution methods failed for ${chat.chat_id}:`, error);
      }
    }
    
    // Final fallback
    if (chat.name) {
      return chat.name;
    }
    
    return "Unknown";
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

  // const getLastMessagePreview = (chat: ChatData) => {
  //   if (chat.last_message) {
  //     const content = chat.last_message.content || "";
  //     const preview = content.length > 40 ? content.substring(0, 40) + "..." : content;
  //     return preview || "No message content";
  //   }
  //   return "No messages yet";
  // };

  const handleSelectChat = (chatId: string) => {
    onSelect(chatId);
  };

  // Function to create a chat with a specific friend
  const handleCreateChatWithFriend = async (friend: any) => {
    setShowCreateChat(false);
    setSearchQuery(''); // Clear search query
    try {
      const token = services.sessionManager.getToken();
      if (!token) {
        setError("No token available to create chat.");
        return;
      }

      // Create chat with the selected friend using the same method as CreateChatForm
      const members = [
        { user_id: user?.userId, is_admin: true },
        { user_id: friend.user_id }
      ];

      // @ts-ignore
      await window.__TAURI__.invoke("create_chat", { 
        token, 
        members: JSON.stringify(members),
        is_group: false
      });
      
      console.log("✅ Direct chat created with friend:", friend.username);

      // Reload chats to include the new chat
      await loadChats();
    } catch (error) {
      console.error("❌ Failed to create direct chat:", error);
      setError("Failed to create direct chat.");
    }
  };

  // Load friends
  const loadFriends = async () => {
    setIsLoadingFriends(true);
    try {
      const token = services.sessionManager.getToken();
      if (!token) {
        setFriends([]);
        setIsLoadingFriends(false);
        return;
      }
      const friendsData = await friendService.getCachedFriendsForCurrentUser();
      console.log("✅ Friends loaded with caching:", friendsData);
      setFriends(friendsData);
    } catch (error) {
      console.error("❌ Failed to load friends:", error);
      setError("Failed to load friends.");
    } finally {
      setIsLoadingFriends(false);
    }
  };

  // Load friends when component mounts or token changes
  useEffect(() => {
    let timeoutId: number;
    
    const loadFriendsWithDelay = async () => {
      await loadFriends();
    };
    
    // Add a small delay to ensure session manager is ready
    timeoutId = setTimeout(loadFriendsWithDelay, 100);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [services.sessionManager.getToken()]);

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => {
    if (!searchQuery.trim()) return true;
    const friendName = friend.username.toLowerCase();
    return friendName.includes(searchQuery.toLowerCase());
  });

  if (isLoading || !hasInitialized) {
    return (
      <div style={{ 
        width: "100%", 
        backgroundColor: "#2d2d2d",
        display: "flex", 
        flexDirection: "column", 
        height: "100%",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "16px", 
          borderBottom: "1px solid #404040",
          backgroundColor: "#2d2d2d"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            marginBottom: "12px" 
          }}>
            <h1 style={{ 
              fontSize: "20px", 
              fontWeight: "600", 
              color: "#ffffff",
              margin: 0
            }}>
              Chats
            </h1>
            <div style={{ 
              width: "8px", 
              height: "8px", 
              borderRadius: "50%", 
              backgroundColor: websocketStatus.is_connected ? "#10b981" : "#6b7280" 
            }}></div>
          </div>
          
          {/* Search Bar */}
          <div style={{
            position: "relative",
            marginBottom: "8px"
          }}>
            <input
              type="text"
              placeholder="Search chats..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                backgroundColor: "#404040",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "14px"
              }}
            />
            <div style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af"
            }}>
              🔍
            </div>
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
              backgroundColor: "#404040",
              borderRadius: "8px"
            }}>
              <div style={{ 
                width: "48px", 
                height: "48px", 
                backgroundColor: "#555555", 
                borderRadius: "50%",
                marginRight: "12px"
              }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  height: "16px", 
                  backgroundColor: "#555555", 
                  borderRadius: "4px", 
                  marginBottom: "8px",
                  width: "75%"
                }}></div>
                <div style={{ 
                  height: "12px", 
                  backgroundColor: "#555555", 
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
      <div style={{ 
        width: "100%", 
        ...styles.surface, 
        borderRight: `1px solid ${styles.theme.border}`, 
        display: "flex", 
        flexDirection: "column", 
        height: "100%" 
      }}>
        {/* Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111827" }}>Chats</h1>
        </div>
        
        {/* Error state */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: "24px" 
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "#fef2f2",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px"
            }}>
              <span style={{ color: "#dc2626", fontSize: "20px" }}>⚠</span>
            </div>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "12px" }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                fontSize: "14px",
                backgroundColor: "#3b82f6",
                color: "white",
                fontWeight: "500",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer"
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log("🔍 ChatList render - chats length:", chats.length, "isLoading:", isLoading, "hasInitialized:", hasInitialized, "error:", error);
  console.log("🔍 Chats array:", chats);

  // Show CreateChatForm when showCreateChat is true
  if (showCreateChat) {
    return (
      <div style={{ 
        width: "100%", 
        backgroundColor: "#2d2d2d",
        display: "flex", 
        flexDirection: "column", 
        height: "100%",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "16px 24px", 
          borderBottom: "1px solid #404040", 
          backgroundColor: "#2d2d2d",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <button
            onClick={() => setShowCreateChat(false)}
            style={{
              width: "40px",
              height: "40px",
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
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#404040";
              (e.target as HTMLButtonElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.target as HTMLButtonElement).style.color = "#9ca3af";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
          </button>
          <h1 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            color: "#ffffff", 
            margin: 0 
          }}>
            New Chat
          </h1>
        </div>

        {/* Search Bar */}
        <div style={{
          padding: "16px 24px",
          backgroundColor: "#2d2d2d",
          borderBottom: "1px solid #404040"
        }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                backgroundColor: "#404040",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none"
              }}
            />
            <div style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Friends List */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          overflowX: "hidden",
          backgroundColor: "#2d2d2d"
        }}>
          {isLoadingFriends ? (
            <div style={{ 
              padding: "32px 16px", 
              textAlign: "center",
              color: "#9ca3af"
            }}>
              <div style={{
                display: "inline-block",
                width: "32px",
                height: "32px",
                border: "2px solid #404040",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "16px"
              }}></div>
              <p>Loading friends...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div style={{ 
              padding: "32px 16px", 
              textAlign: "center",
              color: "#9ca3af"
            }}>
              <div style={{ 
                fontSize: "48px", 
                marginBottom: "16px" 
              }}>
                👥
              </div>
              <h3 style={{ 
                fontSize: "16px", 
                fontWeight: "500", 
                marginBottom: "8px",
                color: "#ffffff"
              }}>
                {searchQuery ? "No friends found" : "No friends available"}
              </h3>
              <p style={{ fontSize: "14px" }}>
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
                  e.currentTarget.style.backgroundColor = "#404040";
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
                  backgroundColor: "#0078d4",
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
                    color: "#ffffff",
                    marginBottom: "4px"
                  }}>
                    {friend.username}
                  </div>
                  <div style={{
                    fontSize: "14px",
                    color: "#9ca3af"
                  }}>
                    {friend.name}
                  </div>
                </div>

                {/* Chat Icon */}
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
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
      </div>
    );
  }

  return (
    <div style={{ 
      width: "100%", 
      backgroundColor: "#2d2d2d",
      display: "flex", 
      flexDirection: "column", 
      height: "100%",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "16px", 
        borderBottom: "1px solid #404040",
        backgroundColor: "#2d2d2d"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginBottom: "12px" 
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            transform: isCollapsed ? 'translateX(0)' : 'translateX(0)',
            transition: 'transform 0.3s ease-in-out'
          }}>
            <button
              onClick={onToggleCollapse}
              className={`toggle-button ${isCollapsed ? 'slide-in' : 'slide-out'}`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              ☰
            </button>
            <h1 style={{ 
              fontSize: "20px", 
              fontWeight: "600", 
              color: "#ffffff",
              margin: 0,
              transform: isCollapsed ? 'translateX(0)' : 'translateX(-48px)',
              transition: 'transform 0.3s ease-in-out'
            }}>
              Chats
            </h1>
          </div>
          <div style={{
            display: "flex",
            gap: "8px",
            alignItems: "center"
          }}>
            <button 
              onClick={() => setShowCreateChat(true)}
              style={{
                width: "clamp(32px, 6vw, 40px)",
                height: "clamp(32px, 6vw, 40px)",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "transparent",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "clamp(18px, 4vw, 20px)",
                transition: "all 0.2s ease"
              }}
              title="Create new chat"
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = "scale(1.1)";
                (e.target as HTMLButtonElement).style.color = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = "scale(1)";
                (e.target as HTMLButtonElement).style.color = "#9ca3af";
              }}
            >
              +
            </button>

          </div>
        </div>
        
        {/* Search Bar */}
        <div style={{
          position: "relative",
          marginBottom: "8px"
        }}>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Clear search on Enter
                setSearchQuery('');
              }
            }}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              backgroundColor: "#404040",
              border: "none",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "14px"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                fontSize: "16px",
                padding: "4px"
              }}
            >
              ✕
            </button>
          )}
          <div style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9ca3af"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Chat List */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {error && (
          <div style={{ 
            padding: "16px", 
            margin: "12px",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            borderRadius: "8px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}
        
        {filteredChats.length === 0 && !isLoading ? (
          <div style={{ 
            padding: "32px 16px", 
            textAlign: "center",
            color: "#9ca3af"
          }}>
            <div style={{ 
              fontSize: "48px", 
              marginBottom: "16px" 
            }}>
              💬
            </div>
            <h3 style={{ 
              fontSize: "16px", 
              fontWeight: "500", 
              marginBottom: "8px",
              color: "#ffffff"
            }}>
              No chats yet
            </h3>
            <p style={{ fontSize: "14px" }}>
              Start a conversation to see your chats here
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.chat_id}
              onClick={() => handleSelectChat(chat.chat_id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                cursor: "pointer",
                backgroundColor: selectedChatId === chat.chat_id ? "#404040" : "transparent",
                borderLeft: selectedChatId === chat.chat_id ? "3px solid #0078d4" : "3px solid transparent",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (selectedChatId !== chat.chat_id) {
                  e.currentTarget.style.backgroundColor = "#404040";
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
                backgroundColor: "#0078d4",
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
                    color: "#ffffff",
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
                        backgroundColor: "#ef4444",
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
                      color: "#9ca3af"
                    }}>
                      {formatTime(chat.created_at)}
                    </span>
                  </div>
                </div>
                
                <p style={{ 
                  fontSize: "13px", 
                  color: "#9ca3af",
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