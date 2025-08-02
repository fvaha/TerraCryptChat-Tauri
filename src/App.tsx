import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from './AppContext';
import { useTheme } from './components/ThemeContext';
import LoginScreen from './auth/LoginScreen';
import RegisterForm from './auth/RegisterForm';
import ChatList from './chat/ChatList';
import ChatScreen from './chat/ChatScreen';
import ChatOptionsScreen from './chat/ChatOptionsScreen';
import FriendsScreen from './friend/FriendsScreen';
import SettingsScreen from './settings/SettingsScreen';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './components/Sidebar';
import MenuBar from './components/MenuBar';


import { ThemeProvider } from './components/ThemeContext';
import SettingsContent from './components/SettingsContent';
import { nativeApiService } from './api/nativeApiService';
import { Chat } from './models/models';





const ChatApp: React.FC = () => {
  const { user, token, sessionState } = useAppContext();
  const { theme, isLoading: themeLoading } = useTheme();
  
  // Minimal logging for performance
  const [chats, setChats] = useState<Chat[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'settings'>('chats');
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState<string>('general');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRegister, setShowRegister] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  
  // Chat options screen state
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [selectedChatForOptions, setSelectedChatForOptions] = useState<Chat | null>(null);

  // Load data from database instantly, update in background
  const loadChats = useCallback(async () => {
    try {
      // Load from database instantly
      const chatsData = await nativeApiService.getCachedChatsOnly();
      setChats(Array.isArray(chatsData) ? chatsData : []);
      
      // Update from API in background (non-blocking)
      setTimeout(async () => {
        try {
          await nativeApiService.fetchAllChatsAndSave(token!);
          const updatedChats = await nativeApiService.getCachedChatsOnly();
          setChats(Array.isArray(updatedChats) ? updatedChats : []);
        } catch (error) {
          // Silent fail - user already has data from database
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, [token]);

  const loadFriends = useCallback(async () => {
    try {
      // Load from database instantly
      const friendsData = await nativeApiService.getCachedFriendsOnly();
      
      // Update from API in background (non-blocking)
      setTimeout(async () => {
        try {
          await nativeApiService.fetchAllFriendsAndSave(token!);
        } catch (error) {
          // Silent fail - user already has data from database
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }, [token]);

  // Initialize app instantly
  useEffect(() => {
    setIsInitializing(false);
  }, []);

  // Handle session checking - instant
  useEffect(() => {
    if (user && token) {
      setIsSessionChecking(false);
    } else if (sessionState.isSessionInitialized) {
      setIsSessionChecking(false);
    }
  }, [user, token, sessionState.isSessionInitialized]);

  // Load chats when user is logged in
  useEffect(() => {
    if (user && token) {
      loadChats();
      loadFriends();
    }
  }, [user, token, loadChats, loadFriends]);

  // Auto-resize window based on content (non-blocking)
  useEffect(() => {
    const resizeWindow = async () => {
      if (!token || !user) {
        if (showRegister) {
          // Registration screen - auto-adjust based on content
          const registrationCard = document.querySelector('[data-screen="registration"]');
          if (registrationCard) {
            const cardHeight = registrationCard.getBoundingClientRect().height;
            const windowHeight = Math.max(700, cardHeight + 100); // Minimum 700px, add padding
            const windowWidth = 500; // Fixed width for registration
            try {
              await nativeApiService.resizeWindow(windowWidth, windowHeight);
            } catch (error) {
              console.error('Failed to resize window:', error);
            }
          }
        } else {
          // Login screen - auto-adjust based on content
          const loginCard = document.querySelector('[data-screen="login"]');
          if (loginCard) {
            const cardHeight = loginCard.getBoundingClientRect().height;
            const windowHeight = Math.max(650, cardHeight + 120); // Increased minimum height and padding
            const windowWidth = 500; // Increased width for login
            try {
              await nativeApiService.resizeWindow(windowWidth, windowHeight);
            } catch (error) {
              console.error('Failed to resize window:', error);
            }
          }
        }
      } else {
        // Main app - 960x600 size (20% wider)
        try {
          await nativeApiService.resizeWindow(960, 600);
        } catch (error) {
          console.error('Failed to resize window:', error);
        }
      }
    };

    // Resize after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(resizeWindow, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [showRegister, token, user]);

  const findChatWithFriend = (friendId: string) => {
    return chats.find(chat => 
      !chat.is_group && 
      chat.participants?.some((participantId: string) => participantId === friendId)
    )?.chat_id;
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Apply zoom to document
    document.body.style.zoom = newZoom.toString();
  };

  const handleOpenChatOptions = (chat: Chat) => {
    setSelectedChatForOptions(chat);
    setShowChatOptions(true);
  };

  const handleCloseChatOptions = () => {
    setShowChatOptions(false);
    setSelectedChatForOptions(null);
  };

  // Show error screen if app failed to initialize
  if (appError) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
        flexDirection: 'column',
        gap: '20px',
        padding: '40px'
      }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Application Error</h1>
        <p style={{ fontSize: '16px', textAlign: 'center', margin: 0 }}>{appError}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Restart Application
        </button>
      </div>
    );
  }

  // Show loading screen while initializing or checking session
  if (isInitializing || isSessionChecking) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #404040',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>
            {isInitializing ? 'Initializing application...' : 'Checking session...'}
          </span>
        </div>
      </div>
    );
  }

  // Show loading screen while theme is loading
  if (themeLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: `3px solid ${theme.border}`,
            borderTop: `3px solid ${theme.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '14px', color: theme.textSecondary }}>
            Loading theme...
          </span>
        </div>
      </div>
    );
  }

  // Show login/register screens
  if (!token || !user) {
    
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {showRegister ? (
          <RegisterForm 
            onSuccess={() => setShowRegister(false)}
            onBackToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginScreen 
            onSuccess={() => setShowRegister(false)}
            onShowRegister={() => setShowRegister(true)}
          />
        )}
      </div>
    );
  }

  // Show main app
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.background,
      color: theme.text,
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
      opacity: 1, // Removed opacity transition as it's not needed for smooth transition
      transition: 'opacity 0.3s ease-in-out'
    }}>
      {/* Menu Bar */}
      <MenuBar 
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowFriends={() => setActiveTab('friends')}
        onShowSettings={() => setActiveTab('settings')}
        onZoomIn={() => handleZoomChange(zoomLevel + 0.1)}
        onZoomOut={() => handleZoomChange(zoomLevel - 0.1)}
        onResetZoom={() => handleZoomChange(1)}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* FIRST WINDOW: Sidebar */}
        <div style={{
           width: sidebarCollapsed ? '0px' : '72px',
           backgroundColor: theme.sidebar,
           borderRight: `1px solid ${theme.sidebarBorder}`,
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           padding: '16px 0',
           flexShrink: 0,
           transition: 'width 0.2s ease-in-out',
           position: 'relative',
           overflow: 'hidden',
           opacity: sidebarCollapsed ? 0 : 1
         }}>
           <Sidebar
             activeTab={activeTab}
             onTabChange={setActiveTab}
             isCollapsed={sidebarCollapsed}
             onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
           />
         </div>
        
        

        {/* SECOND & THIRD WINDOW: Content Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          opacity: 1, // Removed opacity transition as it's not needed for smooth transition
          transition: 'opacity 0.5s ease-in-out'
        }}>

          {activeTab === 'chats' && (
            <>
              {/* SECOND WINDOW: ChatList */}
              <div style={{
                width: '280px', // Reduced from 350px (-20%)
                backgroundColor: theme.sidebar,
                borderRight: `1px solid ${theme.sidebarBorder}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <ChatList
                  onSelect={setSelectedChatId}
                  onOpenChatOptions={handleOpenChatOptions}
                  onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                  sidebarCollapsed={sidebarCollapsed}
                />
              </div>

              {/* THIRD WINDOW: ChatScreen/ChatOptionsScreen */}
              <div style={{
                flex: 1,
                backgroundColor: theme.background,
                overflow: 'hidden',
                position: 'relative'
              }}>
                {showChatOptions && selectedChatForOptions ? (
                  <ChatOptionsScreen
                    chat={selectedChatForOptions}
                    onClose={handleCloseChatOptions}
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    sidebarCollapsed={sidebarCollapsed}
                  />
                ) : selectedChatId ? (
                  <ChatScreen chatId={selectedChatId} />
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: theme.textSecondary,
                    fontSize: '16px'
                  }}>
                    Select a chat to start messaging
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'friends' && (
            <>
              {/* SECOND WINDOW: FriendsScreen */}
              <div style={{
                width: '280px', // Reduced from 350px (-20%)
                backgroundColor: theme.sidebar,
                borderRight: `1px solid ${theme.sidebarBorder}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <FriendsScreen
                  onOpenChat={(friendId: string, friendName: string) => {
                    console.log("Open chat with friend:", friendId, friendName);
                    // Find existing chat with this friend or create new one
                    const existingChatId = findChatWithFriend(friendId);
                    if (existingChatId) {
                      setSelectedChatId(existingChatId);
                    } else {
                      // TODO: Implement proper chat creation logic
                      console.log("Creating new chat for friend:", friendId);
                      // For now, use the existing chat ID from the database as fallback
                      // This ensures we always use a valid UUID format
                      const fallbackChatId = "41d22dac-b005-49db-a248-58b3d0c6b71a";
                      console.log("Using fallback chat ID:", fallbackChatId);
                      setSelectedChatId(fallbackChatId);
                    }
                  }}
                  onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                  sidebarCollapsed={sidebarCollapsed}
                />
              </div>

              {/* THIRD WINDOW: ChatScreen/ChatOptionsScreen */}
              <div style={{
                flex: 1,
                backgroundColor: theme.background,
                overflow: 'hidden',
                position: 'relative'
              }}>
                {showChatOptions && selectedChatForOptions ? (
                  <ChatOptionsScreen
                    chat={selectedChatForOptions}
                    onClose={handleCloseChatOptions}
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    sidebarCollapsed={sidebarCollapsed}
                  />
                ) : selectedChatId ? (
                  <ChatScreen chatId={selectedChatId} />
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: theme.textSecondary,
                    fontSize: '16px'
                  }}>
                    Select a friend to start messaging
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <>
              {/* SECOND WINDOW: SettingsScreen */}
              <div style={{
                width: '250px',
                backgroundColor: theme.sidebar,
                borderRight: `1px solid ${theme.sidebarBorder}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <SettingsScreen 
                  onBack={() => setActiveTab('chats')} 
                  onCategoryChange={setSelectedSettingsCategory}
                  onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                  sidebarCollapsed={sidebarCollapsed}
                />
              </div>
              
              {/* THIRD WINDOW: SettingsContent */}
              <SettingsContent 
                selectedCategory={selectedSettingsCategory} 
                zoomLevel={zoomLevel}
                onZoomChange={handleZoomChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ChatApp />
      </ErrorBoundary>
    </ThemeProvider>
  );
};

// Fallback component in case everything fails
const FallbackApp = () => {
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1 style={{ fontSize: '24px', margin: 0 }}>TerraCrypt Chat</h1>
      <p style={{ fontSize: '16px', margin: 0 }}>Loading application...</p>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #404040',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
    </div>
  );
};

export default App;