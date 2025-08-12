# Role-Based Permissions System

## Overview

This document outlines the comprehensive role-based permissions system implemented in the TerraCrypt Chat application. The system ensures that users can only perform actions appropriate to their role within each chat.

## Role Hierarchy

```
Creator (Super Admin) > Admin > Member
```

### 1. Creator (Super Admin)
- **Highest authority level**
- **Cannot be removed or demoted**
- **Cannot leave chat** (only delete)
- **Has all permissions**

### 2. Admin
- **Moderate authority level**
- **Can be promoted by Creator**
- **Can be demoted by Creator**
- **Can leave chat**
- **Limited permissions**

### 3. Member (Regular User)
- **Lowest authority level**
- **Can be promoted by Creator or Admin**
- **Can leave chat**
- **Minimal permissions**

## Permission Matrix

| Action | Creator | Admin | Member |
|--------|---------|-------|--------|
| **Chat Management** |
| Edit group name | ✅ | ❌ | ❌ |
| Delete chat | ✅ | ❌ | ❌ |
| Leave chat | ❌ | ✅ | ✅ |
| **User Management** |
| Add users to chat | ✅ | ✅ | ❌ |
| Remove users from chat | ✅ | ✅ | ❌ |
| Promote users to admin | ✅ | ✅ | ❌ |
| Demote admins to member | ✅ | ❌ | ❌ |
| **Participant Actions** |
| View participants | ✅ | ✅ | ✅ |
| Change own role | ❌ | ❌ | ❌ |

## Detailed Permission Breakdown

### Chat Management Permissions

#### Edit Group Name
- **Creator**: ✅ Can edit and save group name
- **Admin**: ❌ Cannot edit group name
- **Member**: ❌ Cannot edit group name

#### Delete Chat
- **Creator**: ✅ Can permanently delete the entire chat
- **Admin**: ❌ Cannot delete chat
- **Member**: ❌ Cannot delete chat

#### Leave Chat
- **Creator**: ❌ Cannot leave (must delete instead)
- **Admin**: ✅ Can leave chat
- **Member**: ✅ Can leave chat

### User Management Permissions

#### Add Users to Chat
- **Creator**: ✅ Can add any friend to the chat
- **Admin**: ✅ Can add any friend to the chat
- **Member**: ❌ Cannot add users

**Implementation Details:**
- Only friends from the user's friends list can be added
- Users already in the chat are filtered out
- New users are added with `is_admin: false` by default

#### Remove Users from Chat
- **Creator**: ✅ Can remove any participant (except themselves)
- **Admin**: ✅ Can remove members only (cannot remove admins or creator)
- **Member**: ❌ Cannot remove anyone

**Removal Restrictions:**
- Creator cannot be removed by anyone
- Admin cannot remove other admins
- Users cannot remove themselves
- Admin cannot remove the creator

#### Promote Users
- **Creator**: ✅ Can promote any member to admin
- **Admin**: ✅ Can promote members to admin
- **Member**: ❌ Cannot promote anyone

**Promotion Rules:**
- Only members can be promoted to admin
- Admins cannot be promoted further
- Creator role cannot be granted to others

#### Demote Users
- **Creator**: ✅ Can demote any admin to member
- **Admin**: ❌ Cannot demote other admins
- **Member**: ❌ Cannot demote anyone

**Demotion Rules:**
- Only admins can be demoted to member
- Creator cannot be demoted
- Users cannot demote themselves

## Implementation Details

### Frontend Permission Logic

```typescript
// Permission calculation in ChatOptionsScreen
const isCurrentUserSuperAdmin = () => {
  return user?.user_id === chat.creator_id;
};

const isCurrentUserAdmin = () => {
  if (isCurrentUserSuperAdmin()) return true;
  const currentUserParticipant = participants.find(p => p.user_id === user?.user_id);
  return currentUserParticipant?.role === 'admin';
};

// Action permissions
const canPromote = (isCurrentUserSuperAdmin() && participant.role === 'member') || 
                 (isCurrentUserAdmin() && participant.role === 'member');
const canDemote = isCurrentUserSuperAdmin() && participant.role === 'admin';
const canRemove = (isCurrentUserSuperAdmin() && !isCreator && !isCurrentUser) || 
                (isCurrentUserAdmin() && participant.role === 'member' && !isCurrentUser);
```

