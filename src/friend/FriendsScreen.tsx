// SECOND WINDOW: FriendsScreen component - displays friends list in the second window
import React, { useState, useEffect, useRef } from 'react';

import { useTheme } from '../components/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { friendService } from './friendService';
import { Friend } from '../models/models';
import NewFriendSearch from './NewFriendSearch';
import FriendRequestsModal from './FriendRequestsModal';

interface FriendsScreenProps {
  onOpenChat: (friendId: string, friendName: string) => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onOpenChat, onToggleSidebar, sidebarCollapsed }) => {

  const { theme } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  
  // Search functionality for header
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load friends
  const loadFriends = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(" Loading friends...");
      
      const friendsData = await friendService.getCachedFriendsForCurrentUser();
      console.log(" Friends loaded:", friendsData);
      
      if (Array.isArray(friendsData)) {
        setFriends(friendsData);
      } else {
        console.warn(" Invalid friends data received:", friendsData);
        setFriends([]);
      }
    } catch (error) {
      console.error(" Failed to load friends:", error);
      setError("Failed to load friends");
    } finally {
      setIsLoading(false);
    }
  };

  // Add friend function
  const handleAddFriend = async (username: string, userId: string) => {
    try {
      console.log(" Adding friend:", username);
      
      // Don't send friend request again - it was already sent in NewFriendSearch
      // await friendService.sendFriendRequest(userId);
      console.log(" Friend request already sent in NewFriendSearch");
      
      // Close the search screen immediately after successful request
      setShowFriendSearch(false);
      
      // Reload friends after a short delay to ensure the request is processed
      reloadTimeoutRef.current = setTimeout(async () => {
        try {
          await loadFriends();
        } catch (error) {
          console.error(" Failed to reload friends after adding friend:", error);
        }
      }, 1000);
    } catch (error) {
      console.error(" Failed to add friend:", error);
      setError("Failed to add friend");
    }
  };

  // Load friend requests
  const loadFriendRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const requests = await friendService.getFriendRequests();
      setFriendRequests(requests);
      setFriendRequestsCount(requests.length);
      
      // Also update the pending request count from the service
      const pendingCount = friendService.getPendingRequestCount();
      setFriendRequestsCount(pendingCount);
    } catch (error) {
      console.error("Failed to load friend requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Search functionality
  const handleSearchClick = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setSearchQuery('');
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for auto-close (2 seconds)
    const timeout = setTimeout(() => {
      setIsSearchActive(false);
      setSearchQuery('');
    }, 2000);
    
    setSearchTimeout(timeout);
  };



  // Handle friend request actions
  const handleAcceptRequest = async (requestId: string) => {
    try {
      const success = await friendService.acceptFriendRequest(requestId);
      if (success) {
        console.log(" Friend request accepted");
        await loadFriendRequests(); // Reload requests
        await loadFriends(); // Reload friends list
      } else {
        setError("Failed to accept friend request");
      }
    } catch (error) {
      console.error(" Failed to accept friend request:", error);
      setError("Failed to accept friend request");
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const success = await friendService.rejectFriendRequest(requestId);
      if (success) {
        console.log(" Friend request declined");
        await loadFriendRequests(); // Reload requests
      } else {
        setError("Failed to decline friend request");
      }
    } catch (error) {
      console.error(" Failed to decline friend request:", error);
      setError("Failed to decline friend request");
    }
  };

  // Load friends on mount
  useEffect(() => {
    const initializeScreen = async () => {
      await loadFriends();
      await loadFriendRequests();
    };
    
    initializeScreen();
  }, []);

  // Listen for friend request notifications
  useEffect(() => {
    const handleRequestChange = () => {
      loadFriendRequests();
      loadFriends();
    };

    friendService.onRequestChange(handleRequestChange);

    return () => {
      friendService.offRequestChange(handleRequestChange);
    };
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [searchTimeout]);

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.background
      }}>
        <ScreenHeader
          title="Friends"
          onToggleSidebar={onToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          showAddButton={true}
          onAddClick={() => setShowFriendSearch(true)}
          addButtonTitle="Add friend"
          showFriendRequestsButton={true}
          onFriendRequestsClick={() => setShowFriendRequestsModal(true)}
          friendRequestsCount={friendRequestsCount}
          showSearchButton={true}
          onSearchClick={handleSearchClick}
          isSearchActive={isSearchActive}
          showSearchBar={true}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search friends..."
        />
        
        {/* Loading skeleton */}
        <div style={{ flex: 1, padding: "12px", overflowY: "auto", overflowX: "hidden" }}>
          {[...Array(6)].map((_, i) => (
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
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.background
      }}>
        <ScreenHeader
          title="Friends"
          onToggleSidebar={onToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
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
              onClick={loadFriends}
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

  // Show friend search screen if requested
  if (showFriendSearch) {
    return (
      <NewFriendSearch
        onBack={() => setShowFriendSearch(false)}
        onAddFriend={handleAddFriend}
      />
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
        title="Friends"
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        showAddButton={true}
        onAddClick={() => setShowFriendSearch(true)}
        addButtonTitle="Add friend"
        showFriendRequestsButton={true}
        onFriendRequestsClick={() => setShowFriendRequestsModal(true)}
        friendRequestsCount={friendRequestsCount}
        showSearchButton={true}
        onSearchClick={handleSearchClick}
        isSearchActive={isSearchActive}
        showSearchBar={true}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search friends..."
      />

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {filteredFriends.length === 0 && (
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
                No friends found
              </h3>
              <p style={{ fontSize: "14px", color: theme.textSecondary }}>
                Try a different search term
              </p>
            </div>
          </div>
        )}

        {/* Show friends list */}
        {filteredFriends.map((friend) => (
          <div
            key={friend.user_id}
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
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              marginRight: "12px",
              flexShrink: 0
            }}>
              {friend.username ? friend.username.charAt(0).toUpperCase() : "?"}
            </div>
            
            {/* Friend Info */}
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
                  {friend.username}
                </h3>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexShrink: 0
                }}>
                  <button
                    onClick={() => onOpenChat(friend.user_id, friend.username)}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: theme.primary,
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "500"
                    }}
                  >
                    Message
                  </button>
                </div>
              </div>
              <p style={{ 
                color: theme.textSecondary, 
                margin: 0, 
                fontSize: "12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                @{friend.username}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Friend Requests Modal */}
      <FriendRequestsModal
        isOpen={showFriendRequestsModal}
        onClose={() => setShowFriendRequestsModal(false)}
        requests={friendRequests}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
        isLoading={isLoadingRequests}
      />
    </div>
  );
};

export default FriendsScreen; 