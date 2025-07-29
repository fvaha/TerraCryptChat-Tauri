import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { useTheme } from './ThemeContext';
import LoginScreen from './LoginScreen';
import RegisterForm from './RegisterForm';
import ChatList from './ChatList';
import ChatScreen from './ChatScreen';
import FriendsScreen from './FriendsScreen';
import SettingsScreen from './SettingsScreen';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './components/Sidebar';
import MenuBar from './components/MenuBar';

import './App.css';
import { ThemeProvider } from './ThemeContext';
import SettingsContent from './components/SettingsContent';
import { nativeApiService } from './nativeApiService';
import { DatabaseFixUtil } from './utils/databaseFix';

const ChatApp: React.FC = () => {
  const { user, token } = useAppContext();
  const { theme, isLoading: themeLoading } = useTheme();
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'settings'>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Array<{ chat_id: string; name?: string; is_group: boolean; created_at: number; creator_id: string; participants?: string[]; unread_count: number }>>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState<string>('general');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRegister, setShowRegister] = useState(false);

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
    console.log('🔄 App useEffect - user:', user?.username, 'token:', token ? 'present' : 'missing');
    if (user && token) {
      console.log('✅ User and token available, loading chats...');
      
      // Check database health and auto-fix if needed
      const checkAndFixDatabase = async () => {
        try {
          await DatabaseFixUtil.autoFixIfNeeded();
        } catch (error) {
          console.error('❌ Database health check failed:', error);
        }
      };
      
      checkAndFixDatabase().then(() => {
        loadChats();
      });
    } else {
      console.log('❌ User or token missing, not loading chats');
    }
  }, [user, token]);

  const loadChats = async () => {
    try {
      console.log('🔄 Loading chats...');
      const chatsData = await nativeApiService.getChats();
      console.log('✅ Chats loaded:', chatsData);
      setChats(Array.isArray(chatsData) ? chatsData : []);
    } catch (error) {
      console.error('❌ Failed to load chats:', error);
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
                      // For now, we'll just set the selected chat ID to trigger chat screen
                      // This will be the chat ID once we implement proper logic
                      setSelectedChatId(friendId); // This will be the chat ID once we implement proper logic
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