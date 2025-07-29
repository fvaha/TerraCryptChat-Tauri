# TODO List - Tauri Chat App Fixes

## Priority 1: Fix WebSocket Message System

### Issues Identified:
- **Message Flow Problems**: Messages not appearing consistently in UI after sending/receiving
- **Database Sync Issues**: UI state not properly syncing with database
- **WebSocket Connection Stability**: Connection drops and reconnection issues
- **Message Encryption/Decryption**: Inconsistent handling of encrypted messages

### Fixes Needed:

#### 1.1 Fix Message Flow Architecture
- **File**: `src/messageService.ts`, `src/useWebSocketHandler.ts`
- **Problem**: Messages saved to database but UI not updating properly
- **Solution**: Implement iOS-style database-first approach
  - Save outgoing messages to database first (plain text)
  - Trigger UI update from database after save
  - Encrypt and send to server
  - For incoming: decrypt → save to database → trigger UI update

#### 1.2 Fix WebSocket Connection Management
- **File**: `src-tauri/src/websocket.rs`, `src/websocketService.ts`
- **Problem**: Connection drops, poor reconnection logic
- **Solution**: 
  - Improve heartbeat mechanism (30s interval, 2min timeout)
  - Better error handling and reconnection logic
  - Proper connection state management
  - Message queuing during disconnection

#### 1.3 Fix Message Encryption Flow
- **File**: `src/encryptionService.ts`, `src/useWebSocketHandler.ts`
- **Problem**: Inconsistent encryption/decryption handling
- **Solution**:
  - Ensure outgoing messages are encrypted before sending
  - Proper decryption of incoming messages
  - Handle encryption failures gracefully

## Priority 2: Fix Chat Names in App

### Issues Identified:
- **Chat Name Resolution**: Direct chats showing generic names instead of participant names
- **Group Chat Names**: Group names not displaying properly
- **Participant Loading**: Inconsistent participant data loading

### Fixes Needed:

#### 2.1 Fix Direct Chat Name Resolution
- **File**: `src/ChatList.tsx`, `src/ChatScreen.tsx`
- **Problem**: Direct chats showing "Chat {id}" instead of participant names
- **Solution**:
  - Implement proper participant resolution in `resolveChatName` function
  - Use API calls to get participant details
  - Fallback to database participant data
  - Cache participant names for performance

#### 2.2 Fix Group Chat Display
- **File**: `src/ChatList.tsx`, `src/ChatScreen.tsx`
- **Problem**: Group chat names and participant lists not showing correctly
- **Solution**:
  - Proper group name handling
  - Participant list display in group chats
  - Member count display

#### 2.3 Improve Participant Service
- **File**: `src/participantService.ts`
- **Problem**: Inconsistent participant data loading
- **Solution**:
  - Better error handling in participant fetching
  - Caching of participant data
  - Proper fallback mechanisms

## Priority 3: Update Settings

### Issues Identified:
- **Settings Persistence**: Settings not properly saved/loaded
- **Settings UI**: Incomplete settings interface
- **Profile Management**: Profile update functionality missing

### Fixes Needed:

#### 3.1 Fix Settings Persistence
- **File**: `src/components/SettingsContent.tsx`, `src/settingsService.ts`
- **Problem**: Settings changes not persisting across app restarts
- **Solution**:
  - Implement proper settings save/load in database
  - Add settings validation
  - Real-time settings sync

#### 3.2 Complete Settings UI
- **File**: `src/components/SettingsContent.tsx`
- **Problem**: Incomplete settings interface
- **Solution**:
  - Add missing settings categories
  - Implement profile editing
  - Add notification settings
  - Add privacy settings

#### 3.3 Add Profile Management
- **File**: `src/components/SettingsContent.tsx`, `src/userService.ts`
- **Problem**: Profile update functionality not implemented
- **Solution**:
  - Implement profile update API calls
  - Add avatar upload functionality
  - Add profile validation

## Priority 4: Make Dark Mode App Global Persistent

### Issues Identified:
- **Theme Persistence**: Dark mode not persisting across app restarts
- **Global Theme Application**: Theme not applied consistently across all components
- **Theme Context**: Theme context not properly integrated

### Fixes Needed:

#### 4.1 Fix Theme Persistence
- **File**: `src/ThemeContext.tsx`, `src-tauri/src/database.rs`
- **Problem**: Dark mode preference not saved to database properly
- **Solution**:
  - Ensure theme preference is saved to user table
  - Load theme preference on app startup
  - Handle theme loading errors gracefully

#### 4.2 Implement Global Theme Application
- **File**: `src/ThemeContext.tsx`, `src/index.css`
- **Problem**: Theme not applied consistently across all components
- **Solution**:
  - Apply CSS custom properties to document root
  - Ensure all components use theme variables
  - Add theme-aware component styling

#### 4.3 Fix Theme Context Integration
- **File**: `src/AppContext.tsx`, `src/ThemeContext.tsx`
- **Problem**: Theme context not properly integrated with app context
- **Solution**:
  - Integrate theme context with session management
  - Ensure theme updates trigger app-wide re-renders
  - Add theme change listeners

## Implementation Order:

1. **WebSocket Message System** (Critical - affects core functionality)
   - Fix message flow architecture
   - Improve WebSocket connection stability
   - Fix encryption/decryption handling

2. **Chat Names** (High - affects user experience)
   - Fix direct chat name resolution
   - Improve group chat display
   - Enhance participant service

3. **Dark Mode Persistence** (Medium - affects user preference)
   - Fix theme persistence in database
   - Implement global theme application
   - Integrate theme context properly

4. **Settings Update** (Medium - affects user customization)
   - Fix settings persistence
   - Complete settings UI
   - Add profile management

## Technical Notes:

- All database operations should use the existing `database.rs` functions
- WebSocket improvements should follow the iOS/Kotlin patterns already established
- Theme changes should be applied immediately without requiring app restart
- Settings should be validated before saving to database
- Error handling should be consistent across all components 