### API Endpoints Used

#### User Management
- **Add User**: `POST /chats/{chat_id}/members`
- **Remove User**: `DELETE /chats/{chat_id}/members/{user_id}`
- **Get Members**: `GET /chats/{chat_id}/members`

#### Chat Management
- **Delete Chat**: `DELETE /chats/{chat_id}`
- **Leave Chat**: `DELETE /chats/{chat_id}/leave`

### Database Operations

#### Participant Service
```typescript
// Update participant role
await participantService.updateParticipantRole(participant_id, newRole);

// Remove participant
await participantService.removeParticipant(participant_id);

// Sync participants from server
await participantService.syncParticipantsFromServer(chat_id);
```

#### Chat Service
```typescript
// Delete chat
await chatService.deleteChat(chat_id);

// Leave chat
await chatService.leaveChat(chat_id);
```

## Security Considerations

### Client-Side Validation
- **Permission checks** prevent unauthorized actions in UI
- **Button visibility** controlled by role-based logic
- **Confirmation dialogs** for destructive actions

### Server-Side Validation
- **All operations** go through server API first
- **Server validates** user permissions before execution
- **Database consistency** maintained through proper API calls

### Data Integrity
- **Real-time sync** between server and local database
- **Participant list** always reflects current server state
- **Role changes** immediately visible to all users

## User Experience

### Visual Indicators

#### Role Badges
- **Creator**: 👑 Gold crown icon
- **Admin**: 🟠 Orange admin badge
- **Member**: ⚪ Gray member badge

#### Button States
- **Enabled**: User has permission to perform action
- **Disabled**: User lacks permission for action
- **Hidden**: Action not available for user's role

#### Confirmation Dialogs
- **Destructive actions** require confirmation
- **Clear messaging** about what will happen
- **Cancel option** always available

### Error Handling

#### Permission Denied
- **Clear error messages** when action not allowed
- **User guidance** on what permissions are needed
- **Graceful fallback** when operations fail

#### Network Issues
- **Server errors** handled gracefully
- **Local state** updated only after server success
- **Retry mechanisms** for failed operations

## Best Practices

### Permission Design
1. **Principle of Least Privilege**: Users get minimum permissions needed
2. **Role Separation**: Clear distinction between different permission levels
3. **Audit Trail**: All actions logged for security purposes

### Implementation Guidelines
1. **Always validate** permissions on both client and server
2. **Use confirmation dialogs** for destructive actions
3. **Provide clear feedback** when actions succeed or fail
4. **Maintain consistency** between server and client state

### Security Measures
1. **Server-side validation** is the source of truth
2. **Client-side permissions** are for UX only
3. **All API calls** require valid authentication tokens
4. **Role changes** require appropriate permissions

## Future Enhancements

### Planned Features
- **Role templates** for common permission sets
- **Custom permissions** for specific actions
- **Permission inheritance** for nested roles
- **Audit logging** for all permission changes

### Scalability Considerations
- **Permission caching** for performance
- **Batch operations** for multiple users
- **WebSocket updates** for real-time permission changes
- **Offline permission** validation

## Troubleshooting

### Common Issues

#### Permission Denied Errors
- **Check user role** in current chat
- **Verify server permissions** match client expectations
- **Ensure authentication** token is valid

#### UI Not Updating
- **Refresh participant list** after role changes
- **Check WebSocket connection** for real-time updates
- **Verify local database** sync with server

#### Role Changes Not Persisting
- **Check server API** response for errors
- **Verify database** update operations
- **Ensure proper error handling** in permission logic

### Debug Information
- **Console logs** show permission calculations
- **Network tab** displays API calls and responses
- **Participant state** visible in React DevTools
- **Role validation** logged for troubleshooting

## Conclusion

The role-based permissions system provides a secure, scalable foundation for managing user access and actions within chats. By implementing proper permission checks at multiple levels and maintaining consistency between client and server, the system ensures that users can only perform actions appropriate to their role while maintaining a smooth user experience.

The system is designed to be extensible, allowing for future enhancements such as custom permission sets, advanced role templates, and comprehensive audit logging. Regular security reviews and updates ensure that the permission system remains robust and secure as the application evolves.
