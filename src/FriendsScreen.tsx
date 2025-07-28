import React, { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";
import FriendRequestsModal from "./FriendRequestsModal";
import { useThemedStyles } from "./useThemedStyles";
import { nativeApiService } from "./nativeApiService";

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

interface FriendRequest {
  request_id: string;
  receiver_id: string;
  status: string;
  created_at?: string;
  sender: {
    user_id: string;
    username: string;
    name: string;
    email: string;
  };
}

interface UserSearchResult {
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  verified: boolean;
  created_at?: string;
}

interface FriendsScreenProps {
  onBack: () => void;
  onOpenChat: (friendId: string, friendName: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onBack, onOpenChat, isCollapsed, onToggleCollapse }) => {
  const { user, services } = useAppContext();
  const styles = useThemedStyles();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load friends and pending requests
  useEffect(() => {
    loadFriendsData();
  }, [services.sessionManager.getToken()]);

  const loadFriendsData = async () => {
    if (!user?.tokenHash) return;

    try {
      setIsLoading(true);

      // Token should already be set in native API service by session manager
      // Just ensure it's set
      nativeApiService.setToken(user.tokenHash);

      // Load friends list using native API
      const friendsData = await nativeApiService.getFriends();
      console.log("📋 Friends loaded via native API:", friendsData);
      console.log("🔍 Friends array length:", friendsData?.length || 0);
      console.log("🔍 First friend:", friendsData?.[0]);
      
      // Process friends data to ensure correct structure
      const processedFriends = (friendsData || []).map((friend: any) => ({
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

      // Load friend requests using native API
      try {
        const requestsData = await nativeApiService.getFriendRequests();
        console.log("📋 Friend requests loaded via native API:", requestsData);
        
        // Filter for pending requests only
        const pendingRequestsData = (requestsData || []).filter((request: any) => 
          request.status === 'pending'
        );
        
        setPendingRequests(pendingRequestsData);
        setPendingCount(pendingRequestsData.length);
        console.log("🔍 Pending requests count:", pendingRequestsData.length);
      } catch (requestsError) {
        console.error("❌ Failed to load friend requests:", requestsError);
        setPendingRequests([]);
        setPendingCount(0);
      }
      
    } catch (error) {
      console.error("❌ Failed to load friends data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user?.tokenHash) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      // Token should already be set in native API service by session manager
      // Just ensure it's set
      nativeApiService.setToken(user.tokenHash);
      
      // Use native API to search users
      const searchResults = await nativeApiService.searchUsers(query);
      console.log("🔍 Search results via native API:", searchResults);
      setSearchResults(searchResults || []);
    } catch (error) {
      console.error("❌ Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    if (!user?.tokenHash || !user?.userId) return;

    try {
      const response = await fetch("https://dev.v1.terracrypt.cc/api/v1/friends/request", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.tokenHash}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          receiver_id: userId
        })
      });

      if (response.ok) {
        console.log("✅ Friend request sent successfully");
        // Refresh friends list
        await loadFriendsData();
      } else {
        console.error("❌ Failed to send friend request:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("❌ Error sending friend request:", error);
    }
  };

  const handleFriendRequest = async (requestId: string, status: "accepted" | "rejected") => {
    if (!user?.tokenHash) return;

    try {
      const response = await fetch(`https://dev.v1.terracrypt.cc/api/v1/friends/request/${requestId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${user.tokenHash}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        console.log(`✅ Friend request ${status} successfully`);
        // Refresh friends list and requests
        await loadFriendsData();
      } else {
        console.error(`❌ Failed to ${status} friend request:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`❌ Error ${status}ing friend request:`, error);
    }
  };

  const deleteFriend = async (friendId: string) => {
    if (!user?.tokenHash) return;

    try {
      const response = await fetch(`https://dev.v1.terracrypt.cc/api/v1/friends/${friendId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user.tokenHash}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        console.log("✅ Friend deleted successfully");
        // Refresh friends list
        await loadFriendsData();
      } else {
        console.error("❌ Failed to delete friend:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("❌ Error deleting friend:", error);
    }
  };

  const getUserInitials = (name: string, username: string) => {
    const displayName = name || username;
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter search results to exclude current user and existing friends
  const filteredSearchResults = searchResults.filter(result => 
    result.user_id !== user?.userId && 
    !friends.some(friend => friend.user_id === result.user_id)
  );

  if (showAddFriend) {
    return (
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        backgroundColor: "#333333"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "16px 24px", 
          borderBottom: "1px solid #404040", 
          backgroundColor: "#333333",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <button
            onClick={() => setShowAddFriend(false)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#404040",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px"
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#ffffff", margin: 0 }}>
            Add Friend
          </h1>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 24px", backgroundColor: "#333333", borderBottom: "1px solid #404040" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search by username or email..."
              style={{
                width: "100%",
                paddingLeft: "40px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
                border: "1px solid #404040",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                backgroundColor: "#404040",
                color: "#ffffff"
              }}
            />
            <span style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6b7280",
              fontSize: "16px"
            }}>🔍</span>
          </div>
        </div>

        {/* Search Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {isSearching ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <div style={{
                display: "inline-block",
                width: "32px",
                height: "32px",
                border: "2px solid #404040",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "16px"
              }}></div>
              <p style={{ color: "#9ca3af" }}>Searching...</p>
            </div>
          ) : filteredSearchResults.length === 0 && searchQuery ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <p style={{ color: "#9ca3af" }}>No users found</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredSearchResults.map((result) => (
                <div
                  key={result.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: "#404040",
                    borderRadius: "8px",
                    border: "1px solid #404040"
                  }}
                >
                  <div style={{
                    width: "48px",
                    height: "48px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "500",
                    fontSize: "14px",
                    marginRight: "12px"
                  }}>
                    {getUserInitials(result.name, result.username)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#ffffff", margin: "0 0 2px 0" }}>
                      {result.name || result.username}
                    </h3>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                      @{result.username}
                    </p>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(result.user_id)}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer"
                    }}
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  console.log("🔍 FriendsScreen render - friends length:", friends.length, "isLoading:", isLoading);

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: "#2d2d2d"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid #404040", 
        backgroundColor: "#2d2d2d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",

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
            Friends
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {pendingCount > 0 && (
            <button
              onClick={() => setShowRequestsModal(true)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#f59e0b",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                position: "relative"
              }}
              title={`${pendingCount} friend requests`}
            >
              {pendingCount}
            </button>
          )}
          <button
            onClick={() => setShowAddFriend(true)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#3b82f6",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px"
            }}
          >
            +
          </button>
        </div>
      </div>



      {/* Friends List */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#2d2d2d" }}>
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
                  backgroundColor: "#404040", 
                  borderRadius: "50%",
                  marginRight: "12px"
                }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    height: "16px", 
                    backgroundColor: "#404040", 
                    borderRadius: "4px", 
                    marginBottom: "4px",
                    width: "60%"
                  }}></div>
                  <div style={{ 
                    height: "12px", 
                    backgroundColor: "#404040", 
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
              backgroundColor: "#404040",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <span style={{ fontSize: "32px" }}>👥</span>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", margin: "0 0 8px 0" }}>
              No friends yet
            </h3>
            <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "24px" }}>
              Add friends to start secure conversations
            </p>
            <button
              onClick={() => setShowAddFriend(true)}
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#3b82f6",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              Add Your First Friend
            </button>
          </div>
        ) : (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {friends.map((friend) => (
                <div
                  key={friend.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #404040",
                    backgroundColor: "#404040"
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
                    fontWeight: "500",
                    fontSize: "14px",
                    marginRight: "12px"
                  }}>
                    {getUserInitials(friend.name, friend.username)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#ffffff", margin: "0 0 2px 0" }}>
                      {friend.name || friend.username}
                    </h3>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                      @{friend.username}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => onOpenChat(friend.user_id, friend.name || friend.username)}
                      style={{
                        padding: "8px 16px",
                        border: "none",
                        borderRadius: "6px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer"
                      }}
                    >
                      Message
                    </button>
                    <button
                      onClick={() => deleteFriend(friend.user_id)}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #dc2626",
                        borderRadius: "6px",
                        backgroundColor: "white",
                        color: "#dc2626",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Friend Requests Modal */}
      <FriendRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        requests={pendingRequests}
        onAccept={(requestId) => handleFriendRequest(requestId, "accepted")}
        onDecline={(requestId) => handleFriendRequest(requestId, "rejected")}
        isLoading={isLoading}
      />
    </div>
  );
};

export default FriendsScreen; 