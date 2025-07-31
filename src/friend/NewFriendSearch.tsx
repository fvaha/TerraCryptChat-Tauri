import React, { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeContext';
import { friendService } from './friendService';
import { UserEntity } from '../models/models';

interface NewFriendSearchProps {
  onBack: () => void;
  onAddFriend: (username: string) => void;
}

const NewFriendSearch: React.FC<NewFriendSearchProps> = ({ onBack, onAddFriend }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      console.log("🔍 Searching users:", query);
      
      const results = await friendService.searchUsers(query);
      console.log("✅ Search results:", results);
      
      setSearchResults(results || []);
    } catch (error) {
      console.error("❌ Failed to search users:", error);
      setError("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddFriend = async (username: string) => {
    try {
      await friendService.sendFriendRequest(username);
      console.log("✅ Friend request sent to:", username);
      onAddFriend(username);
    } catch (error) {
      console.error("❌ Failed to send friend request:", error);
      setError("Failed to send friend request");
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
        padding: "16px",
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
              <polyline points="15,18 9,12 15,6"/>
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
        {error && (
          <div style={{
            padding: "16px",
            margin: "16px",
            backgroundColor: theme.error,
            color: "white",
            borderRadius: "8px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        {isSearching && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}>
            <div style={{
              width: "24px",
              height: "24px",
              border: `2px solid ${theme.border}`,
              borderTop: `2px solid ${theme.primary}`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            <span style={{
              marginLeft: "12px",
              fontSize: "14px",
              color: theme.textSecondary
            }}>
              Searching...
            </span>
          </div>
        )}

        {!isSearching && searchQuery && searchResults.length === 0 && (
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

        {!isSearching && !searchQuery && (
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
                Search for users
              </h3>
              <p style={{ fontSize: "14px", color: theme.textSecondary }}>
                Enter a username to find and add friends
              </p>
            </div>
          </div>
        )}

        {searchResults.map((user) => (
          <div
            key={user.user_id}
            style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              padding: "16px",
              margin: "12px",
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
                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: theme.text, margin: "0 0 4px 0", fontSize: "16px", fontWeight: "500" }}>
                  {user.username}
                </h3>
                <p style={{ color: theme.textSecondary, margin: 0, fontSize: "14px" }}>
                  @{user.username}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleAddFriend(user.username)}
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
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewFriendSearch; 