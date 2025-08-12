// SECOND WINDOW: ChatList component - displays list of chats in the second window
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../AppContext';

import { useTheme } from '../components/ThemeContext';
import { useThemedStyles } from '../components/useThemedStyles';
import ScreenHeader from '../components/ScreenHeader';

import { participantService } from '../participant/participantService';
import { nativeApiService } from '../api/nativeApiService';
import CreateChatForm from './CreateChatForm';
import { Chat } from '../models/models';
import { chatService } from '../services/chatService';
import { sessionManager } from '../utils/sessionManager';
import { invoke } from '@tauri-apps/api/core';
import { backgroundSyncManager } from '../services/backgroundSyncManager';

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

interface ChatData {
  chat_id: string;
  name?: string;
  chat_type?: string;
  is_group_chat: boolean;
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

interface NativeChatData {
  chat_id: string;
  name?: string;
  is_group_chat?: boolean;
  created_at: number;
  creator_id?: string;
  admin_id?: string;
  unread_count?: number;
  description?: string;
  group_name?: string;
  last_message_content?: string;
  last_message_timestamp?: number;
}

interface FriendData {
  user_id: string;
  username: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface ChatListProps {
  onSelect: (chatId: string) => void;
  onOpenChatOptions: (chat: Chat) => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const ChatList: React.FC<ChatListProps> = ({ onSelect, onOpenChatOptions, onToggleSidebar, sidebarCollapsed }) => {
  const { user, services } = useAppContext();
  
  // Simple cache for chat names to avoid repeated API calls
  const chatNameCache = useRef<Map<string, string>>(new Map());
  const { theme } = useTheme();
  const themedStyles = useThemedStyles();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [skipBackgroundSync, setSkipBackgroundSync] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    chat: ChatData | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    chat: null
  });

  // Load chats function
  const loadChats = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingChats) {
      console.log("[ChatList] Chat loading already in progress, skipping...");
      return;
    }

