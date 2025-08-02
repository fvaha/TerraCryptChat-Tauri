import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { useTheme } from '../components/ThemeContext';
import { nativeApiService } from '../api/nativeApiService';
import { friendService } from '../friend/friendService';

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

interface CreateChatFormProps {
  onCreated: (chatId: string) => void;
  onCancel: () => void;
}

export default function CreateChatForm({ onCreated, onCancel }: CreateChatFormProps) {
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [error, setError] = useState("");
  const { theme } = useTheme();
  const { user, services } = useAppContext();

  // Load friends on component mount
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true);
      const friendsData = await friendService.getCachedFriendsForCurrentUser();
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
      
      // Get current user token
      const token = services.sessionManager.getToken();
      if (!token) {
        throw new Error("No token available");
      }
      
      // Create one-to-one chat
      const chatName = `Direct message with ${selectedFriend.username}`;
      const members = [
        { user_id: selectedFriend.user_id, is_admin: false }
      ];

      const chatId = await nativeApiService.createChat(chatName, false, members);
      
      console.log("Chat created successfully with ID:", chatId);
      onCreated(chatId);
      
    } catch (error) {
      console.error("Failed to create chat:", error);
      setError("Failed to create chat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.background,
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: theme.text,
            margin: 0
          }}>
            Create New Chat
          </h2>
          <button
            onClick={onCancel}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: theme.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surface,
              color: theme.text,
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: theme.error,
            color: 'white',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Friends List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '20px'
        }}>
          {isLoadingFriends ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
              color: theme.textSecondary
            }}>
              Loading friends...
            </div>
          ) : filteredFriends.length === 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
              color: theme.textSecondary
            }}>
              {searchQuery ? 'No friends found' : 'No friends available'}
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = selectedFriends.find(f => f.user_id === friend.user_id);
              return (
                <div
                  key={friend.user_id}
                  onClick={() => toggleFriendSelection(friend)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? theme.primary : 'transparent',
                    color: isSelected ? 'white' : theme.text,
                    marginBottom: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : theme.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: isSelected ? 'white' : 'white'
                  }}>
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Friend Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '2px'
                    }}>
                      {friend.username}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: 0.7
                    }}>
                      {friend.name || friend.email}
                    </div>
                  </div>
                  
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: 'transparent',
              color: theme.text,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateChat}
            disabled={isLoading || selectedFriends.length === 0}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: selectedFriends.length === 0 ? theme.border : theme.primary,
              color: selectedFriends.length === 0 ? theme.textSecondary : 'white',
              cursor: selectedFriends.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Creating...' : 'Create Chat'}
          </button>
        </div>
      </div>
    </div>
  );
} 