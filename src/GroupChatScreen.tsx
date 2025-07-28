import React, { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";

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
          user_id: user.userId,
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
        const chatId = data.chat_id;
        console.log("✅ Group chat created:", chatId);
        onGroupCreated(chatId, chatName);
      } else {
        console.error("Failed to create group chat:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to create group chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const getUserInitials = (name: string, username: string) => {
    const displayName = name || username;
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canCreateChat = selectedFriends.length > 0;
  const isGroupChat = selectedFriends.length > 1;

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: "#f8fafc" 
    }}>
      {/* Header */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid #e5e7eb", 
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onBack}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px"
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111827", margin: 0 }}>
            New Chat
          </h1>
        </div>
        <button
          onClick={createGroupChat}
          disabled={!canCreateChat || isCreating}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: canCreateChat ? "#3b82f6" : "#d1d5db",
            color: "white",
            fontSize: "14px",
            fontWeight: "500",
            cursor: canCreateChat && !isCreating ? "pointer" : "default",
            opacity: isCreating ? 0.6 : 1
          }}
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Group Name Input (only for groups with 3+ people) */}
      {isGroupChat && (
        <div style={{ padding: "16px 24px", backgroundColor: "white", borderBottom: "1px solid #e5e7eb" }}>
          <label style={{ 
            display: "block", 
            fontSize: "14px", 
            fontWeight: "500", 
            color: "#374151", 
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
              padding: "12px 16px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none"
            }}
          />
          {groupName && (
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
              Group will be named "{groupName}"
            </p>
          )}
        </div>
      )}

      {/* Selected Friends Summary */}
      {selectedFriends.length > 0 && (
        <div style={{ padding: "16px 24px", backgroundColor: "white", borderBottom: "8px solid #f3f4f6" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#374151", margin: "0 0 12px 0" }}>
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
                    backgroundColor: "#eff6ff",
                    borderRadius: "16px",
                    border: "1px solid #bfdbfe"
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
                  <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: "500" }}>
                    {friend.name || friend.username}
                  </span>
                  <button
                    onClick={() => toggleFriendSelection(friendId)}
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: "none",
                      backgroundColor: "#ef4444",
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
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
            {isGroupChat 
              ? `Creating a group chat with ${selectedFriends.length} friends`
              : "Creating a direct chat"
            }
          </div>
        </div>
      )}

      {/* Friends List */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "white" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>
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
                  backgroundColor: "#f3f4f6", 
                  borderRadius: "50%",
                  marginRight: "12px"
                }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    height: "16px", 
                    backgroundColor: "#f3f4f6", 
                    borderRadius: "4px", 
                    marginBottom: "4px",
                    width: "60%"
                  }}></div>
                  <div style={{ 
                    height: "12px", 
                    backgroundColor: "#f3f4f6", 
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
              backgroundColor: "#f3f4f6",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <span style={{ fontSize: "32px" }}>👥</span>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: "0 0 8px 0" }}>
              No friends yet
            </h3>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>
              Add friends first to create chats with them
            </p>
          </div>
        ) : (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend.friend_id);
                
                return (
                  <div
                    key={friend.friend_id}
                    onClick={() => toggleFriendSelection(friend.friend_id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px",
                      borderRadius: "8px",
                      border: `1px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
                      backgroundColor: isSelected ? "#eff6ff" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{
                      width: "48px",
                      height: "48px",
                      background: isSelected 
                        ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                        : "linear-gradient(135deg, #6b7280, #4b5563)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "500",
                      fontSize: "14px",
                      marginRight: "12px"
                    }}>
                      {getUserInitials(friend.name, friend.username)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: "14px", 
                        fontWeight: "500", 
                        color: isSelected ? "#1e40af" : "#111827", 
                        margin: "0 0 2px 0" 
                      }}>
                        {friend.name || friend.username}
                      </h3>
                      <p style={{ 
                        fontSize: "12px", 
                        color: isSelected ? "#3b82f6" : "#6b7280", 
                        margin: 0 
                      }}>
                        @{friend.username}
                      </p>
                    </div>
                    <div style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: `2px solid ${isSelected ? "#3b82f6" : "#d1d5db"}`,
                      backgroundColor: isSelected ? "#3b82f6" : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {isSelected && (
                        <span style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}>✓</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                <span style={{ fontSize: "16px" }}>💬</span>
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