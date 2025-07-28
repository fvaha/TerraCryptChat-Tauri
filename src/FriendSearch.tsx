import { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";
import { sendFriendRequest, getFriendRequests } from "./chatRequestService";
import { FriendEntity } from "./models";
import { databaseService } from "./databaseService";
import { nativeApiService } from "./nativeApiService";

type User = {
  user_id: string;
  name: string;
  username: string;
  email: string;
  picture?: string;
  verified: boolean;
};

type Props = {
  token: string;
};

export default function FriendSearch({ token }: Props) {
  const { user } = useAppContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendEntity[]>([]);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Search users with filtering (like Kotlin implementation)
  const search = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setMessage("");
      
      // Get current user ID
      const currentUserId = user?.userId;
      if (!currentUserId) {
        setMessage("User not authenticated");
        return;
      }

      // Set token in native API service
      nativeApiService.setToken(token);

      // Get existing friends to filter out
      const existingFriends = await databaseService.getAllFriends();
      const existingFriendIds = new Set(existingFriends.map(f => f.friend_id));

      // Get pending requests to filter out
      const pendingRequests = await getFriendRequests(token);
      const pendingSenderIds = new Set(pendingRequests.map((r: any) => r.sender.user_id));

      // Search users via native API service (like Kotlin)
      const allResults = await nativeApiService.searchUsers(query);
      
      // Filter results like Kotlin implementation
      const filteredResults = allResults
        .filter(user => 
          user.user_id !== currentUserId &&
          !existingFriendIds.has(user.user_id) &&
          !pendingSenderIds.has(user.user_id)
        )
        .slice(0, 7) // Limit to 7 results like Kotlin
        .map(user => ({
          friendId: user.user_id,
          username: user.username,
          name: user.name,
          email: user.email,
          picture: user.picture,
          isFavorite: false,
          createdAt: undefined,
          updatedAt: undefined,
          status: undefined
        } as FriendEntity));

      console.log("🔍 Search results:", filteredResults);
      setResults(filteredResults);
      
      if (filteredResults.length === 0) {
        setMessage("No users found matching your search");
      }
    } catch (error) {
      console.error("❌ Search error:", error);
      setMessage("Failed to search users. Please try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Send friend request using chatRequestService
  const sendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(token, userId);
      setMessage("Friend request sent successfully!");
      
      // Remove the user from results since request was sent
      setResults(prev => prev.filter(user => user.friendId !== userId));
    } catch (error) {
      console.error("❌ Error sending friend request:", error);
      setMessage("Failed to send friend request. Please try again.");
    }
  };

  // Auto-search when query changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        search();
      } else {
        setResults([]);
        setMessage("");
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div style={{ padding: "16px" }}>
      <h3 style={{ marginBottom: "16px" }}>Find Friends</h3>
      <div style={{ marginBottom: "16px" }}>
        <input 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Search users by username or name..." 
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "14px",
            outline: "none"
          }}
          onFocus={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.borderColor = "#0078d4";
          }}
          onBlur={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.borderColor = "#ddd";
          }}
        />
      </div>
      
      {isSearching && (
        <div style={{ 
          textAlign: "center", 
          padding: "20px",
          color: "#666"
        }}>
          Searching...
        </div>
      )}
      
      {results.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "#666" }}>
            Found {results.length} user{results.length !== 1 ? 's' : ''}
          </h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {results.map((user) => (
              <li key={user.friendId} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                border: "1px solid #eee",
                borderRadius: "8px",
                marginBottom: "12px",
                backgroundColor: "white"
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#0078d4",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "14px",
                    marginRight: "12px"
                  }}>
                    {(user.name || user.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>
                      {user.name || user.username}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      @{user.username}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => sendRequest(user.friendId)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = "#218838";
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = "#28a745";
                  }}
                >
                  Add Friend
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {message && (
        <div style={{ 
          padding: "12px", 
          backgroundColor: message.includes("successfully") ? "#d4edda" : "#f8d7da",
          color: message.includes("successfully") ? "#155724" : "#721c24",
          borderRadius: "6px",
          marginTop: "12px",
          fontSize: "14px"
        }}>
          {message}
        </div>
      )}
    </div>
  );
}