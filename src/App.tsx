import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
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
  const { user, token, isLoading, error } = useAppContext();
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'settings'>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
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
      console.log('Loading chats for user:', user?.username);
      const chatsData = await nativeApiService.getCachedChatsForCurrentUser();
      console.log('Loaded chats:', chatsData);
      console.log('Chats array length:', chatsData?.length || 0);
      if (chatsData && Array.isArray(chatsData)) {
        setChats(chatsData);
        console.log('✅ Chats set in state:', chatsData.length);
      } else {
        console.warn('Invalid chats data received:', chatsData);
        setChats([]);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      setChats([]);
    }
  };

  // Function to find chat with a specific friend
  const findChatWithFriend = (friendId: string) => {
    // Look for a direct chat (non-group) that includes this friend
    // This is a simplified version - in a real implementation, you'd need to check participants
    const directChat = chats.find(chat => 
      !chat.is_group && 
      (chat.creator_id === friendId || chat.participants?.includes(friendId))
    );
    return directChat?.chat_id || null;
  };

  // Update zoom level in CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--app-zoom', zoomLevel.toString());
  }, [zoomLevel]);

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
  };

  // const handleCreateChat = async () => {
  //   // Reload chats after creation
  //   await loadChats();
  // };

  // Add database fix utility to window object for debugging
  useEffect(() => {
    (window as any).fixDatabase = async () => {
      try {
        console.log('🔧 Manual database fix triggered from console');
        await DatabaseFixUtil.fixDatabaseSchema();
        console.log('✅ Database fix completed successfully');
        // Reload chats after fix
        await loadChats();
      } catch (error) {
        console.error('❌ Database fix failed:', error);
      }
    };
    
    (window as any).checkDatabaseHealth = async () => {
      try {
        const health = await DatabaseFixUtil.checkDatabaseHealth();
        console.log('🏥 Database health check result:', health);
        return health;
      } catch (error) {
        console.error('❌ Database health check failed:', error);
        throw error;
      }
    };
    
    (window as any).autoFixDatabase = async () => {
      try {
        const wasFixed = await DatabaseFixUtil.autoFixIfNeeded();
        if (wasFixed) {
          console.log('✅ Database was automatically fixed');
          // Reload chats after fix
          await loadChats();
        } else {
          console.log('ℹ️ Database is healthy, no fix needed');
        }
        return wasFixed;
      } catch (error) {
        console.error('❌ Auto-fix failed:', error);
        throw error;
      }
    };
    
    (window as any).forceResetDatabase = async () => {
      try {
        console.log('🚨 Force resetting database...');
        await DatabaseFixUtil.forceResetDatabase();
        console.log('✅ Database force reset completed');
        // Reload chats after reset
        await loadChats();
      } catch (error) {
        console.error('❌ Force reset failed:', error);
        throw error;
      }
    };
  }, []);

  console.log("🎯 ChatApp render - token:", !!token, "isLoading:", isLoading, "error:", error);

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #ffffff',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div>Loading TerraCrypt...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2>Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#0078d4',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    if (showRegister) {
      return <RegisterForm onSuccess={() => setShowRegister(false)} onBackToLogin={() => setShowRegister(false)} />;
    }
    return <LoginScreen onSuccess={() => {}} onShowRegister={() => setShowRegister(true)} />;
  }

  // Signal-like layout with proper sidebar navigation
  return (
    <div className="app-container">
      {/* Menu Bar */}
      <MenuBar />
      
      {/* Main Content */}
      <div className="main-content">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        {/* Content Area */}
        <div className="chat-screen-area">
          {activeTab === 'chats' ? (
            <>
              {/* Chat List Panel */}
              <div style={{
                width: '350px',
                backgroundColor: '#2d2d2d',
                borderRight: '1px solid #404040',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <ChatList 
                  onSelect={setSelectedChatId}
                  isCollapsed={sidebarCollapsed}
                  onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
              </div>

              {/* Chat Screen Panel */}
              <div style={{
                flex: 1,
                backgroundColor: '#333333',
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
                    color: '#ffffff',
                    fontSize: '16px'
                  }}>
                    Select a chat to start messaging
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'friends' ? (
            <>
              {/* Friends List Panel */}
              <div style={{
                width: '350px',
                backgroundColor: '#2d2d2d',
                borderRight: '1px solid #404040',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <FriendsScreen
                  onBack={() => setActiveTab('chats')}
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
                  isCollapsed={sidebarCollapsed}
                  onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
              </div>

              {/* Friend Chat Screen Panel */}
              <div style={{
                flex: 1,
                backgroundColor: '#333333',
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
                    color: '#ffffff',
                    fontSize: '16px'
                  }}>
                    Select a friend to start messaging
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Settings Sidebar */}
              <div style={{
                width: '250px',
                backgroundColor: '#2d2d2d',
                borderRight: '1px solid #404040',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <SettingsScreen 
                  onBack={() => setActiveTab('chats')} 
                  isCollapsed={sidebarCollapsed}
                  onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                  onCategoryChange={setSelectedSettingsCategory}
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

      {/* Create Chat Modal */}
      {/* Removed Create Chat Modal */}
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