import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { useThemedStyles } from './useThemedStyles';
import { nativeApiService } from './nativeApiService';
import { participantService } from './participantService';
import { invoke } from '@tauri-apps/api/core';

interface ChatData {
  chat_id: string;
  chat_name?: string;
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
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false); // Prevent multiple simultaneous loads
  const [hasInitialized, setHasInitialized] = useState(false); // Track if we've completed initial load
  const [searchQuery, setSearchQuery] = useState(''); // Search query state

  // Load chats when component mounts or token changes
  useEffect(() => {
    let timeoutId: number;
    
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
        console.log("📂 Loading chats...");
        
        // Token should already be set in native API service by session manager
        // Just ensure it's set
        if (token) {
          nativeApiService.setToken(token);
        }
        
        // Use native API service to get chats
        const chatsData = await nativeApiService.getChats();
        console.log("✅ Chats loaded:", chatsData);
        
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
              chat_name: chat.name || null,
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
                  chat_name: chat.name || null,
                  chat_type: chat.is_group ? "group" : "direct",
                  is_group: Boolean(chat.is_group),
                  created_at: new Date(chat.created_at * 1000).toISOString(), // Convert timestamp to ISO string
                  creator_id: chat.creator_id || "",
                  participants: Array.isArray(chat.participants) ? chat.participants : [],
                  display_name: displayName
                };
                
                console.log(`🔍 Processed chat ${chat.chat_id}:`, {
                  chatName: chat.name,
                  isGroup: chat.is_group,
                  participantsCount: chat.participants?.length || 0,
                  currentUserId: user?.userId,
                  displayName: displayName,
                  processedData: chatData
                });
                
                return chatData;
              } catch (processError) {
                console.error("❌ Failed to process chat:", chat, processError);
                // Return a fallback chat object
                return {
                  chat_id: chat.chat_id || "unknown",
                  chat_name: "Unknown Chat",
                  chat_type: "direct",
                  is_group: false,
                  created_at: new Date().toISOString(),
                  creator_id: "",
                  participants: [],
                  display_name: "Unknown Chat"
                };
              }
            })
        );
        
        console.log("🔍 About to set chats, length:", chatsWithNames.length);
        setChats(chatsWithNames);
        console.log("✅ Chats processed and set:", chatsWithNames);
        console.log("🔍 Chats array length:", chatsWithNames.length);
        console.log("🔍 First chat:", chatsWithNames[0]);
        setHasInitialized(true); // Mark as initialized
      } catch (err) {
        console.error("❌ Failed to load chats:", err);
        setError("Failed to load chats: " + (err instanceof Error ? err.message : "Unknown error"));
        setHasInitialized(true); // Mark as initialized even on error
      } finally {
        setIsLoading(false);
        setIsLoadingChats(false);
      }
    };

    // Add debounce to prevent rapid reloading
    timeoutId = setTimeout(loadChats, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.userId, services.sessionManager.getToken()]); // Use token directly instead of sessionManager object

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
          const membersResponse = await nativeApiService.getChatMembers(chat.chat_id);
          console.log(`🔍 Direct API response for chat ${chat.chat_id}:`, membersResponse);
          
          if (membersResponse && membersResponse.data && Array.isArray(membersResponse.data)) {
            const otherParticipant = membersResponse.data.find(
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
          const participants = await participantService.getParticipants(chat.chat_id);
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
    return chat.display_name || chat.chat_name || `Chat ${chat.chat_id.slice(0, 8)}`;
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

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    onSelect(chatId);
  };

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
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                fontSize: "16px",
                transition: "all 0.3s ease-in-out",
                transform: isCollapsed ? 'translateX(0)' : 'translateX(-48px)',
                opacity: isCollapsed ? 1 : 0
              }}
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
            <div style={{ 
              width: "8px", 
              height: "8px", 
              borderRadius: "50%", 
              backgroundColor: websocketStatus.is_connected ? "#10b981" : "#6b7280" 
            }}></div>
            <button style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              fontSize: "16px",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}
            >
              ✏️
            </button>
            <button style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              fontSize: "16px",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}
            >
              ⋮
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
            🔍
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
              onClick={() => handleChatSelect(chat.chat_id)}
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
                  <span style={{ 
                    fontSize: "12px", 
                    color: "#9ca3af",
                    flexShrink: 0,
                    marginLeft: "8px"
                  }}>
                    {formatTime(chat.created_at)}
                  </span>
                </div>
                
                <p style={{ 
                  fontSize: "13px", 
                  color: "#9ca3af",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {chat.is_group ? "Group chat" : "Direct message"}
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