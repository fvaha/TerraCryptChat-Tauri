import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import LoginScreen from './LoginScreen';
import ChatList from './ChatList';
import ChatScreen from './ChatScreen';
import FriendsScreen from './FriendsScreen';
import SettingsScreen from './SettingsScreen';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './components/Sidebar';
import MenuBar from './components/MenuBar';
import ScreenToggleButton from './components/ScreenToggleButton';
import './App.css';
import { ThemeProvider } from './ThemeContext';
import SettingsContent from './components/SettingsContent';

const ChatApp: React.FC = () => {
  const { user, token, isLoading, error } = useAppContext();
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'settings'>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState<string>('general');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Update zoom level in CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--app-zoom', zoomLevel.toString());
  }, [zoomLevel]);

  // Pass zoom level to SettingsContent
  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
  };

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
    return <LoginScreen onSuccess={() => {}} onShowRegister={() => {}} />;
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
                    // TODO: Implement chat creation with friend
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