    setIsLoadingChats(true);
    try {
      console.log("[ChatList] Starting chat load process...");
      
      // Use filtered method to exclude locally deleted chats
      let chatsData;
      const token = services.sessionManager.getToken();
      if (token) {
        chatsData = await nativeApiService.getCachedChatsForCurrentUserFiltered(token);
        console.log(`[ChatList] Loaded ${chatsData?.length || 0} filtered chats from database`);
      } else {
        chatsData = await nativeApiService.getCachedChatsOnly();
        console.log(`[ChatList] Loaded ${chatsData?.length || 0} unfiltered chats from database`);
      }
      
      if (!chatsData || chatsData.length === 0) {
        console.log("[ChatList] No chats found in database");
        setChats([]);
        return;
      }
      
      // Process chats and resolve participant names for direct chats (optimized)
      console.log("[ChatList] Processing chats for display...");
      const chatsWithNames = await Promise.all(
        chatsData
          .filter((chat: NativeChatData) => chat && chat.chat_id) // Filter out invalid chats
          .map(async (chat: NativeChatData, index: number) => {
           try {
             console.log(`[ChatList] Processing chat ${index + 1}/${chatsData.length}: ${chat.chat_id}`);
             
             // Convert the native API response to the expected format
             const chatData: ChatData = {
               chat_id: chat.chat_id,
               name: chat.name || null,
               chat_type: (chat.is_group_chat ?? false) ? "group" : "direct",
               is_group_chat: Boolean(chat.is_group_chat ?? false),
               created_at: new Date(chat.created_at * 1000).toISOString(), // Convert number timestamp to ISO string
               creator_id: chat.creator_id || "",
               participants: [], // Will be populated separately if needed
               display_name: ""
             };
             
             // Resolve chat name using enhanced pattern (fast path)
             const displayName = await resolveChatName(chatData, user?.user_id);
             chatData.display_name = displayName;
             
             console.log(`[ChatList] Resolved chat name for ${chat.chat_id}: ${displayName}`);
             return chatData;
           } catch (error) {
             console.error(`[ChatList] Error processing chat ${chat.chat_id}:`, error);
             // Return a fallback chat with basic info instead of null
             return {
               chat_id: chat.chat_id,
               name: chat.name || null,
               chat_type: (chat.is_group_chat ?? false) ? "group" : "direct",
               is_group_chat: Boolean(chat.is_group_chat ?? false),
               created_at: new Date(chat.created_at * 1000).toISOString(),
               creator_id: chat.creator_id || "",
               participants: [],
               display_name: chat.name || `Chat ${chat.chat_id.slice(0, 8)}`
             };
           }
         })
      );
      
      // Filter out null results and sort by creation date (newest first)
      const validChats = chatsWithNames
        .filter((chat): chat is ChatData => chat !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log(`[ChatList] Successfully processed ${validChats.length} chats`);
      setChats(validChats);
      
    } catch (error) {
      console.error("[ChatList] Failed to load chats:", error);
      setError("Failed to load chats");
    } finally {
      setIsLoadingChats(false);
    }
  }, [user?.user_id, services.sessionManager]);

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

  // Function to refresh chat names for a specific chat
  const refreshChatName = async (chatId: string) => {
    try {
      const chat = chats.find(c => c.chat_id === chatId);
      if (chat && user?.user_id) {
        const newName = await resolveChatName(chat, user.user_id);
        chat.display_name = newName;
        
        // Update the chat in state
        setChats(prevChats => 
          prevChats.map(c => 
            c.chat_id === chatId 
              ? { ...c, display_name: newName }
              : c
          )
        );
        
        console.log(`[ChatList] Refreshed chat name for ${chatId}: ${newName}`);
      }
    } catch (error) {
      console.error(`[ChatList] Failed to refresh chat name for ${chatId}:`, error);
    }
  };

  // Enhanced resolveChatName function using local database only
  const resolveChatName = async (chat: ChatData, currentUserId?: string): Promise<string> => {
    if (chat.name) return chat.name;
    
    const cacheKey = `${chat.chat_id}_${currentUserId}`;
    if (chatNameCache.current.has(cacheKey)) {
      const cachedName = chatNameCache.current.get(cacheKey);
      console.log(`[ChatList] Using cached chat name for ${chat.chat_id}: ${cachedName}`);
      return cachedName!;
    }

    try {
      if (currentUserId && !chat.is_group_chat) {
        console.log(`[ChatList] Resolving chat name for direct chat: ${chat.chat_id}, currentUserId: ${currentUserId}`);
        
        // Get participants from local database (fast path)
        try {
          const participants = await services.participantService.get_participants_for_chat(chat.chat_id);
          console.log(`[ChatList] Found ${participants.length} participants for chat ${chat.chat_id}`);
          
          if (participants.length > 0) {
            // Find the other participant (not current user)
            const otherParticipant = participants.find(
              (participant: { user_id: string; username?: string; name?: string }) => 
                participant.user_id !== currentUserId
            );
            
            if (otherParticipant) {
              // Try to get username from participant data first
              if (otherParticipant.username && otherParticipant.username.trim() !== '') {
                console.log(`[ChatList] Resolved chat name from participant username: ${otherParticipant.username}`);
                chatNameCache.current.set(cacheKey, otherParticipant.username);
                return otherParticipant.username;
              }
              
              // Try to get from user service if username is missing
              try {
                const user = await services.userService.get_user_by_id(otherParticipant.user_id);
                if (user && user.username && user.username.trim() !== '') {
                  console.log(`[ChatList] Resolved chat name from user service: ${user.username}`);
                  chatNameCache.current.set(cacheKey, user.username);
                  return user.username;
                }
              } catch (userError) {
                console.warn(`[ChatList] Could not get user data for ${otherParticipant.user_id}:`, userError);
              }
            }
          }
        } catch (error) {
          console.warn(`[ChatList] Error getting participants from database:`, error);
        }
        
        // Fallback: try to get from friends list
        try {
          const friends = await services.friendService.get_all_friends();
          if (friends && friends.length > 0) {
            // Find a friend that might be in this chat
            const potentialFriend = friends.find(friend => 
              friend.user_id !== currentUserId
            );
            if (potentialFriend) {
              const friendName = potentialFriend.username;
              if (friendName && friendName.trim() !== '') {
                console.log(`[ChatList] Resolved chat name from friends: ${friendName}`);
                chatNameCache.current.set(cacheKey, friendName);
                return friendName;
              }
            }
          }
        } catch (friendError) {
          console.warn(`[ChatList] Could not get friends for chat name resolution:`, friendError);
        }
      }
      
      // For group chats, try to use the chat name from the database
      if (chat.is_group_chat && chat.name) {
        console.log(`[ChatList] Using group chat name: ${chat.name}`);
        chatNameCache.current.set(cacheKey, chat.name);
        return chat.name;
      }
      
      // Final fallback: try to construct a meaningful name
      let fallbackName = "Unknown User";
      try {
        if (currentUserId && !chat.is_group_chat) {
          // Try to get at least one participant to show some info
          const participants = await services.participantService.get_participants_for_chat(chat.chat_id);
          if (participants.length > 0) {
            const otherParticipant = participants.find(p => p.user_id !== currentUserId);
            if (otherParticipant) {
              // Always prioritize username over name, never show user ID
              fallbackName = otherParticipant.username || 'Unknown User';
            }
          }
        }
      } catch (error) {
        console.warn(`[ChatList] Could not construct fallback name:`, error);
      }
      
      console.log(`[ChatList] Using fallback name: ${fallbackName}`);
      chatNameCache.current.set(cacheKey, fallbackName);
      return fallbackName;
    } catch (error) {
      console.error(`[ChatList] Error resolving chat name for ${chat.chat_id}:`, error);
      const fallbackName = "Unknown User";
      chatNameCache.current.set(cacheKey, fallbackName);
      return fallbackName;
    }
  };

  const getChatName = (chat: ChatData) => {
    if (chat.display_name && chat.display_name !== "Unknown User") {
      return chat.display_name;
    }
    if (chat.name && chat.name.trim() !== '') {
      return chat.name;
    }
    if (chat.is_group_chat) {
      return "Group Chat";
    }
    return "Direct Message";
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

  const handleContextMenu = (e: React.MouseEvent, chat: ChatData) => {
    e.preventDefault();
    console.log("[ChatList] Context menu opened for chat:", chat.chat_id);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chat
    });
  };

  const handleContextMenuClose = () => {
    console.log("[ChatList] Context menu closing");
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      chat: null
    });
  };

  const handleOpenChatOptions = () => {
    if (contextMenu.chat) {
      // Convert ChatData to Chat format
      const chat: Chat = {
        chat_id: contextMenu.chat.chat_id,
        name: contextMenu.chat.name || '',
        creator_id: contextMenu.chat.creator_id || '',
        is_group: contextMenu.chat.is_group_chat,
        description: contextMenu.chat.description,
        group_name: contextMenu.chat.group_name,
        last_message_content: contextMenu.chat.last_message_content,
        last_message_timestamp: contextMenu.chat.last_message_timestamp,
        unread_count: contextMenu.chat.unread_count || 0,
        created_at: contextMenu.chat.created_at, // Keep as string
        participants: [] // Will be populated separately if needed
      };
      onOpenChatOptions(chat);
    }
    handleContextMenuClose();
  };

  const handleLeaveChat = async () => {
    if (!contextMenu.chat) return;
    
    const chatId = contextMenu.chat.chat_id;
    console.log("[ChatList] Leaving chat:", chatId);
    
    try {
      // Use the new chatService.leaveChat method
      await chatService.leaveChat(chatId);
      console.log("[ChatList] Successfully left chat:", chatId);
      
      // Clear chat name cache for this chat
      chatNameCache.current.delete(`${chatId}_${user?.user_id}`);
      
      // Remove from current state immediately for instant UI update
      setChats(prevChats => prevChats.filter(chat => chat.chat_id !== chatId));
      
      // Force reload chats to reflect the change
      setIsLoadingChats(false); // Reset loading state
      await loadChats();
      
    } catch (error) {
      console.error("[ChatList] Leave chat operation failed:", error);
      // Don't show error to user, just log it and continue
    }
    
    handleContextMenuClose();
  };

  const handleDeleteChat = async () => {
    if (!contextMenu.chat) return;
    
    const chatId = contextMenu.chat.chat_id;
    console.log("[ChatList] Deleting chat:", chatId);
    
    // Check if current user is the creator
    const isCreator = contextMenu.chat.creator_id === user?.user_id;
    
    if (!isCreator) {
      console.log("[ChatList] User is not creator, showing notification");
      alert("You can only delete chats that you created.");
      handleContextMenuClose();
      return;
    }
    
    try {
      // Use the new chatService.deleteChat method
      await chatService.deleteChat(chatId);
      console.log("[ChatList] Successfully deleted chat:", chatId);
      
      // Clear chat name cache for this chat
      chatNameCache.current.delete(`${chatId}_${user?.user_id}`);
      
      // Remove from current state immediately for instant UI update
      setChats(prevChats => prevChats.filter(chat => chat.chat_id !== chatId));
      
      // Force reload chats to reflect the change
      setIsLoadingChats(false); // Reset loading state
      await loadChats();
      
    } catch (error) {
      console.error("[ChatList] Delete chat operation failed:", error);
      // Don't show error to user, just log it and continue
    }
    
    handleContextMenuClose();
  };

  // Handle search activation
        const handleSearchClick = () => {
        setIsSearchActive(!isSearchActive);
        if (!isSearchActive) {
          setSearchQuery('');
        }
      };

  // Auto-close search after 3 seconds of inactivity
  useEffect(() => {
    if (isSearchActive && !searchQuery) {
      const timeout = setTimeout(() => {
        setIsSearchActive(false);
      }, 2000);
      setSearchTimeout(timeout);
    } else if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [isSearchActive, searchQuery, searchTimeout]);







  // Load chats on mount
  useEffect(() => {
    const initializeChatList = async () => {
      try {
        console.log("[ChatList] Initializing chat list...");
        
        // Load chats from local database first (fast path) - non-blocking
        loadChats().catch(error => {
          console.error("[ChatList] Failed to load chats:", error);
          setError("Failed to load chats");
        });
        
        // Set loading to false immediately to prevent UI hang
        setIsLoading(false);
        console.log("[ChatList] Initial chat list load completed");
        
        // Move ALL heavy operations to background (completely non-blocking)
        setTimeout(async () => {
          try {
            // Refresh all chat names in background
            console.log("[ChatList] Refreshing all chat names in background...");
            const token = await services.sessionManager.getToken();
            await invoke('refresh_all_chat_names', { token });
            console.log("[ChatList] Chat names refresh completed in background");
            
            // Reload chats after background refresh
            await loadChats();
          } catch (refreshError) {
            console.warn("[ChatList] Background chat names refresh failed:", refreshError);
          }
        }, 300); // Increased delay to ensure UI is fully responsive
        
      } catch (error) {
        console.error("[ChatList] Failed to initialize chat list:", error);
        setError("Failed to initialize chat list");
        setIsLoading(false);
      }
    };
    
    initializeChatList();
  }, [skipBackgroundSync]);

  // Listen for chat notifications to refresh the list
  useEffect(() => {
    const handleChatNotification = (event: CustomEvent) => {
      console.log("[ChatList] Chat notification received:", event.detail);
      
      const { type, message } = event.detail;
      if (type === 'chat-notification') {
        const { action, chat_id } = message;
        
        switch (action) {
          case 'created':
            console.log("[ChatList] Chat created notification, refreshing chat list...");
            // Refresh chats to show the new chat
            loadChats();
            break;
            
          case 'updated':
            console.log("[ChatList] Chat updated notification, refreshing chat list...");
            // Refresh chats to show updated information
            loadChats();
            break;
            
          case 'deleted':
            console.log("[ChatList] Chat deleted notification, removing from local state...");
            // Remove the deleted chat from local state immediately
            setChats(prevChats => prevChats.filter(chat => chat.chat_id !== chat_id));
            // Also clear the chat name cache
            if (user?.user_id) {
              chatNameCache.current.delete(`${chat_id}_${user.user_id}`);
            }
            break;
            
          case 'left':
            console.log("[ChatList] User left chat notification, removing from local state...");
            // Remove the chat that the user left from local state
            setChats(prevChats => prevChats.filter(chat => chat.chat_id !== chat_id));
            // Also clear the chat name cache
            if (user?.user_id) {
              chatNameCache.current.delete(`${chat_id}_${user.user_id}`);
            }
            break;
            
          case 'cleanup':
            console.log("[ChatList] Chat cleanup completed, refreshing chat list...");
            // Refresh the entire chat list after cleanup
            loadChats();
            break;
            
          default:
            console.log("[ChatList] Unknown chat action:", action);
        }
      }
    };

    // Listen for chat notification events
    window.addEventListener('chat-notification-received', handleChatNotification as EventListener);
    
    return () => {
      window.removeEventListener('chat-notification-received', handleChatNotification as EventListener);
    };
  }, [loadChats, user?.user_id]);

  // Trigger background sync when the ChatList is opened
  useEffect(() => {
    const triggerSync = async () => {
      if (user?.user_id) {
        // DISABLED: Background sync is re-adding deleted chats
        // This will be re-enabled once proper delta sync is implemented
        console.log("[ChatList] Background sync disabled to prevent deleted chats from reappearing");
        /*
        // Make background sync completely non-blocking with longer delay
        setTimeout(async () => {
          try {
            await backgroundSyncManager.onChatListScreenOpened();
            console.log("[ChatList] Background sync triggered for chats delta.");
          } catch (error) {
            console.warn("[ChatList] Background sync failed:", error);
          }
        }, 500); // Longer delay to ensure UI is fully responsive
        */
      }
    };

    triggerSync();
  }, [user?.user_id]);

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
            <div style={{
              display: "flex",
              gap: "8px"
            }}>
                             <button
                 onClick={async () => {
                   try {
                     console.log('[ChatList] Manual refresh triggered');
                     await loadChats();
                   } catch (error) {
                     console.error('Failed to refresh chats:', error);
                   }
                 }}
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
                 title="Refresh chats and sync deletions"
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M21 2v6h-6"/>
                   <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                   <path d="M3 22v-6h6"/>
                   <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                 </svg>
               </button>
               <button
                 onClick={async () => {
                   try {
                     console.log('[ChatList] Refreshing all chat names...');
                     for (const chat of chats) {
                       await refreshChatName(chat.chat_id);
                     }
                     console.log('[ChatList] All chat names refreshed');
                   } catch (error) {
                     console.error('Failed to refresh chat names:', error);
                   }
                 }}
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
                 title="Refresh chat names from server"
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M12 2v4"/>
                   <path d="M12 18v4"/>
                   <path d="M4.93 4.93l2.83 2.83"/>
                   <path d="M16.24 16.24l2.83 2.83"/>
                   <path d="M2 12h4"/>
                   <path d="M18 12h4"/>
                   <path d="M4.93 19.07l2.83-2.83"/>
                   <path d="M16.24 7.76l2.83-2.83"/>
                 </svg>
               </button>
               <button
                 onClick={async () => {
                   try {
                     console.log('[ChatList] Syncing all chat participants from server...');
                     await services.participantService.syncAllExistingChats();
                     console.log('[ChatList] All chat participants synced from server');
                     
                     // Refresh the chat list to show updated names
                     await loadChats();
                   } catch (error) {
                     console.error('Failed to sync chat participants:', error);
                   }
                 }}
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
                 title="Sync all chat participants from server to fix names"
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                   <circle cx="9" cy="7" r="4"/>
                   <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                   <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                 </svg>
               </button>
               <button
                 onClick={() => {
                   console.log('[ChatList] Debug: Manual debug triggered');
                   console.log('[ChatList] Current chats:', chats);
                 }}
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
                 title="Debug localDeletes"
               >
                 🐛
               </button>
                                     <button
                        onClick={() => {
                          console.log('[ChatList] Manual clear triggered');
                          console.log('[ChatList] Manual clear completed');
                        }}
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
                        title="Clear localDeletes"
                      >
                        🗑️
                      </button>
                      <button
                        onClick={async () => {
                          console.log('[ChatList] Testing WebSocket message flow...');
                          try {
                            // Test creating a chat with a friend
                            const token = await sessionManager.getToken();
                            if (token) {
                              // Get the first friend to create a chat with
                              const friends = await invoke<FriendData[]>('db_get_cached_friends_only');
                              if (friends && friends.length > 0) {
                                const friend = friends[0];
                                console.log('[ChatList] Creating test chat with friend:', friend.username);
                                
                                const result = await invoke('create_chat', {
                                  token: token,
                                  name: friend.username,
                                  members: [{
                                    user_id: friend.user_id,
                                    is_admin: false
                                  }]
                                });
                                
                                console.log('[ChatList] Test chat creation result:', result);
                              } else {
                                console.log('[ChatList] No friends available for test');
                              }
                            } else {
                              console.log('[ChatList] No token available for test');
                            }
                          } catch (error) {
                            console.error('[ChatList] Test chat creation failed:', error);
                          }
                        }}
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
                        title="Test WebSocket chat creation"
                      >
                        🧪
                      </button>
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
        </div>
        
        {/* Loading skeleton */}
        <div style={{ 
          flex: 1, 
          padding: "12px", 
          overflowY: "auto", 
          overflowX: "hidden",
          ...themedStyles.scrollbar
        }}>
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
        <ScreenHeader
          title="Chats"
          onToggleSidebar={onToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          showAddButton={true}
          onAddClick={() => setShowCreateChat(!showCreateChat)}
          addButtonTitle="Create chat"
        />
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
      <ScreenHeader
        title="Chats"
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        showAddButton={true}
        onAddClick={() => setShowCreateChat(!showCreateChat)}
        showSearchBar={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search chats..."
        addButtonTitle="Create chat"
        showSearchButton={true}
        onSearchClick={handleSearchClick}
        isSearchActive={isSearchActive}
        showRefreshButton={true}
        onRefreshClick={loadChats}
      />

      {/* Background Loading Indicator - DISABLED */}
      {false && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
          fontSize: '12px',
          color: theme.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            border: `2px solid ${theme.border}`,
            borderTop: `2px solid ${theme.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Updating chat list in background...
        </div>
      )}

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        overflowX: "hidden",
        ...themedStyles.scrollbar
      }}>
        {showCreateChat ? (
          <CreateChatForm
            onCreated={(chatId: string) => {
              setShowCreateChat(false);
              loadChats();
              // Open the newly created chat
              onSelect(chatId);
            }}
            onCancel={() => setShowCreateChat(false)}
          />
        ) : (!isSearchActive || !searchQuery) && filteredChats.length === 0 ? (
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
        ) : isSearchActive && searchQuery && filteredChats.length === 0 ? (
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
                No chats found
              </h3>
              <p style={{ fontSize: "14px", color: theme.textSecondary }}>
                Try a different search term
              </p>
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.chat_id}
              onClick={() => handleChatSelect(chat.chat_id)}
              onContextMenu={(e) => handleContextMenu(e, chat)}
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
                  {chat.last_message_content || (chat.is_group_chat ? "Group chat" : "Direct message")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

             {/* Context Menu */}
       {contextMenu.visible && (
         <div
           style={{
             position: 'fixed',
             top: contextMenu.y,
             left: contextMenu.x,
             backgroundColor: theme.background,
             border: `1px solid ${theme.border}`,
             borderRadius: '8px',
             boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
             zIndex: 1000,
             minWidth: '160px'
           }}
           onClick={handleContextMenuClose}
         >
           <div
             onClick={handleOpenChatOptions}
             style={{
               padding: '12px 16px',
               cursor: 'pointer',
               fontSize: '14px',
               color: theme.text,
               borderBottom: `1px solid ${theme.border}`,
               transition: 'background-color 0.2s ease'
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.backgroundColor = theme.hover;
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.backgroundColor = 'transparent';
             }}
           >
             Chat Info
           </div>
                       <div
              onClick={(e) => {
                console.log("[ChatList] Leave Chat button clicked!");
                e.stopPropagation();
                handleLeaveChat();
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                color: theme.text,
                borderBottom: `1px solid ${theme.border}`,
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Leave Chat
            </div>
           {contextMenu.chat && contextMenu.chat.creator_id === user?.user_id && (
             <div
               onClick={handleDeleteChat}
               style={{
                 padding: '12px 16px',
                 cursor: 'pointer',
                 fontSize: '14px',
                 color: '#EF4444',
                 transition: 'background-color 0.2s ease'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.backgroundColor = theme.hover;
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.backgroundColor = 'transparent';
               }}
             >
               Delete Chat
             </div>
           )}
         </div>
       )}

      {/* Click outside to close context menu */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={handleContextMenuClose}
        />
      )}
    </div>
  );
};

export default ChatList;
