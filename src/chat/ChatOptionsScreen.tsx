// THIRD WINDOW: ChatOptionsScreen component - displays chat options and participants in the third window
import React, { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeContext';
import { useAppContext } from '../AppContext';
import ScreenHeader from '../components/ScreenHeader';
import UserInitialsAvatar from '../components/UserInitialsAvatar';
import { participantService } from '../participant/participantService';
import { nativeApiService } from '../api/nativeApiService';
import { Chat, ParticipantEntity } from '../models/models';

interface ChatOptionsScreenProps {
  chat: Chat;
  onClose: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

interface ParticipantCardProps {
  participant: ParticipantEntity;
  isCurrentUserSuperAdmin: boolean;
  isRemovable: boolean;
  onPromote?: () => void;
  onDemote?: () => void;
  onRemove?: () => void;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  isCurrentUserSuperAdmin,
  isRemovable,
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
        {onPromote && participant.role === 'member' && (
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
        
        {onDemote && participant.role === 'admin' && (
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
  onClose,
  onToggleSidebar,
  sidebarCollapsed
}) => {
  const { theme } = useTheme();
  const { user } = useAppContext();
  
  const [participants, setParticipants] = useState<ParticipantEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState(chat.name || 'Unnamed');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [chat.chat_id]);

  const loadParticipants = async () => {
    try {
      setIsLoading(true);
      const participantsData = await participantService.getParticipantsForChat(chat.chat_id);
      setParticipants(participantsData);
    } catch (error) {
      console.error('Failed to load participants:', error);
      setError('Failed to load participants');
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentUserSuperAdmin = () => {
    return user?.user_id === chat.creator_id;
  };

  const isCurrentUserAdmin = () => {
    if (isCurrentUserSuperAdmin()) return true;
    const currentUserParticipant = participants.find(p => p.user_id === user?.user_id);
    return currentUserParticipant?.role === 'admin';
  };

  const getCurrentUserParticipant = () => {
    return participants.find(p => p.user_id === user?.user_id);
  };

  const handleChangeRole = async (participant: ParticipantEntity, newRole: string) => {
    try {
      await participantService.updateParticipantRole(participant.participant_id, newRole);
      await loadParticipants(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to change role:', error);
      setError('Failed to change role');
    }
  };

  const handleRemoveParticipant = async (participant: ParticipantEntity) => {
    try {
      await participantService.removeParticipant(participant.participant_id);
      setParticipants(prev => prev.filter(p => p.participant_id !== participant.participant_id));
    } catch (error) {
      console.error('Failed to remove participant:', error);
      setError('Failed to remove participant');
    }
  };

  const handleLeaveChat = async () => {
    try {
      // TODO: Implement leave chat functionality
      console.log('Leaving chat:', chat.chat_id);
      onClose();
    } catch (error) {
      console.error('Failed to leave chat:', error);
      setError('Failed to leave chat');
    }
  };

  const handleDeleteChat = async () => {
    try {
      // TODO: Implement delete chat functionality
      console.log('Deleting chat:', chat.chat_id);
      onClose();
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setError('Failed to delete chat');
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
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
      color: theme.text
    }}>
      {/* Header */}
      <ScreenHeader
        title={isEditingGroupName ? 'Edit Group' : 'Chat Info'}
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        showBackButton={true}
        onBackClick={onClose}
        rightContent={
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
            ) : isCurrentUserAdmin() ? (
              <button
                onClick={handleLeaveChat}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Leave
              </button>
            ) : null}
          </div>
        }
      />

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Info Widgets */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {/* Creator Widget */}
          <div style={{
            flex: 1,
            padding: '16px',
            backgroundColor: theme.backgroundSecondary,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px' }}>
              <UserInitialsAvatar
                username={getCreatorUsername()}
                size="large"
                picture={participants.find(p => p.user_id === chat.creator_id)?.picture}
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
            backgroundColor: theme.backgroundSecondary,
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
          backgroundColor: theme.backgroundSecondary,
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
              Loading participants...
            </div>
          ) : participants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: theme.textSecondary }}>
              No participants found.
            </div>
          ) : (
            <div>
              {sortedParticipants.map((participant) => {
                const canDemote = isCurrentUserSuperAdmin() && participant.role === 'admin';
                const canPromote = isCurrentUserAdmin() && participant.role === 'member';
                const canRemove = isCurrentUserSuperAdmin() || (isCurrentUserAdmin() && participant.role === 'member');
                const isCurrentUser = participant.user_id === user?.user_id;

                return (
                  <ParticipantCard
                    key={participant.participant_id}
                    participant={participant}
                    isCurrentUserSuperAdmin={isCurrentUserSuperAdmin()}
                    isRemovable={canRemove && !isCurrentUser}
                    onPromote={canPromote ? () => handleChangeRole(participant, 'admin') : undefined}
                    onDemote={canDemote ? () => handleChangeRole(participant, 'member') : undefined}
                    onRemove={canRemove && !isCurrentUser ? () => handleRemoveParticipant(participant) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isCurrentUserAdmin() && (
            <button
              onClick={() => {/* TODO: Add participant functionality */}}
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