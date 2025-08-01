import React, { useState, useEffect } from "react";
import { useAppContext } from "../AppContext";
import { useTheme } from "../components/ThemeContext";

interface Friend {
  friend_id: string;
  username: string;
  name: string;
  email: string;
}

interface GroupChatScreenProps {
  onBack: () => void;
  onGroupCreated: (chatId: string, chatName: string) => void;
}

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ onBack, onGroupCreated }) => {
  const { token, user } = useAppContext();
  const { theme } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Load friends list
  useEffect(() => {
    loadFriends();
  }, [token]);

  const loadFriends = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch("https://dev.v1.terracrypt.cc/api/v1/friends", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const createGroupChat = async () => {
    if (selectedFriends.length < 1 || !token || !user) return;

    try {
      setIsCreating(true);

      // Determine if it's a group chat (3+ people including current user)
      const isGroup = selectedFriends.length > 1;
      
      // Create chat name
      const chatName = isGroup && groupName.trim() 
        ? groupName.trim()
        : isGroup 
          ? `Group with ${selectedFriends.length} friends`
          : friends.find(f => f.friend_id === selectedFriends[0])?.name || "Direct Chat";

      // Prepare members list (include current user)
      const members = [
        {
          user_id: user.user_id,
          is_admin: true
        },
        ...selectedFriends.map(friendId => ({
          user_id: friendId,
          is_admin: false
        }))
      ];

      const response = await fetch("https://dev.v1.terracrypt.cc/api/v1/chats", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: chatName,
          is_group: isGroup,
          members: members
        })
      });

      if (response.ok) {
        const data = await response.json();
        onGroupCreated(data.chat_id, chatName);
      } else {
        console.error("Failed to create chat");
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const getUserInitials = (name: string, username: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : username.charAt(0).toUpperCase();
  };

  const isGroupChat = selectedFriends.length > 1;
  const canCreateChat = selectedFriends.length > 0 && (!isGroupChat || groupName.trim() || selectedFriends.length > 2);

  if (isLoading) {
    return (
      <div style={{ 
        height: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: theme.background
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: `4px solid ${theme.border}`,
            borderTop: `4px solid ${theme.primary}`,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }}></div>
          <p style={{ color: theme.textSecondary }}>Loading friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: theme.background
    }}>
      {/* Header */}
      <div style={{ 
        padding: "12px 16px", 
        borderBottom: `1px solid ${theme.border}`, 
        backgroundColor: theme.sidebar,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.hover;
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = theme.textSecondary;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: "600", color: theme.text, margin: 0 }}>
            New Chat
          </h1>
        </div>
        <button
          onClick={createGroupChat}
          disabled={!canCreateChat || isCreating}
          style={{
            padding: "6px 12px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: canCreateChat ? theme.primary : theme.border,
            color: "white",
            fontSize: "13px",
            fontWeight: "500",
            cursor: canCreateChat && !isCreating ? "pointer" : "default",
            opacity: isCreating ? 0.6 : 1,
            transition: "all 0.2s ease"
          }}
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Group Name Input (only for groups with 3+ people) */}
      {isGroupChat && (
        <div style={{ padding: "12px 16px", backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
          <label style={{ 
            display: "block", 
            fontSize: "13px", 
            fontWeight: "500", 
            color: theme.text, 
            marginBottom: "8px" 
          }}>
            Group Name (Optional)
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name..."
            style={{
              width: "100%",
              padding: "6px 10px",
              border: `1px solid ${theme.border}`,
              borderRadius: "6px",
              fontSize: "13px",
              outline: "none",
              backgroundColor: theme.inputBackground,
              color: theme.text
            }}
          />
          {groupName && (
            <p style={{ fontSize: "12px", color: theme.textSecondary, margin: "4px 0 0 0" }}>
              Group will be named "{groupName}"
            </p>
          )}
        </div>
      )}

      {/* Selected Friends Summary */}
      {selectedFriends.length > 0 && (
        <div style={{ padding: "12px 16px", backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ fontSize: "13px", fontWeight: "500", color: theme.text, margin: "0 0 12px 0" }}>
            Selected ({selectedFriends.length})
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {selectedFriends.map(friendId => {
              const friend = friends.find(f => f.friend_id === friendId);
              if (!friend) return null;
              
              return (
                <div
                  key={friendId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    backgroundColor: theme.primary + "20",
                    borderRadius: "16px",
                    border: `1px solid ${theme.primary}`
                  }}
                >
                  <div style={{
                    width: "24px",
                    height: "24px",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "500",
                    fontSize: "10px"
                  }}>
                    {getUserInitials(friend.name, friend.username)}
                  </div>
                  <span style={{ fontSize: "12px", color: theme.primary, fontWeight: "500" }}>
                    {friend.name || friend.username}
                  </span>
                  <button
                    onClick={() => toggleFriendSelection(friendId)}
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: "none",
                      backgroundColor: theme.error,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "10px"
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: theme.textSecondary }}>
            {isGroupChat 
              ? `This will create a group chat with ${selectedFriends.length + 1} people (including you)`
              : "This will create a direct message with the selected friend"
            }
          </div>
        </div>
      )}

      {/* Friends List */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: theme.background }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: 0 }}>
            Select Friends
          </h2>
        </div>

        {isLoading ? (
          <div style={{ padding: "24px" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "12px 0", 
                marginBottom: "8px" 
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
                    marginBottom: "4px",
                    width: "60%"
                  }}></div>
                  <div style={{ 
                    height: "12px", 
                    backgroundColor: theme.border, 
                    borderRadius: "4px", 
                    width: "40%"
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            padding: "64px 24px",
            textAlign: "center"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              backgroundColor: theme.border,
              borderRadius: "50%",
              marginBottom: "16px"
            }}></div>
            <h3 style={{ fontSize: "16px", fontWeight: "500", color: theme.text, margin: "0 0 8px 0" }}>
              No friends found
            </h3>
            <p style={{ fontSize: "14px", color: theme.textSecondary, margin: 0 }}>
              Add some friends to start chatting
            </p>
          </div>
        ) : (
          <div style={{ padding: "0" }}>
            {friends.map(friend => (
              <div
                key={friend.friend_id}
                onClick={() => toggleFriendSelection(friend.friend_id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                  backgroundColor: selectedFriends.includes(friend.friend_id) ? theme.primary + "20" : "transparent",
                  borderLeft: `3px solid ${selectedFriends.includes(friend.friend_id) ? theme.primary : "transparent"}`,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (!selectedFriends.includes(friend.friend_id)) {
                    e.currentTarget.style.backgroundColor = theme.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedFriends.includes(friend.friend_id)) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "16px",
                  marginRight: "12px",
                  flexShrink: 0
                }}>
                  {getUserInitials(friend.name, friend.username)}
                </div>
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
                      {friend.name || friend.username}
                    </h3>
                    {selectedFriends.includes(friend.friend_id) && (
                      <div style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: theme.primary,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        
                      </div>
                    )}
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
        )}
      </div>

      {/* Bottom Action */}
      {canCreateChat && (
        <div style={{ 
          padding: "16px 24px", 
          backgroundColor: "white", 
          borderTop: "1px solid #e5e7eb" 
        }}>
          <div style={{ 
            textAlign: "center", 
            fontSize: "14px", 
            color: "#6b7280",
            marginBottom: "12px"
          }}>
            {isGroupChat 
              ? `Ready to create group chat with ${selectedFriends.length} friends`
              : "Ready to create direct chat"
            }
          </div>
          <button
            onClick={createGroupChat}
            disabled={isCreating}
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#3b82f6",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: isCreating ? "default" : "pointer",
              opacity: isCreating ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            {isCreating ? (
              <>
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                Creating Chat...
              </>
            ) : (
              <>
                <span style={{ fontSize: "16px" }}></span>
                {isGroupChat ? "Create Group Chat" : "Start Direct Chat"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupChatScreen; 