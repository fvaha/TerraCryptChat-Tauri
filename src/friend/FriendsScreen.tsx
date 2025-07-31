import React, { useState, useEffect } from 'react';

import { useTheme } from '../components/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { friendService } from './friendService';
import { Friend } from '../models/models';
import { backgroundSyncManager } from '../services/backgroundSyncManager';
import NewFriendSearch from './NewFriendSearch';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // Load friends
  const loadFriends = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 Loading friends...");
      
      const friendsData = await friendService.getCachedFriendsForCurrentUser();
      console.log("✅ Friends loaded:", friendsData);
      
      if (Array.isArray(friendsData)) {
        setFriends(friendsData);
      } else {
        console.warn("⚠️ Invalid friends data received:", friendsData);
        setFriends([]);
      }
    } catch (error) {
      console.error("❌ Failed to load friends:", error);
      setError("Failed to load friends");
    } finally {
      setIsLoading(false);
    }
  };

  // Add friend function
  const handleAddFriend = async (username: string) => {
    try {
      console.log("🔄 Adding friend:", username);
      
      await friendService.sendFriendRequest(username);
      console.log("✅ Friend request sent successfully");
      
      // Reload friends to show the new request
      await loadFriends();
    } catch (error) {
      console.error("❌ Failed to add friend:", error);
      setError("Failed to add friend");
    }
  };

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => {
    if (!searchQuery.trim()) return true;
    const friendName = (friend.username || '').toLowerCase();
    const friendDisplayName = (friend.name || '').toLowerCase();
    return friendName.includes(searchQuery.toLowerCase()) || 
           friendDisplayName.includes(searchQuery.toLowerCase());
  });

  // Load friends on mount and trigger background sync
  useEffect(() => {
    const initializeScreen = async () => {
      // Load friends from local database first (fast)
      await loadFriends();
      
      // Trigger background delta sync (doesn't affect UI)
      backgroundSyncManager.onFriendsScreenOpened();
    };
    
    initializeScreen();
  }, []);

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
          onAddClick={() => setShowAddFriend(!showAddFriend)}
          addButtonTitle="Add friend"
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
        showSearchBar={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search friends..."
        addButtonTitle="Add friend"
      />

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {filteredFriends.length === 0 ? (
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
                {searchQuery ? "No friends found" : "No friends yet"}
              </h3>
              <p style={{ fontSize: "14px", color: theme.textSecondary }}>
                {searchQuery ? "Try a different search term" : "Add friends to start chatting"}
              </p>
            </div>
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <div
              key={friend.user_id}
              style={{
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "60px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: theme.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: "600",
                    marginRight: "12px"
                  }}
                >
                  {friend.username ? friend.username.charAt(0).toUpperCase() : "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: theme.text, margin: "0 0 4px 0", fontSize: "16px", fontWeight: "500" }}>
                    {friend.username}
                  </h3>
                  <p style={{ color: theme.textSecondary, margin: 0, fontSize: "14px" }}>
                    @{friend.username}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => onOpenChat(friend.user_id, friend.username)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: theme.primary,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}
                >
                  Message
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendsScreen; 