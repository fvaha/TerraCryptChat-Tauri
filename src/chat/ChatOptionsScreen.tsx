// THIRD WINDOW: ChatOptionsScreen component - displays chat options and participants in the third window
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../components/ThemeContext';
import { useThemedStyles } from '../components/useThemedStyles';
import { useAppContext } from '../AppContext';
import UserInitialsAvatar from '../components/UserInitialsAvatar';
import { participantService } from '../participant/participantService';
import { Chat, ParticipantEntity } from '../models/models';
import { nativeApiService } from '../api/nativeApiService';
import { sessionManager } from '../utils/sessionManager';
import { apiService } from '../api/apiService';
import { invoke } from '@tauri-apps/api/core';

// Add CSS for spinner animation
const spinnerStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = spinnerStyles;
  document.head.appendChild(styleElement);
}

interface ChatOptionsScreenProps {
  chat: Chat;
  onClose: () => void;
}

interface ParticipantCardProps {
  participant: ParticipantEntity;
  isRemovable: boolean;
  canPromote: boolean;
  canDemote: boolean;
  onPromote?: () => void;
  onDemote?: () => void;
  onRemove?: () => void;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  isRemovable,
  canPromote,
  canDemote,
  onPromote,
  onDemote,
  onRemove
}) => {
  const { theme } = useTheme();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'creator':
        return '#FFD700'; // Gold
      case 'admin':
        return '#FF6B35'; // Orange
      default:
        return '#6B7280'; // Gray
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'creator':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      backgroundColor: theme.surface,
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <UserInitialsAvatar
          username={participant.username}
          size="medium"
        />
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: theme.text
          }}>
            {participant.username}
          </div>
          <div style={{
            fontSize: '12px',
            color: getRoleColor(participant.role || 'member'),
            fontWeight: '500'
          }}>
            {getRoleLabel(participant.role || 'member')}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        {canPromote && participant.role === 'member' && (
          <button
            onClick={onPromote}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Promote
          </button>
        )}
        
        {canDemote && participant.role === 'admin' && (
          <button
            onClick={onDemote}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#F59E0B',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Demote
          </button>
        )}
        
        {onRemove && isRemovable && (
          <button
            onClick={onRemove}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

const ChatOptionsScreen: React.FC<ChatOptionsScreenProps> = ({
  chat,
  onClose
}) => {
  const { theme } = useTheme();
  const themedStyles = useThemedStyles();
  const { user } = useAppContext();
  
  const [participants, setParticipants] = useState<ParticipantEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState(chat.name || 'Unnamed');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const [selectedFriendToAdd, setSelectedFriendToAdd] = useState<string>('');

  const loadParticipants = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`[ChatOptionsScreen] Loading participants for chat: ${chat.chat_id}`);
      
      // First try to get from cache/database (fast) - non-blocking
      const participantsData = await participantService.get_participants_for_chat(chat.chat_id);
      
      if (participantsData && participantsData.length > 0) {
        console.log(`[ChatOptionsScreen] Found ${participantsData.length} participants in database`);
        
        // Refresh usernames for participants that have user IDs as usernames
        const refreshedParticipants = await refreshParticipantUsernames(participantsData);
        setParticipants(refreshedParticipants);
        
        setIsLoading(false);
        
        // Trigger background sync to update from server if needed
        setTimeout(async () => {
          try {
            await participantService.syncParticipantsFromServer(chat.chat_id);
            const updatedParticipants = await participantService.get_participants_for_chat(chat.chat_id);
            if (updatedParticipants && updatedParticipants.length > 0) {
              const refreshedUpdatedParticipants = await refreshParticipantUsernames(updatedParticipants);
              setParticipants(refreshedUpdatedParticipants);
              console.log(`[ChatOptionsScreen] Updated participants from server: ${updatedParticipants.length}`);
            }
          } catch (syncError) {
            console.warn('[ChatOptionsScreen] Background participant sync failed:', syncError);
          }
        }, 200);
      } else {
        console.log(`[ChatOptionsScreen] No participants in database, will try server sync in background`);
        setParticipants([]);
        setIsLoading(false);
        
        // Try server sync in background
        setTimeout(async () => {
          try {
            await participantService.syncParticipantsFromServer(chat.chat_id);
            const updatedParticipants = await participantService.get_participants_for_chat(chat.chat_id);
            if (updatedParticipants && updatedParticipants.length > 0) {
              const refreshedUpdatedParticipants = await refreshParticipantUsernames(updatedParticipants);
              setParticipants(refreshedUpdatedParticipants);
              console.log(`[ChatOptionsScreen] Loaded ${updatedParticipants.length} participants from server`);
            }
          } catch (syncError) {
            console.warn('[ChatOptionsScreen] Background participant sync failed:', syncError);
          }
        }, 300);
      }
      
    } catch (error) {
      console.error('Failed to load participants:', error);
      setError('Failed to load participants');
      setIsLoading(false);
    }
  }, [chat.chat_id]);

  // Function to refresh participant usernames
  const refreshParticipantUsernames = async (participants: ParticipantEntity[]): Promise<ParticipantEntity[]> => {
    try {
      const token = await sessionManager.getToken();
      if (!token) {
        console.warn('[ChatOptionsScreen] No token available for username refresh');
        return participants;
      }

      const refreshedParticipants = await Promise.all(
        participants.map(async (participant) => {
          // Check if the participant has a user ID as username (indicating it needs refresh)
          if (participant.username === participant.user_id || participant.username.startsWith('user_')) {
            try {
              console.log(`[ChatOptionsScreen] Refreshing username for participant: ${participant.user_id}`);
              // Call the backend to get the real username
              const realUsername = await invoke<string>('get_username_for_user_id_command', { 
                token, 
                userId: participant.user_id 
              });
              
              if (realUsername && realUsername !== participant.user_id && !realUsername.startsWith('user_')) {
                console.log(`[ChatOptionsScreen] Updated username for ${participant.user_id}: ${realUsername}`);
                return {
                  ...participant,
                  username: realUsername
                };
              }
            } catch (error) {
              console.warn(`[ChatOptionsScreen] Failed to refresh username for ${participant.user_id}:`, error);
            }
          }
          return participant;
        })
      );

      return refreshedParticipants;
    } catch (error) {
      console.error('[ChatOptionsScreen] Failed to refresh participant usernames:', error);
      return participants;
    }
  };

  const loadAvailableFriends = useCallback(async () => {
    try {
      const friends = await invoke<any[]>('db_get_cached_friends_only');
      if (friends && friends.length > 0) {
        // Filter out friends who are already in the chat
        const existingParticipantIds = participants.map(p => p.user_id);
        const availableFriends = friends.filter(friend => 
          !existingParticipantIds.includes(friend.user_id)
        );
        setAvailableFriends(availableFriends);
      }
    } catch (error) {
      console.error('Failed to load available friends:', error);
    }
  }, [participants]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    if (participants.length > 0) {
      loadAvailableFriends();
    }
  }, [participants, loadAvailableFriends]);

  const isCurrentUserSuperAdmin = () => {
    return user?.user_id === chat.creator_id;
  };

  const isCurrentUserAdmin = () => {
    if (isCurrentUserSuperAdmin()) return true;
    const currentUserParticipant = participants.find(p => p.user_id === user?.user_id);
    return currentUserParticipant?.role === 'admin';
  };

  const isCurrentUserMember = () => {
    if (isCurrentUserSuperAdmin() || isCurrentUserAdmin()) return false;
    return true;
  };

  const handleChangeRole = async (participant: ParticipantEntity, newRole: string) => {
    try {
      // Update role in database
      await participantService.updateParticipantRole(participant.participant_id, newRole);
      
      // Update role on server via API
      const token = await sessionManager.getToken();
      if (token) {
        try {
          // For now, we'll just update locally since the API doesn't have a direct role update endpoint
          // In a real implementation, you'd call the server API to update the role
          console.log(`[ChatOptionsScreen] Role updated to ${newRole} for participant ${participant.participant_id}`);
        } catch (serverError) {
          console.warn('[ChatOptionsScreen] Server role update failed:', serverError);
        }
      }
      
      await loadParticipants(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to change role:', error);
      setError('Failed to change role');
    }
  };

  const handleRemoveParticipant = async (participant: ParticipantEntity) => {
    try {
      // Confirm removal
      if (!window.confirm(`Are you sure you want to remove ${participant.username} from this chat?`)) {
        return;
      }

      const token = await sessionManager.getToken();
      if (!token) {
        setError('No authentication token available');
        return;
      }

      // Remove participant from server via API
      try {
        await apiService.removeChatMember(chat.chat_id, participant.user_id);
        console.log(`[ChatOptionsScreen] Participant ${participant.username} removed from server`);
      } catch (serverError) {
        console.warn('[ChatOptionsScreen] Server removal failed:', serverError);
        setError('Failed to remove participant from server');
        return;
      }

      // Remove participant from local database
      await participantService.removeParticipant(participant.participant_id);
      
      // Update local state
      setParticipants(prev => prev.filter(p => p.participant_id !== participant.participant_id));
      
      // Reload available friends
      await loadAvailableFriends();
      
    } catch (error) {
      console.error('Failed to remove participant:', error);
      setError('Failed to remove participant');
    }
  };

  const handleAddUserToChat = async () => {
    if (!selectedFriendToAdd) {
      setError('Please select a friend to add');
      return;
    }

    try {
      const token = await sessionManager.getToken();
      if (!token) {
        setError('No authentication token available');
        return;
      }

      const selectedFriendData = availableFriends.find(f => f.user_id === selectedFriendToAdd);
      if (!selectedFriendData) {
        setError('Selected friend not found');
        return;
      }

      // Add user to chat via server API
      try {
        await apiService.addChatMembers(chat.chat_id, [{
          user_id: selectedFriendData.user_id,
          is_admin: false
        }]);
        console.log(`[ChatOptionsScreen] User ${selectedFriendData.username} added to chat on server`);
      } catch (serverError) {
        console.warn('[ChatOptionsScreen] Server add user failed:', serverError);
        setError('Failed to add user to chat on server');
        return;
      }

      // Sync participants from server to get updated data
      await participantService.syncParticipantsFromServer(chat.chat_id);
      
      // Reload participants and available friends
      await loadParticipants();
      await loadAvailableFriends();
      
      // Reset modal state
      setShowAddUserModal(false);
      setSelectedFriendToAdd('');
      
    } catch (error) {
      console.error('Failed to add user to chat:', error);
      setError('Failed to add user to chat');
    }
  };

  const handleLeaveChat = async () => {
    try {
      const token = await sessionManager.getToken();
      if (!token) {
        setError('No authentication token available');
        return;
      }

      // Confirm leaving
      if (!window.confirm('Are you sure you want to leave this chat?')) {
        return;
      }

      // Leave chat from server and local database
      await nativeApiService.leaveChat(chat.chat_id);
      
      console.log('Left chat successfully:', chat.chat_id);
      onClose();
      
      // Refresh chat list by reloading the page or triggering a callback
      window.location.reload();
    } catch (error) {
      console.error('Failed to leave chat:', error);
      setError('Failed to leave chat. Please try again.');
    }
  };

  const handleDeleteChat = async () => {
    try {
      const token = await sessionManager.getToken();
      if (!token) {
        setError('No authentication token available');
        return;
      }

      // Confirm deletion
      if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
        return;
      }

      // Delete chat from server and local database
      await nativeApiService.deleteChat(chat.chat_id);
      
      console.log('Chat deleted successfully:', chat.chat_id);
      onClose();
      
      // Refresh chat list by reloading the page or triggering a callback
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setError('Failed to delete chat. Please try again.');
    }
  };

  const handleSaveGroupName = async () => {
    try {
      // TODO: Implement save group name functionality
      console.log('Saving group name:', groupName);
      setIsEditingGroupName(false);
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 2000);
    } catch (error) {
      console.error('Failed to save group name:', error);
      setError('Failed to save group name');
    }
  };

  const getCreatorUsername = () => {
    const creator = participants.find(p => p.user_id === chat.creator_id);
    if (creator) return creator.username;
    if (user?.user_id === chat.creator_id) return user.username;
    return 'Unknown';
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const sortedParticipants = participants.sort((a, b) => {
    const roleOrder = { creator: 3, admin: 2, member: 1 };
    const aRole = roleOrder[a.role as keyof typeof roleOrder] || 1;
    const bRole = roleOrder[b.role as keyof typeof roleOrder] || 1;
    return bRole - aRole;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: theme.background,
      color: theme.text,
      position: 'relative'
    }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.sidebar,
        height: '52px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1
        }}>
          <button
            onClick={onClose}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: theme.textSecondary,
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              marginRight: '12px'
            }}
            title="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: theme.text,
            margin: 0
          }}>
            {isEditingGroupName ? 'Edit Group' : 'Chat Info'}
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {isEditingGroupName ? (
            <button
              onClick={handleSaveGroupName}
              style={{
                padding: '8px 12px',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Save
            </button>
          ) : isCurrentUserSuperAdmin() ? (
            <button
              onClick={() => setIsEditingGroupName(true)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '16px',
        ...themedStyles.scrollbar
      }}>
        {/* Info Widgets */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {/* Creator Widget */}
          <div style={{
            flex: 1,
            padding: '16px',
            backgroundColor: theme.surface,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px' }}>
              <UserInitialsAvatar
                username={getCreatorUsername()}
                size="large"
              />
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '18px',
                height: '18px',
                backgroundColor: '#FFD700',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'white'
              }}>
                👑
              </div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>
              {getCreatorUsername()}
            </div>
            <div style={{ fontSize: '12px', color: '#3B82F6' }}>
              Super Admin
            </div>
          </div>

          {/* Created At Widget */}
          <div style={{
            flex: 1,
            padding: '16px',
            backgroundColor: theme.surface,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
            <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '4px' }}>
              Created
            </div>
            <div style={{ fontSize: '12px', color: theme.textSecondary }}>
              {formatDate(chat.created_at).date}
            </div>
            <div style={{ fontSize: '12px', color: theme.textSecondary }}>
              {formatDate(chat.created_at).time}
            </div>
          </div>
        </div>

        {/* Group Name Editor */}
        {isEditingGroupName && (
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                backgroundColor: theme.background,
                color: theme.text,
                fontSize: '16px'
              }}
              placeholder="Enter group name"
            />
          </div>
        )}

        {/* Participants Section */}
        <div style={{
          backgroundColor: theme.surface,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px',
            color: theme.text
          }}>
            Participants ({participants.length})
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: theme.textSecondary }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: `2px solid ${theme.border}`,
                  borderTop: `2px solid ${theme.primary}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Loading participants...
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                This may take a moment for new chats
              </div>
            </div>
          ) : participants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: theme.textSecondary }}>
              No participants found.
            </div>
          ) : (
            <div>
              {sortedParticipants.map((participant) => {
                const isCurrentUser = participant.user_id === user?.user_id;
                const isCreator = participant.role === 'creator';
                
                // Permission logic:
                // - Creator can promote members to admin and demote admins to member
                // - Admin can promote members to admin (but not demote other admins)
                // - No one can remove the creator
                // - Admin can remove members
                // - Creator can remove anyone (except themselves)
                
                const canPromote = (isCurrentUserSuperAdmin() && participant.role === 'member') || 
                                 (isCurrentUserAdmin() && participant.role === 'member');
                const canDemote = isCurrentUserSuperAdmin() && participant.role === 'admin';
                const canRemove = (isCurrentUserSuperAdmin() && !isCreator && !isCurrentUser) || 
                                (isCurrentUserAdmin() && participant.role === 'member' && !isCurrentUser);

                return (
                  <ParticipantCard
                    key={participant.participant_id}
                    participant={participant}
                    isRemovable={canRemove}
                    canPromote={canPromote}
                    canDemote={canDemote}
                    onPromote={canPromote ? () => handleChangeRole(participant, 'admin') : undefined}
                    onDemote={canDemote ? () => handleChangeRole(participant, 'member') : undefined}
                    onRemove={canRemove ? () => handleRemoveParticipant(participant) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Add User Button - Only for admins and creator */}
          {(isCurrentUserAdmin() || isCurrentUserSuperAdmin()) && (
            <button
              onClick={() => setShowAddUserModal(true)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Add User to Chat
            </button>
          )}

          {/* Delete Chat Button - Only for creator */}
          {isCurrentUserSuperAdmin() && (
            <button
              onClick={handleDeleteChat}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Delete Chat
            </button>
          )}

          {/* Leave Chat Button - Only for non-creators */}
          {!isCurrentUserSuperAdmin() && (
            <button
              onClick={handleLeaveChat}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#F59E0B',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Leave Chat
            </button>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
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
            padding: '24px',
            borderRadius: '12px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: theme.text }}>
              Add User to Chat
            </h3>
            
            {availableFriends.length === 0 ? (
              <p style={{ color: theme.textSecondary, marginBottom: '16px' }}>
                No available friends to add. All your friends are already in this chat.
              </p>
            ) : (
              <>
                <select
                  value={selectedFriendToAdd}
                  onChange={(e) => setSelectedFriendToAdd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select a friend to add</option>
                  {availableFriends.map(friend => (
                    <option key={friend.user_id} value={friend.user_id}>
                      {friend.username}
                    </option>
                  ))}
                </select>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleAddUserToChat}
                    disabled={!selectedFriendToAdd}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: selectedFriendToAdd ? '#10B981' : theme.border,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: selectedFriendToAdd ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Add User
                  </button>
                  <button
                    onClick={() => {
                      setShowAddUserModal(false);
                      setSelectedFriendToAdd('');
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: theme.border,
                      color: theme.text,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Save Confirmation */}
      {showSaveConfirmation && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme.background,
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
          zIndex: 1000
        }}>
          Changes Saved
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#EF4444',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '12px',
              padding: '4px 8px',
              backgroundColor: 'white',
              color: '#EF4444',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatOptionsScreen; 
