# Terracrypt Chat - Desktop App

A secure, real-time chat application built with Tauri, React, and TypeScript. This desktop app provides a robust messaging experience with end-to-end encryption, real-time notifications, and a modern user interface.

## 🚀 Features

### Core Functionality
- **Real-time Messaging**: Instant message delivery with WebSocket connections
- **Secure Authentication**: JWT-based authentication with token management
- **User Management**: User profiles, friend requests, and contact management
- **Chat Management**: Individual and group chats with participant management
- **Message Status**: Read receipts, delivery confirmations, and typing indicators
- **Offline Support**: Local message storage and offline message queuing

### Security Features
- **End-to-End Encryption**: Message encryption using XOR cryptography
- **Secure Token Storage**: Encrypted local token storage
- **Connection Security**: WSS (WebSocket Secure) connections
- **Input Validation**: Comprehensive input sanitization and validation

### User Experience
- **Modern UI**: Clean, responsive design with dark theme
- **Real-time Updates**: Live connection status and message synchronization
- **Error Handling**: Graceful error recovery and user feedback
- **Performance**: Optimized rendering and efficient data management

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Component Architecture**: Modular, reusable components
- **State Management**: Context API for global state management
- **Service Layer**: Dedicated services for API communication and WebSocket handling
- **Type Safety**: Comprehensive TypeScript interfaces and type checking

### Backend Integration (Tauri + Rust)
- **Native Performance**: Rust backend for high-performance operations
- **WebSocket Management**: Robust WebSocket connection handling with reconnection logic
- **Database Integration**: SQLite database with automatic migrations
- **Security**: Native encryption and secure token management

### API Integration
- **RESTful API**: Comprehensive API service matching Kotlin implementation
- **Real-time Communication**: WebSocket-based real-time messaging
- **Error Handling**: Robust error handling and retry mechanisms
- **Authentication**: Secure token-based authentication

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Rust 1.77+
- Tauri CLI

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd safe-desktop

# Install dependencies
npm install

# Install Tauri CLI
cargo install tauri-cli

# Run development server
npm run tauri dev
```

## 🔧 Configuration

### Environment Variables
The app uses the following configuration:
- `API_BASE_URL`: Backend API endpoint (default: `https://dev.v1.terracrypt.cc/api/v1`)
- `WS_URL`: WebSocket endpoint (default: `wss://dev.v1.terracrypt.cc/api/v1/ws`)

### Database
The app automatically creates and manages a local SQLite database (`chat.db`) with the following tables:
- `user`: User profiles and authentication data
- `message`: Local message storage with delivery status
- `chat`: Chat metadata and participant information
- `participant`: Chat membership and user roles
- `friend`: Friend relationships and status

## 🚀 Usage

### Authentication
1. **Registration**: Create a new account with email, username, and password
2. **Login**: Sign in with username and password
3. **Token Management**: Automatic token refresh and secure storage

### Messaging
1. **Start Chat**: Create new individual or group chats
2. **Send Messages**: Real-time message sending with encryption
3. **Message Status**: Track message delivery and read status
4. **Typing Indicators**: See when others are typing

### User Management
1. **Friend Requests**: Send and accept friend requests
2. **User Search**: Find users by username
3. **Profile Management**: Update profile information and settings

## 🔒 Security

### Encryption
- **Message Encryption**: XOR-based encryption for message content
- **Token Security**: Encrypted local storage of authentication tokens
- **Connection Security**: WSS connections with proper certificate validation

### Data Protection
- **Local Storage**: Encrypted local database storage
- **Input Validation**: Comprehensive input sanitization
- **Error Handling**: Secure error messages without data leakage

## 🛠️ Development

### Project Structure
```
safe-desktop/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── services/          # API and WebSocket services
│   ├── models/            # TypeScript interfaces
│   └── utils/             # Utility functions
├── src-tauri/             # Rust backend
│   ├── src/               # Rust source code
│   ├── sql/               # Database migrations
│   └── Cargo.toml         # Rust dependencies
└── chat/                  # Kotlin reference implementation
```

### Key Services

#### API Service (`src/apiService.ts`)
- Comprehensive API client matching Kotlin implementation
- Type-safe request/response handling
- Automatic token management
- Error handling and retry logic

#### WebSocket Service (`src/websocketService.ts`)
- Real-time message handling
- Connection management with reconnection
- Event-driven architecture
- Heartbeat monitoring

#### Authentication Service (`src/authService.ts`)
- Secure login/logout functionality
- Token validation and refresh
- User session management

### Rust Backend

#### WebSocket Management (`src-tauri/src/websocket.rs`)
- Robust WebSocket connection handling
- Automatic reconnection with exponential backoff
- Heartbeat monitoring and timeout handling
- Message queuing and delivery confirmation

#### Database Integration (`src-tauri/src/commands.rs`)
- SQLite database operations
- Automatic schema migrations
- Secure data storage and retrieval

## 🔄 Recent Improvements

### WebSocket Enhancements
- **Robust Connection Management**: Improved connection handling with proper state management
- **Automatic Reconnection**: Exponential backoff reconnection strategy
- **Heartbeat Monitoring**: Connection health monitoring with timeout detection
- **Error Recovery**: Graceful error handling and recovery mechanisms

### API Service Improvements
- **Comprehensive Endpoint Coverage**: All API endpoints from Kotlin implementation
- **Type Safety**: Full TypeScript type coverage for all API operations
- **Error Handling**: Improved error handling with detailed error messages
- **Authentication**: Secure token management and automatic token refresh

### UI/UX Enhancements
- **Modern Design**: Updated UI with better visual hierarchy and spacing
- **Real-time Status**: Connection status indicators and real-time updates
- **Message Status**: Visual indicators for message delivery and read status
- **Typing Indicators**: Real-time typing indicators for better user experience

### Security Improvements
- **Enhanced Encryption**: Improved XOR encryption implementation
- **Secure Storage**: Better token storage and management
- **Input Validation**: Comprehensive input sanitization and validation
- **Error Handling**: Secure error messages without sensitive data exposure

## 🧪 Testing

### Frontend Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration
```

### Backend Testing
```bash
# Run Rust tests
cargo test

# Run specific test modules
cargo test websocket
cargo test commands
```

## 📱 Building

### Development Build
```bash
npm run tauri dev
```

### Production Build
```bash
npm run tauri build
```

### Platform-Specific Builds
```bash
# Windows
npm run tauri build -- --target x86_64-pc-windows-msvc

# macOS
npm run tauri build -- --target x86_64-apple-darwin

# Linux
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the Kotlin reference implementation in the `/chat` folder

## 🔗 Related Projects

- **Kotlin Mobile App**: Reference implementation in the `/chat` folder
- **Backend API**: Server implementation at `https://dev.v1.terracrypt.cc`
- **Documentation**: API documentation and integration guides

---

**Note**: This desktop app is designed to work with the same backend server as the Kotlin mobile app, ensuring consistent functionality and data synchronization across platforms.
