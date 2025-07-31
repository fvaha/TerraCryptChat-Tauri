# 📁 TAURI Chat Application - File Structure

## Overview
This document outlines the organized folder structure for the TAURI chat application. Files have been logically grouped by functionality to improve maintainability and developer experience.

## 📂 Root Structure

```
TAURI/
├── src/                    # Main source code directory
├── src-tauri/             # Tauri backend (Rust)
├── public/                # Static assets
├── package.json           # Node.js dependencies
├── tailwind.config.js     # Tailwind CSS configuration
├── vite.config.ts         # Vite build configuration
└── tsconfig.json          # TypeScript configuration
```

## 🎯 Frontend Source Code Organization (`src/`)

### Core Application Files
```
src/
├── App.tsx                # Main application component
├── AppContext.tsx         # Global application context
├── main.tsx              # Application entry point
├── index.css             # Global styles
├── App.css               # App-specific styles
├── ErrorBoundary.tsx     # Error handling component
├── FallbackApp.tsx       # Fallback app component
├── SessionContext.tsx     # Session management context
├── tauri.d.ts            # Tauri type definitions
└── vite-env.d.ts         # Vite environment types
```

### 📁 Organized Feature Folders

#### 🔐 Authentication (`auth/`)
```
auth/
├── authService.ts         # Authentication service
├── LoginForm.tsx         # Login form component
├── LoginScreen.tsx       # Login screen component
└── RegisterForm.tsx      # Registration form component
```
**Purpose**: All authentication-related functionality including login, registration, and auth services.

#### 💬 Chat Functionality (`chat/`)
```
chat/
├── ChatList.tsx          # Chat list component
├── ChatScreen.tsx        # Main chat interface
├── ChatScreen.css        # Chat screen styles
├── chatService.ts        # Chat-related services
├── CreateChatForm.tsx    # Create chat form
└── GroupChatScreen.tsx   # Group chat interface
```
**Purpose**: Core chat functionality including message display, chat creation, and group chats.

#### 🔗 WebSocket Communication (`websocket/`)
```
websocket/
├── websocketService.ts   # WebSocket connection management
├── useWebSocketHandler.ts # WebSocket hook for React
└── websocketTest.ts      # WebSocket testing utilities
```
**Purpose**: Real-time communication handling, connection management, and testing.

#### 🌐 API Services (`api/`)
```
api/
├── apiService.ts         # HTTP API service
└── nativeApiService.ts   # Native Tauri API service
```
**Purpose**: External API communication and native Tauri backend integration.

#### 👥 Friend Management (`friend/`)
```
friend/
├── friendService.ts      # Friend-related services
├── FriendRequestsModal.tsx # Friend request modal
├── FriendSearch.tsx      # Friend search component
└── FriendsScreen.tsx     # Friends list screen
```
**Purpose**: Friend management, requests, search, and friend list functionality.

#### ⚙️ Settings (`settings/`)
```
settings/
├── SettingsScreen.tsx    # Settings interface
└── settingsService.ts    # Settings management service
```
**Purpose**: Application settings and configuration management.

#### 🔐 Encryption (`encrypt/`)
```
encrypt/
└── encryptionService.ts  # Message encryption/decryption
```
**Purpose**: Message security and encryption handling.

#### 🔗 Message Linking (`linking/`)
```
linking/
└── messageLinkingManager.ts # Message ID linking management
```
**Purpose**: Managing client and server message ID relationships.

#### 👤 Participant Management (`participant/`)
```
participant/
└── participantService.ts # Participant management service
```
**Purpose**: Chat participant handling and management.

#### 🧩 Reusable Components (`components/`)
```
components/
├── MenuBar.tsx           # Application menu bar
├── ScreenToggleButton.tsx # Screen toggle button
├── SettingsContent.tsx   # Settings content component
├── Sidebar.tsx           # Application sidebar
├── ThemeContext.tsx      # Theme context provider
├── UserInitialsAvatar.tsx # User avatar component
├── useThemedStyles.ts    # Themed styles hook
└── WebSocketTestPanel.tsx # WebSocket testing panel
```
**Purpose**: Reusable UI components and shared functionality.

#### 🛠️ Core Services (`services/`)
```
services/
├── chatRequestService.ts  # Chat request handling
├── databaseServiceAsync.ts  # Database operations (async)
├── deltaUpdateService.ts  # Incremental updates
├── messageService.ts      # Message handling
├── notificationsService.ts # Notification management
└── userService.ts        # User management
```
**Purpose**: Core business logic and data management services.

#### 📊 Data Models (`models/`)
```
models/
└── models.ts             # TypeScript interfaces and types
```
**Purpose**: Data structure definitions and type safety.

#### 🛠️ Utilities (`utils/`)
```
utils/
├── sessionManager.ts      # Session management
├── tokenManager.ts        # Token handling
└── tokenStore.ts         # Token storage
```
**Purpose**: Utility functions and helper services.

#### 🎨 Assets (`assets/`)
```
assets/
├── logo.png              # Application logo
└── react.svg             # React logo
```
**Purpose**: Static assets and images.

## 🎯 Benefits of This Organization

### 1. **Clear Separation of Concerns**
- Each folder has a specific, well-defined purpose
- Related functionality is grouped together
- Easy to understand what each module does

### 2. **Improved Developer Experience**
- Quick navigation to relevant code
- Reduced cognitive load when working on specific features
- Clear boundaries between different parts of the application

### 3. **Scalability**
- Easy to add new features to appropriate folders
- Consistent structure across the application
- Maintainable as the project grows

### 4. **Team Collaboration**
- New developers can quickly understand the codebase
- Clear ownership of different features
- Reduced merge conflicts through logical separation

### 5. **Testing and Maintenance**
- Related tests can be organized alongside source code
- Easier to identify and fix issues in specific areas
- Better code coverage tracking per feature

## 📝 Import Path Updates Required

After this reorganization, you'll need to update import paths throughout the codebase. For example:

```typescript
// Before
import { authService } from './authService';
import { websocketService } from './websocketService';

// After
import { authService } from './auth/authService';
import { websocketService } from './websocket/websocketService';
```

## 🚀 Next Steps

1. **Update Import Paths**: Update all import statements to reflect the new folder structure
2. **Update Build Configuration**: Ensure build tools can resolve the new paths
3. **Update Documentation**: Update any documentation that references old file locations
4. **Test Thoroughly**: Ensure all functionality works with the new structure

## 📋 Folder Naming Conventions

- **Lowercase**: All folder names use lowercase with hyphens for multi-word folders
- **Descriptive**: Folder names clearly indicate their purpose
- **Consistent**: Similar functionality uses similar naming patterns
- **Scalable**: Structure can accommodate future features

This organization provides a solid foundation for a maintainable and scalable chat application. 