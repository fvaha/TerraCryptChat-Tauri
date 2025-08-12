import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { useTheme } from '../components/ThemeContext';
import { useThemedStyles } from '../components/useThemedStyles';
import { friendService } from '../friend/friendService';
import { nativeApiService, ParticipantSimple } from '../api/nativeApiService';

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

interface FriendData {
  user_id: string;
  username: string;
  name: string;
  email: string;
  picture?: string;
  status?: string;
  created_at?: number;
  is_favorite?: boolean;
}

interface CreateChatFormProps {
  onCreated: (chatId: string) => void;
  onCancel: () => void;
}

export default function CreateChatForm({ onCreated, onCancel }: CreateChatFormProps) {
  // Temporary flag to disable group chat creation
  // To re-enable group chats, change this to: const GROUP_CHAT_DISABLED = false;
  const GROUP_CHAT_DISABLED = true;
  
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [error, setError] = useState("");
  const [showGroupConfirm, setShowGroupConfirm] = useState(false);
  const [isGroupNameFocused, setIsGroupNameFocused] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { theme } = useTheme();
  const themedStyles = useThemedStyles();
  const { token } = useAppContext();

  // Random group name generation
  const generateRandomGroupName = () => {
    const prefixes = ["Encrypted", "Quantum", "Zero-Day", "Neural", "Dark", "Cyber", "Silent", "Ghost", "Stealth", "Synthetic", "AI", "Coded", "Parallel", "Omega", "Secure", "Echo", "Nano", "Meta"];
    const cores = ["Protocol", "Collective", "Cluster", "Core", "Link", "Vault", "Syndicate", "Unit", "Matrix", "Grid", "Node", "Shell", "Instance", "Wave", "Process", "Net", "Nexus", "Construct", "Fabric"];
    const suffixes = ["", "Group", "Ops", "Initiative", "Hub", "Division", "Zone", "Array", "Beacon", "Assembly", "Sector"];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const core = cores[Math.floor(Math.random() * cores.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    let name = [prefix, core, suffix].filter(part => part !== "").join(" ");
    
    if (Math.random() > 0.5) {
      name += ` #${Math.floor(Math.random() * 9999) + 1}`;
    }
    
    return name;
  };

  const triggerRandomName = () => {
    setGroupName(generateRandomGroupName());
  };

  // Load friends on component mount
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true);
      const friendsData = await friendService.get_cached_friends_for_current_user();
      const processedFriends = (friendsData || []).map((friend: FriendData) => ({
        user_id: friend.user_id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        picture: friend.picture,
        status: friend.status || "active",
        created_at: friend.created_at?.toString(),
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
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friend: Friend) => {
    if (selectedFriends.find(f => f.user_id === friend.user_id)) {
      const newSelectedFriends = selectedFriends.filter(f => f.user_id !== friend.user_id);
      setSelectedFriends(newSelectedFriends);
      
      // Clear group name if this becomes a one-on-one chat
      if (newSelectedFriends.length === 1) {
        setGroupName('');
      }
    } else {
      if (GROUP_CHAT_DISABLED) {
        // When group chats are disabled, only allow one friend
        setSelectedFriends([friend]);
        setGroupName('');
      } else {
        // Allow multiple friends for group chats
        const newSelectedFriends = [...selectedFriends, friend];
        setSelectedFriends(newSelectedFriends);
        
        // Auto-generate group name if this becomes a group chat and no name is set
        if (newSelectedFriends.length === 2 && groupName.trim() === '') {
          setGroupName(generateRandomGroupName());
        }
      }
    }
  };

  const isGroupChat = GROUP_CHAT_DISABLED ? false : selectedFriends.length > 1;
  const canCreateChat = selectedFriends.length > 0 && (!isGroupChat || groupName.trim().length > 0);

  const handleCreateChat = async () => {
    if (selectedFriends.length === 0) {
      setError("Please select a friend to start a chat.");
      return;
    }

    if (!GROUP_CHAT_DISABLED && isGroupChat && groupName.trim().length === 0) {
      setError("Please enter a group name or use the random name generator button (🔄) to generate one automatically.");
      return;
    }

    // Show confirmation for group chats
    if (!GROUP_CHAT_DISABLED && isGroupChat) {
      setShowGroupConfirm(true);
      return;
    }

    // Proceed with one-on-one chat creation
    await createChat();
  };

  const createChat = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Get current user token
      if (!token) {
        throw new Error("No token available");
      }
      
      // Format members according to API specification
      const members: ParticipantSimple[] = selectedFriends.map(friend => ({
        user_id: friend.user_id,
        is_admin: false
      }));

      // For one-on-one chats, use the friend's username as name
      // For group chats, use the provided group name
      const chatName = isGroupChat ? groupName.trim() : selectedFriends[0].username;

      const chat = await nativeApiService.createChat(token, chatName, members);
      
      console.log("Chat created successfully with ID:", chat.chat_id);
      
      // Show success message
      const message = GROUP_CHAT_DISABLED ? 'Chat created successfully!' : (isGroupChat ? 'Group chat created successfully!' : 'Chat created successfully!');
      setSuccessMessage(message);
      
      // Wait a moment then close the form
      setTimeout(() => {
        onCreated(chat.chat_id);
      }, 1500);
      
    } catch (error) {
      console.error("Failed to create chat:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to create chat. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('No token available')) {
          errorMessage = "Authentication error. Please log in again.";
        } else if (error.message.includes('Failed to create chat')) {
          errorMessage = "Server error. Please check your connection and try again.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setShowGroupConfirm(false);
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
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}
      </style>
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
            {GROUP_CHAT_DISABLED ? 'Create New Chat' : (isGroupChat ? 'Create New Group Chat' : 'Create New Chat')}
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
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surface,
              color: theme.text,
              fontSize: '14px',
              outline: 'none',
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'text'
            }}
          />
        </div>

        {/* Group Chat Name Input (if applicable) */}
        {!GROUP_CHAT_DISABLED && isGroupChat && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Group chat name (required)"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  if (error && e.target.value.trim().length > 0) {
                    setError("");
                  }
                }}
                onFocus={() => setIsGroupNameFocused(true)}
                onBlur={() => setIsGroupNameFocused(false)}
                maxLength={50}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${isGroupNameFocused ? theme.primary : theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.text,
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
              <button
                onClick={triggerRandomName}
                type="button"
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.surface,
                  color: theme.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Generate random name"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 15.5m0 0l3 3L22 19l-3-3m-3.5 3.5L19 22"/>
                </svg>
              </button>
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.textSecondary,
              marginTop: '4px',
              textAlign: 'center'
            }}>
              {selectedFriends.length === 2 
                ? 'Tap the 🔄 button to generate a random name' 
                : 'Group chat name is required for multiple friends'}
            </div>
            <div style={{
              fontSize: '11px',
              color: groupName.length > 40 ? theme.error : theme.textSecondary,
              marginTop: '2px',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>
                {groupName.length > 0 && (
                  <span style={{ color: groupName.trim().length > 0 ? theme.primary : theme.error }}>
                    {groupName.trim().length > 0 ? '✓ Valid name' : '✗ Name required'}
                  </span>
                )}
              </span>
              <span>{groupName.length}/50 characters</span>
            </div>
          </div>
        )}

        {/* Selection Count */}
        {selectedFriends.length > 0 && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: isGroupChat ? theme.primary : theme.primary,
            color: 'white',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span>
              {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
            </span>
            {!GROUP_CHAT_DISABLED && isGroupChat && (
              <>
                <span>•</span>
                <span>Group Chat</span>
                {groupName.trim() && (
                  <>
                    <span>•</span>
                    <span style={{ fontWeight: '600' }}>{groupName.trim()}</span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Chat Type Indicator */}
        <div style={{
          padding: '6px 12px',
          backgroundColor: theme.surface,
          color: theme.textSecondary,
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '12px',
          textAlign: 'center',
          border: `1px solid ${theme.border}`
        }}>
          {GROUP_CHAT_DISABLED ? 'Creating a one-on-one chat' : (isGroupChat ? 'Creating a group chat' : 'Creating a one-on-one chat')}
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

        {/* Success Message */}
        {successMessage && (
          <div style={{
            padding: '12px',
            backgroundColor: theme.success || '#10b981',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {successMessage}
          </div>
        )}

        {/* Friends List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '20px',
          ...themedStyles.scrollbar
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
                    transition: 'all 0.2s ease',
                    position: 'relative'
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
                  
                  {/* Selection Number for Group Chats */}
                  {!GROUP_CHAT_DISABLED && isSelected && isGroupChat && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: theme.primary,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {selectedFriends.findIndex(f => f.user_id === friend.user_id) + 1}
                    </div>
                  )}
                  
                  {/* Selection Border for Group Chats */}
                  {!GROUP_CHAT_DISABLED && isSelected && isGroupChat && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      border: `2px solid ${theme.primary}`,
                      borderRadius: '8px',
                      pointerEvents: 'none'
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Group Chat Name Input (if applicable) */}
        {isGroupChat && (
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Group chat name (optional)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
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
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              backgroundColor: 'transparent',
              color: theme.text,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateChat}
            disabled={isLoading || !canCreateChat}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: !canCreateChat ? theme.border : theme.primary,
              color: !canCreateChat ? theme.textSecondary : 'white',
              cursor: !canCreateChat ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            )}
            {isLoading ? 'Creating...' : (GROUP_CHAT_DISABLED ? 'Create Chat' : (isGroupChat ? 'Create Group Chat' : 'Create Chat'))}
          </button>
        </div>
      </div>

      {/* Group Chat Confirmation Dialog */}
      {showGroupConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: theme.background,
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: theme.text,
              margin: '0 0 16px 0'
            }}>
              Create Group Chat?
            </h3>
            <p style={{
              fontSize: '14px',
              color: theme.textSecondary,
              margin: '0 0 20px 0',
              lineHeight: '1.4'
            }}>
              You're about to create a group chat with <strong>{selectedFriends.length} friends</strong>.
              <br />
              Group name: <strong>{groupName}</strong>
            </p>
            
            {/* Selected Friends List */}
            <div style={{
              backgroundColor: theme.surface,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '12px',
                color: theme.textSecondary,
                marginBottom: '8px'
              }}>
                Selected friends:
              </div>
              {selectedFriends.map((friend, index) => (
                <div key={friend.user_id} style={{
                  fontSize: '14px',
                  color: theme.text,
                  padding: '4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: theme.primary,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {index + 1}
                  </span>
                  {friend.username}
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowGroupConfirm(false)}
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
                onClick={createChat}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: theme.primary,
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isLoading && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      animation: 'pulse 2s ease-in-out infinite'
                    }} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                  </>
                )}
                {isLoading ? 'Creating...' : 'Create Group Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
