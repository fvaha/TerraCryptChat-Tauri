import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { useTheme } from './components/ThemeContext';
import LoginScreen from './auth/LoginScreen';
import RegisterForm from './auth/RegisterForm';
import ChatList from './chat/ChatList';
import ChatScreen from './chat/ChatScreen';
import FriendsScreen from './friend/FriendsScreen';
import SettingsScreen from './settings/SettingsScreen';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './components/Sidebar';
import MenuBar from './components/MenuBar';

import './App.css';
import { ThemeProvider } from './components/ThemeContext';
import SettingsContent from './components/SettingsContent';
import { nativeApiService } from './api/nativeApiService';
import { DatabaseFixUtil } from './utils/databaseFix';
import { Chat, Friend } from './models/models';

const ChatApp: React.FC = () => {
  const { user, token } = useAppContext();
  const { theme, isLoading: themeLoading } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'settings'>('chats');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState<string>('general');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRegister, setShowRegister] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize app and handle errors
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsInitializing(true);
        setAppError(null);
        
        // Test native API connection
        try {
          await nativeApiService.resizeWindow(800, 600);
          console.log('Native API connection successful');
        } catch (error) {
          console.error('Native API connection failed:', error);
          setAppError('Failed to connect to native backend. Please restart the application.');
          return;
        }
        
        setIsInitializing(false);
      } catch (error) {
        console.error('App initialization failed:', error);
        setAppError('Failed to initialize application. Please restart the application.');
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // Auto-resize window based on content
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
        // Main app - 800x600 size
        try {
          await nativeApiService.resizeWindow(800, 600);
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

  // Load chats when user is logged in
  useEffect(() => {
    console.log('App useEffect - user:', user?.username, 'token:', token ? 'present' : 'missing');
    if (user && token) {
      console.log('User and token available, loading chats...');
      
      // Check database health and auto-fix if needed
      const checkAndFixDatabase = async () => {
        try {
          await DatabaseFixUtil.autoFixIfNeeded();
        } catch (error) {
          console.error('Database health check failed:', error);
        }
      };
      
      checkAndFixDatabase().then(() => {
        loadChats();
        loadFriends(); // Load friends when user is logged in
      });
    } else {
      console.log('User or token missing, not loading chats');
    }
  }, [user, token]);

  const loadChats = async () => {
    try {
      console.log('Loading chats...');
      
      // First try to get cached chats
      let chatsData = await nativeApiService.getCachedChatsOnly();
      console.log('Cached chats loaded:', chatsData);
      
      // Then try to fetch fresh data from API and save to database
      try {
        const freshChats = await nativeApiService.fetchAllChatsAndSave(token!);
        console.log('Fresh chats loaded and saved:', freshChats);
        chatsData = freshChats;
      } catch (error) {
        console.warn('Failed to fetch fresh chats, using cached data:', error);
      }
      
      setChats(Array.isArray(chatsData) ? chatsData : []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadFriends = async () => {
    try {
      console.log('Loading friends...');
      
      // First try to get cached friends
      let friendsData = await nativeApiService.getCachedFriendsOnly();
      console.log('Cached friends loaded:', friendsData);
      
      // Then try to fetch fresh data from API and save to database
      try {
        const freshFriends = await nativeApiService.fetchAllFriendsAndSave(token!);
        console.log('Fresh friends loaded and saved:', freshFriends);
        friendsData = freshFriends;
      } catch (error) {
        console.warn('Failed to fetch fresh friends, using cached data:', error);
      }
      
      setFriends(Array.isArray(friendsData) ? friendsData : []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const findChatWithFriend = (friendId: string) => {
    return chats.find(chat => 
      !chat.is_group && 
      chat.participants?.some((p: any) => p.user?.user_id === friendId)
    )?.chat_id;
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    // Apply zoom to document
    document.body.style.zoom = newZoom.toString();
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

  // Show loading screen while initializing
  if (isInitializing) {
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
            Initializing application...
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
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        {showRegister ? (
          <RegisterForm
            onSuccess={() => {
              console.log('Registration successful');
              setShowRegister(false);
            }}
            onBackToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginScreen
            onSuccess={() => {
              console.log('Login successful');
            }}
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
      overflow: 'hidden'
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
        {/* Sidebar */}
        <div style={{
          width: sidebarCollapsed ? '0px' : '72px',
          backgroundColor: theme.sidebar,
          borderRight: `1px solid ${theme.sidebarBorder}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          flexShrink: 0,
          transition: 'width 0.3s ease-in-out',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Content Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}>

          {activeTab === 'chats' && (
            <>
              {/* Chat List Panel */}
              <div style={{
                width: '350px',
                backgroundColor: theme.sidebar,
                borderRight: `1px solid ${theme.sidebarBorder}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <ChatList
                  onSelect={setSelectedChatId}
                  onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                  sidebarCollapsed={sidebarCollapsed}
                />
              </div>

              {/* Chat Screen Panel */}
              <div style={{
                flex: 1,
                backgroundColor: theme.background,
                overflow: 'hidden',
                position: 'relative'
              }}>
                {selectedChatId ? (
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
              {/* Friends Sidebar */}
              <div style={{
                width: '350px',
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

              {/* Friend Chat Screen Panel */}
              <div style={{
                flex: 1,
                backgroundColor: theme.background,
                overflow: 'hidden',
                position: 'relative'
              }}>
                {selectedChatId ? (
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
              {/* Settings Sidebar */}
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
              
              {/* Settings Content Panel */}
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

export default App;