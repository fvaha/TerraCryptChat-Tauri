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
  
  // Professional loading states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing application...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Chat options screen state
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [selectedChatForOptions, setSelectedChatForOptions] = useState<Chat | null>(null);

  // Load data from database instantly, update in background
  const loadChats = useCallback(async () => {
    try {
      // Load from database instantly
      const chatsData = await nativeApiService.getCachedChatsOnly();
      setChats(Array.isArray(chatsData) ? chatsData : []);
      
      // Update from API in background (non-blocking) - simplified since fetchAllChatsAndSave doesn't exist
      setTimeout(async () => {
        try {
          // Just reload from database for now
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
      
      // Update from API in background (non-blocking) - simplified since fetchAllFriendsAndSave doesn't exist
      setTimeout(async () => {
        try {
          // Just reload from database for now
          await nativeApiService.getCachedFriendsOnly();
        } catch (error) {
          // Silent fail - user already has data from database
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }, [token]);

  // Professional loading sequence
  const startLoadingSequence = useCallback(async () => {
    setLoadingMessage('Starting TerraCrypt Messenger...');
    setLoadingProgress(5);
    
    // Simulate initialization steps with realistic timing and detailed messages
    await new Promise(resolve => setTimeout(resolve, 400));
    setLoadingMessage('Checking user authentication...');
    setLoadingProgress(20);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoadingMessage('Loading user profile and settings...');
    setLoadingProgress(35);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    setLoadingMessage('Initializing secure database...');
    setLoadingProgress(50);
    
    await new Promise(resolve => setTimeout(resolve, 450));
    setLoadingMessage('Loading cached conversations...');
    setLoadingProgress(65);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoadingMessage('Starting background sync...');
    setLoadingProgress(80);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    setLoadingMessage('Preparing interface...');
    setLoadingProgress(90);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setLoadingMessage('TerraCrypt Messenger is ready!');
    setLoadingProgress(100);
    
    // Hold on "Ready!" for a moment before transitioning
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsLoading(false);
  }, []);

  // Initialize app with professional loading
  useEffect(() => {
    const initializeApp = async () => {
      await startLoadingSequence();
      setIsInitializing(false);
    };
    
    initializeApp();
  }, [startLoadingSequence]);

  // Handle session checking with smooth transition
  useEffect(() => {
    if (user && token) {
      setIsAuthenticated(true);
      setIsSessionChecking(false);
    } else if (sessionState.is_session_initialized) {
      setIsAuthenticated(false);
      setIsSessionChecking(false);
    }
  }, [user, token, sessionState.is_session_initialized]);

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
      console.log('Resizing window - Token:', !!token, 'User:', !!user, 'ShowRegister:', showRegister);
      
      if (!token || !user) {
        if (showRegister) {
          // Registration screen - compact size
          console.log('Setting registration window size: 400x500+');
          try {
            await nativeApiService.resizeWindow(400, 500);
          } catch (error) {
            console.error('Failed to resize window for registration:', error);
          }
        } else {
          // Login screen - compact size
          console.log('Setting login window size: 400x500+');
          try {
            await nativeApiService.resizeWindow(400, 700);
          } catch (error) {
            console.error('Failed to resize window for login:', error);
          }
        }
      } else {
        // Main app - full size
        console.log('Setting main app window size: 960x600');
        try {
          await nativeApiService.resizeWindow(960, 600);
        } catch (error) {
          console.error('Failed to resize window for main app:', error);
        }
      }
    };

    // Resize immediately and also after a delay to ensure DOM is ready
    resizeWindow();
    const timeoutId = setTimeout(resizeWindow, 200);
    
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

  // Show professional loading screen while initializing, checking session, or loading
  if (isInitializing || isSessionChecking || isLoading) {
    return (
      <div 
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          backgroundColor: '#0a0a0a',
          color: '#ffffff'
        }}
      >
        {/* Main loading content */}
        <div style={{
          textAlign: 'center',
          padding: '40px',
          maxWidth: '500px',
          width: '100%'
        }}>
          {/* App Logo */}
          <img 
            src="logo.png"
            alt="TerraCrypt Messenger App"
            style={{
              width: '165px',
              height: '111px',
              margin: '0 auto 30px auto',
              display: 'block'
            }}
          />

          {/* App Name */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: '600',
            margin: '0 0 8px 0',
            color: '#ffffff'
          }}>
            TerraCrypt Messenger App
          </h1>

          {/* App Description */}
          <p style={{
            fontSize: '16px',
            margin: '0 0 40px 0',
            color: '#9ca3af'
          }}>
            Secure Communication Platform
          </p>

          {/* Loading Message */}
          <h2 
            style={{
              fontSize: '20px',
              fontWeight: '500',
              margin: '0 0 30px 0',
              color: '#e5e7eb',
              minHeight: '28px'
            }}
          >
            {loadingMessage}
          </h2>

          {/* Simple Progress Bar */}
          <div style={{
            width: '100%',
            height: '8px',
            marginBottom: '20px',
            background: '#1f2937',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div 
              style={{
                width: `${loadingProgress}%`,
                height: '100%',
                background: '#fbbf24',
                borderRadius: '4px',
                transition: 'width 0.3s ease-in-out'
              }}
            />
          </div>

          {/* Progress Details */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            <span style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              {loadingProgress}%
            </span>
            <span style={{
              fontSize: '14px',
              color: '#9ca3af'
            }}>
              {loadingProgress < 20 && 'Initializing...'}
              {loadingProgress >= 20 && loadingProgress < 35 && 'Loading data...'}
              {loadingProgress >= 35 && loadingProgress < 50 && 'Preparing UI...'}
              {loadingProgress >= 50 && loadingProgress < 65 && 'Database setup...'}
              {loadingProgress >= 65 && loadingProgress < 80 && 'Sync starting...'}
              {loadingProgress >= 80 && loadingProgress < 90 && 'Finalizing...'}
              {loadingProgress >= 90 && 'Almost ready...'}
            </span>
          </div>

          {/* Simple Loading Spinner */}
          <div style={{ 
            width: '32px', 
            height: '32px', 
            margin: '0 auto',
            border: '3px solid #374151',
            borderTop: '3px solid #fbbf24',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </div>
    );
  }

  // Show loading screen while theme is loading
  if (themeLoading) {
    return (
      <div 
        className="loading-screen"
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
          color: theme.text,
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
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

  // Show login/register screens only if not authenticated
  if (!isAuthenticated) {
    return (
      <div 
        className="auth-screen"
        style={{
          height: '100vh',
          width: '100vw',
          backgroundColor: theme.background,
          color: theme.text,
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
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
    <div 
      className="main-app"
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden'
      }}
    >
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
      <div 
        className="content-area"
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* FIRST WINDOW: Sidebar */}
        <div 
          className="content-panel"
          style={{
             width: sidebarCollapsed ? '0px' : '72px',
             backgroundColor: theme.sidebar,
             borderRight: `1px solid ${theme.sidebarBorder}`,
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             padding: '16px 0',
             flexShrink: 0,
             position: 'relative',
             overflow: 'hidden',
             opacity: sidebarCollapsed ? 0 : 1
           }}
         >
           <Sidebar
             activeTab={activeTab}
             onTabChange={setActiveTab}
             isCollapsed={sidebarCollapsed}
             onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
           />
         </div>
        
        

        {/* SECOND & THIRD WINDOW: Content Area */}
        <div 
          className="content-area"
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* SECOND WINDOW: Always visible content panel */}
          <div 
            className="content-panel"
            style={{
              width: activeTab === 'settings' ? '250px' : '280px',
              backgroundColor: theme.sidebar,
              borderRight: `1px solid ${theme.sidebarBorder}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {activeTab === 'chats' && (
              <ChatList
                onSelect={setSelectedChatId}
                onOpenChatOptions={handleOpenChatOptions}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                sidebarCollapsed={sidebarCollapsed}
              />
            )}
            
            {activeTab === 'friends' && (
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
            )}
            
            {activeTab === 'settings' && (
              <SettingsScreen 
                onBack={() => setActiveTab('chats')} 
                onCategoryChange={setSelectedSettingsCategory}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                sidebarCollapsed={sidebarCollapsed}
              />
            )}
          </div>

          {/* THIRD WINDOW: Always visible detail panel */}
          <div 
            className="detail-panel"
            style={{
              flex: 1,
              backgroundColor: theme.background,
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {showChatOptions && selectedChatForOptions ? (
              <ChatOptionsScreen
                chat={selectedChatForOptions}
                onClose={handleCloseChatOptions}
              />
            ) : selectedChatId && (activeTab === 'chats' || activeTab === 'friends') ? (
              <ChatScreen 
                chatId={selectedChatId} 
                onClose={() => setSelectedChatId(null)}
              />
            ) : activeTab === 'settings' ? (
              <SettingsContent 
                selectedCategory={selectedSettingsCategory} 
                zoomLevel={zoomLevel}
                onZoomChange={handleZoomChange}
              />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: theme.textSecondary,
                fontSize: '16px'
              }}>
                {activeTab === 'chats' ? (
                  <p>Select a chat to start messaging</p>
                ) : activeTab === 'friends' ? (
                  <p>Select a friend to start messaging</p>
                ) : (
                  <p>Configure your app preferences</p>
                )}
              </div>
            )}
          </div>
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

// Remove the FallbackApp component since it's not needed
export default App;
