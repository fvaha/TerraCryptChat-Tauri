import React, { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeContext';
import { useThemedStyles } from '../components/useThemedStyles';
import { friendService } from './friendService';

interface NewFriendSearchProps {
  onBack: () => void;
  onAddFriend: (username: string, userId: string) => void;
}

interface SearchResult {
  user_id: string;
  username: string;
  name?: string;
  email?: string;
  picture?: string;
}

const NewFriendSearch: React.FC<NewFriendSearchProps> = ({ onBack, onAddFriend }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});
  const [userTimeouts, setUserTimeouts] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
  const { theme } = useTheme();
  const themedStyles = useThemedStyles();

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      Object.values(userTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [userTimeouts]);

  // Create an instance of FriendService
  // const friendService = new FriendService(); // This line is removed

  const search_users = async (query: string) => {
    console.log(" searchUsers called with query:", query);
    
    if (!query.trim()) {
      console.log(" Empty query, clearing results");
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(" Searching users with query:", query);
      console.log(" Query length:", query.length);
      console.log(" friendService available:", !!friendService);
      console.log(" friendService.searchUsers available:", !!friendService.search_users);
      
      // Use the same API call as in FriendsScreen
      const results = await friendService.search_users(query);
      console.log(" Search results received:", results);
      console.log(" Number of results:", results?.length || 0);
      console.log(" Results type:", typeof results);
      console.log(" Is array:", Array.isArray(results));
      
      setSearchResults(results || []);
    } catch (error) {
      console.error(" Failed to search users:", error);
      console.error(" Error details:", error);
      setError("Failed to search users");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search - matches Kotlin's onDebouncedQueryChange
  useEffect(() => {
    console.log(" useEffect triggered with searchQuery:", searchQuery);
    
    const timeoutId = setTimeout(() => {
      console.log(" Debounced search executing with query:", searchQuery);
      if (searchQuery.trim()) {
        console.log(" Calling searchUsers with:", searchQuery);
        search_users(searchQuery);
      } else {
        console.log(" Empty query, clearing results");
        setSearchResults([]);
      }
    }, 150); // Reduced from 300ms to 150ms for faster response

    console.log(" Setting timeout for search");
    return () => {
      console.log(" Clearing timeout");
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const handleSendFriendRequest = async (userId: string) => {
    try {
      console.log(` [NewFriendSearch] handleAddFriend called with:`, { userId });
      console.log(` [NewFriendSearch] Clearing previous errors...`);
      
      // Clear any existing error for this user
      setUserErrors(prev => ({ ...prev, [userId]: "" }));
      setError(null);
      
      console.log(` [NewFriendSearch] Calling friendService.send_friend_request(${userId})...`);
      await friendService.send_friend_request(userId);
      console.log(` [NewFriendSearch] Friend request sent successfully to: ${userId}`);
      
      console.log(` [NewFriendSearch] Calling onAddFriend callback...`);
      onAddFriend(userId, userId); // Assuming userId is the username and user_id
      
      console.log(` [NewFriendSearch] Showing success message...`);
      // Show success message briefly for this user
      setUserErrors(prev => ({ ...prev, [userId]: "Friend request sent successfully!" }));
      
      // Clear any existing timeout for this user
      if (userTimeouts[userId]) {
        clearTimeout(userTimeouts[userId]);
      }
      
      const timeout = setTimeout(() => {
        console.log(` [NewFriendSearch] Clearing success message...`);
        setUserErrors(prev => ({ ...prev, [userId]: "" }));
        // Remove timeout reference
        setUserTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[userId];
          return newTimeouts;
        });
      }, 1500);
      
      // Store timeout reference
      setUserTimeouts(prev => ({ ...prev, [userId]: timeout }));
    } catch (error) {
      console.error(` [NewFriendSearch] Failed to send friend request:`);
      console.error(` [NewFriendSearch] Error type:`, typeof error);
      console.error(` [NewFriendSearch] Error message:`, error);
      console.error(` [NewFriendSearch] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      
      // Handle specific error cases gracefully
      let errorMessage = "Failed to send friend request";
      if (typeof error === 'string') {
        if (error.includes("already exists") || error.includes("409") || error.includes("Conflict")) {
          errorMessage = "Friend request already sent";
        } else if (error.includes("not found") || error.includes("404")) {
          errorMessage = "User not found";
        } else if (error.includes("unauthorized") || error.includes("401")) {
          errorMessage = "Session expired, please login again";
        } else if (error.includes("already your friend")) {
          errorMessage = "User is already your friend";
        } else if (error.includes("already sent")) {
          errorMessage = "Friend request already sent";
        }
      } else if (error instanceof Error) {
        if (error.message.includes("already exists") || error.message.includes("409") || error.message.includes("Conflict")) {
          errorMessage = "Friend request already sent";
        } else if (error.message.includes("not found") || error.message.includes("404")) {
          errorMessage = "User not found";
        } else if (error.message.includes("unauthorized") || error.message.includes("401")) {
          errorMessage = "Session expired, please login again";
        } else if (error.message.includes("already your friend")) {
          errorMessage = "User is already your friend";
        } else if (error.message.includes("already sent")) {
          errorMessage = "Friend request already sent";
        }
      }
      
      // Set error for this specific user
      setUserErrors(prev => ({ ...prev, [userId]: errorMessage }));
    }
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: theme.background
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.sidebar
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <button
            onClick={onBack}
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
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: theme.text,
            margin: 0
          }}>
            Add Friend
          </h2>
        </div>

        {/* Search Input */}
        <div style={{ marginTop: "12px" }}>
          <input
            type="text"
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => {
              console.log(" Search input changed:", e.target.value);
              setSearchQuery(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              fontSize: "14px",
              outline: "none",
              transition: "all 0.2s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = theme.primary;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.border;
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        overflowX: "hidden",
        ...themedStyles.scrollbar
      }}>
        {isLoading && (
          <div style={{ padding: "16px", textAlign: "center" }}>
            <p style={{ color: theme.textSecondary, fontSize: "14px" }}>
              Searching...
            </p>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: "16px", 
            margin: "16px",
            backgroundColor: theme.errorBackground || "#fee",
            border: `1px solid ${theme.error || "#f56565"}`,
            borderRadius: "8px",
            color: theme.error || "#f56565"
          }}>
            {error}
          </div>
        )}

        {!isLoading && searchResults.length === 0 && searchQuery.trim() && (
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
                No users found
              </h3>
              <p style={{ fontSize: "14px", color: theme.textSecondary }}>
                Try a different search term
              </p>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.map((user) => (
          <div key={user.user_id}>
            <div
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
                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
              </div>
              
              {/* User Info */}
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
                    {user.username}
                  </h3>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0
                  }}>
                    <button
                      onClick={() => handleSendFriendRequest(user.user_id)}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: theme.primary,
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: "500",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      Add Friend
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
                  @{user.username}
                </p>
              </div>
            </div>
            
            {/* Per-user error message */}
            {userErrors[user.user_id] && (
              <div style={{
                padding: "8px 16px",
                margin: "0 16px 8px 16px",
                backgroundColor: userErrors[user.user_id].includes("successfully") 
                  ? "#d4edda"
                  : (theme.errorBackground || "#fee"),
                border: `1px solid ${
                  userErrors[user.user_id].includes("successfully")
                    ? "#28a745"
                    : (theme.error || "#f56565")
                }`,
                borderRadius: "4px",
                color: userErrors[user.user_id].includes("successfully")
                  ? "#28a745"
                  : (theme.error || "#f56565"),
                fontSize: "12px",
                textAlign: "center"
              }}>
                {userErrors[user.user_id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewFriendSearch;
