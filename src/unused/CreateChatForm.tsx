import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../AppContext';
import { useTheme } from '../components/ThemeContext';
import { useThemedStyles } from '../components/useThemedStyles';
import { nativeApiService } from '../api/nativeApiService';

interface Friend {
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  status?: string;
  created_at?: string;
  is_favorite?: boolean;
}

type Props = {
  token: string;
  onCreated: () => void;
  onCancel: () => void;
};

export default function CreateChatForm({ token, onCreated, onCancel }: Props) {
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [error, setError] = useState("");
  const styles = useThemedStyles();
  const { isDarkMode } = useTheme();
  const { user } = useAppContext();

  // Load friends on component mount
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true);
      const friendsData = await nativeApiService.getFriends();
      const processedFriends = (friendsData || []).map((friend: { user_id: string; username: string; name: string; email: string; picture?: string; status?: string; created_at?: string; is_favorite?: boolean }) => ({
        user_id: friend.user_id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        picture: friend.picture,
        status: friend.status || "active",
        created_at: friend.created_at,
        is_favorite: friend.is_favorite || false
      }));
      setFriends(processedFriends);
    } catch (error) {
      console.error("Failed to load friends:", error);
      setError("Failed to load friends.");
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friend: Friend) => {
    if (selectedFriends.find(f => f.user_id === friend.user_id)) {
      setSelectedFriends(selectedFriends.filter(f => f.user_id !== friend.user_id));
    } else {
      // For one-on-one chat, only allow one friend
      setSelectedFriends([friend]);
    }
  };

  const handleCreateChat = async () => {
    if (selectedFriends.length === 0) {
      setError("Please select a friend to start a chat.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const selectedFriend = selectedFriends[0];
      
      // Create chat with the selected friend
      const members = [
        { user_id: user?.user_id, is_admin: true },
        { user_id: selectedFriend.user_id }
      ];

      await invoke("create_chat", {
        token,
        members: JSON.stringify(members),
        is_group: false
      });
      
      onCreated();
    } catch (error) {
      console.error("Failed to create chat:", error);
      setError("Failed to create chat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: "clamp(1.5rem, 4vw, 2rem)",
      maxWidth: "min(500px, 90vw)",
      width: "100%",
      borderRadius: "16px",
      ...styles.surface,
      border: `1px solid ${styles.theme.border}`,
      boxShadow: isDarkMode 
        ? "0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)"
        : "0 20px 40px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      backdropFilter: "blur(8px)",
      position: "relative",
      zIndex: 1,
      animation: "fadeInUp 0.5s ease-out"
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "clamp(1rem, 3vw, 1.5rem)" 
      }}>
        <h3 style={{ 
          fontSize: "clamp(16px, 3.5vw, 20px)",
          fontWeight: "600",
          ...styles.text,
          margin: 0
        }}>
          New Chat
        </h3>
        <button
          onClick={onCancel}
          style={{
            width: "clamp(32px, 6vw, 40px)",
            height: "clamp(32px, 6vw, 40px)",
            borderRadius: "8px",
            border: `1px solid ${styles.theme.border}`,
            backgroundColor: styles.theme.surface,
            color: styles.theme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "clamp(14px, 3vw, 16px)",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}
          title="Cancel"
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.transform = "scale(1.05)";
            (e.target as HTMLButtonElement).style.borderColor = styles.theme.error;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.transform = "scale(1)";
            (e.target as HTMLButtonElement).style.borderColor = styles.theme.border;
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "clamp(1rem, 2.5vw, 1.25rem)" }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "clamp(12px, 2.5vw, 16px) clamp(12px, 2.5vw, 16px) clamp(12px, 2.5vw, 16px) 40px",
              border: `1px solid ${styles.theme.border}`,
              borderRadius: "10px",
              backgroundColor: styles.theme.surface,
              color: styles.theme.text,
              outline: "none",
              fontSize: "clamp(14px, 2.5vw, 16px)",
              fontWeight: "400",
              transition: "all 0.2s ease",
              boxSizing: "border-box",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = styles.theme.primary;
              e.target.style.boxShadow = `0 0 0 2px ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = styles.theme.border;
              e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
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
        maxHeight: "300px", 
        overflowY: "auto", 
        marginBottom: "clamp(1rem, 2.5vw, 1.25rem)",
        border: `1px solid ${styles.theme.border}`,
        borderRadius: "10px",
        backgroundColor: styles.theme.surface
      }}>
        {isLoadingFriends ? (
          <div style={{ 
            padding: "clamp(1rem, 3vw, 1.5rem)", 
            textAlign: "center",
            color: styles.theme.textSecondary
          }}>
            Loading friends...
          </div>
        ) : filteredFriends.length === 0 ? (
          <div style={{ 
            padding: "clamp(1rem, 3vw, 1.5rem)", 
            textAlign: "center",
            color: styles.theme.textSecondary
          }}>
            {searchQuery ? "No friends found." : "No friends available."}
          </div>
        ) : (
          filteredFriends.map((friend) => {
            const isSelected = selectedFriends.find(f => f.user_id === friend.user_id);
            return (
              <div
                key={friend.user_id}
                onClick={() => toggleFriendSelection(friend)}
                style={{
                  padding: "clamp(12px, 2.5vw, 16px)",
                  borderBottom: `1px solid ${styles.theme.border}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.2s ease",
                  backgroundColor: isSelected ? (isDarkMode ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)") : "transparent"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? "rgba(156, 163, 175, 0.1)" : "rgba(156, 163, 175, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {/* User Avatar */}
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: isSelected ? styles.theme.primary : styles.theme.textSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  {friend.username.charAt(0).toUpperCase()}
                </div>
                
                {/* Friend Info */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "clamp(14px, 2.5vw, 16px)",
                    fontWeight: "600",
                    color: styles.theme.text,
                    marginBottom: "2px"
                  }}>
                    {friend.username}
                  </div>
                  <div style={{
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    color: styles.theme.textSecondary
                  }}>
                    {friend.name}
                  </div>
                </div>

                {/* Selection Indicator */}
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: `2px solid ${isSelected ? styles.theme.primary : styles.theme.border}`,
                  backgroundColor: isSelected ? styles.theme.primary : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div style={{ 
          color: styles.theme.error,
          marginBottom: "clamp(0.75rem, 2vw, 1rem)",
          padding: "clamp(8px, 2vw, 12px)",
          backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "rgba(220, 38, 38, 0.1)",
          borderRadius: "8px",
          border: `1px solid ${styles.theme.error}`,
          fontSize: "clamp(12px, 2.5vw, 14px)",
          fontWeight: "500",
          animation: "shake 0.4s ease-in-out"
        }}>
          {error}
        </div>
      )}

      {/* Buttons */}
      <div style={{
        display: "flex",
        gap: "clamp(0.5rem, 2vw, 0.75rem)",
        justifyContent: "flex-end"
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "clamp(10px, 2vw, 14px) clamp(16px, 3vw, 20px)",
            backgroundColor: "transparent",
            color: styles.theme.textSecondary,
            border: `1px solid ${styles.theme.border}`,
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "clamp(13px, 2.5vw, 15px)",
            fontWeight: "600",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = isDarkMode ? "rgba(156, 163, 175, 0.1)" : "rgba(156, 163, 175, 0.05)";
            (e.target as HTMLButtonElement).style.borderColor = styles.theme.textSecondary;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.target as HTMLButtonElement).style.borderColor = styles.theme.border;
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreateChat}
          disabled={isLoading || selectedFriends.length === 0}
          style={{
            padding: "clamp(10px, 2vw, 14px) clamp(16px, 3vw, 20px)",
            backgroundColor: isLoading || selectedFriends.length === 0 ? styles.theme.textSecondary : styles.theme.primary,
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isLoading || selectedFriends.length === 0 ? "not-allowed" : "pointer",
            fontSize: "clamp(13px, 2.5vw, 15px)",
            fontWeight: "600",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
          onMouseEnter={(e) => {
            if (!isLoading && selectedFriends.length > 0) {
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && selectedFriends.length > 0) {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
            }
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: "14px",
                height: "14px",
                border: "2px solid transparent",
                borderTop: "2px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              Creating...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Start Chat
            </>
          )}
        </button>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
