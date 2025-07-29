import React, { useState, useEffect } from 'react';

import { useTheme } from './ThemeContext';
import { friendService } from './friendService';
import { Friend } from './models';

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
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendUsername.trim()) return;

    try {
      setIsAddingFriend(true);
      console.log("🔄 Adding friend:", newFriendUsername);
      
      await friendService.sendFriendRequest(newFriendUsername);
      console.log("✅ Friend request sent successfully");
      
      setNewFriendUsername('');
      setShowAddFriend(false);
      
      // Reload friends to show the new request
      await loadFriends();
    } catch (error) {
      console.error("❌ Failed to add friend:", error);
      setError("Failed to add friend");
    } finally {
      setIsAddingFriend(false);
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

  // Load friends on mount
  useEffect(() => {
    loadFriends();
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
              Friends
            </h2>
            <button
              onClick={() => setShowAddFriend(!showAddFriend)}
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
            Friends
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
              Friends
            </h2>
          </div>
          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
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
            placeholder="Search friends..."
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
        {showAddFriend ? (
          <div style={{ padding: "16px" }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: "600",
              color: theme.text,
              marginBottom: "16px"
            }}>
              Add Friend
            </h3>
            
            <form onSubmit={handleAddFriend}>
              <div style={{ marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={newFriendUsername}
                  onChange={(e) => setNewFriendUsername(e.target.value)}
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
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="submit"
                  disabled={isAddingFriend || !newFriendUsername.trim()}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: theme.primary,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: isAddingFriend ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    opacity: isAddingFriend ? 0.6 : 1
                  }}
                >
                  {isAddingFriend ? "Adding..." : "Add Friend"}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFriend(false);
                    setNewFriendUsername('');
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "transparent",
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : filteredFriends.length === 0 ? (
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