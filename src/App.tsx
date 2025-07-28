import React, { useState } from 'react';
import { useAppContext } from './AppContext';
import LoginScreen from './LoginScreen';
import ChatList from './ChatList';
import ChatView from './ChatView';
import FriendsScreen from './FriendsScreen';
import SettingsScreen from './SettingsScreen';
import ErrorBoundary from './ErrorBoundary';
import { ThemeProvider } from './ThemeContext';

const ChatApp: React.FC = () => {
  const { user, token, isLoading, error } = useAppContext();
  const [currentScreen, setCurrentScreen] = useState<'main' | 'friends' | 'settings'>('main');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

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

  // Signal-like layout
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff'
    }}>
      {/* Top Bar */}
      <div style={{
        height: '60px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#0078d4',
            borderRadius: '50%',
            marginRight: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            T
          </div>
          <span style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
            TerraCrypt
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setCurrentScreen('friends')}
            style={{
              padding: '8px 16px',
              backgroundColor: currentScreen === 'friends' ? '#0078d4' : 'transparent',
              color: currentScreen === 'friends' ? '#ffffff' : '#1a1a1a',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Friends
          </button>
          <button
            onClick={() => setCurrentScreen('settings')}
            style={{
              padding: '8px 16px',
              backgroundColor: currentScreen === 'settings' ? '#0078d4' : 'transparent',
              color: currentScreen === 'settings' ? '#ffffff' : '#1a1a1a',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex' }}>
        {currentScreen === 'main' ? (
          <>
            {/* Chat List - Left Panel (Dark theme like Signal) */}
            <div style={{
              width: '350px',
              backgroundColor: '#2d2d2d',
              borderRight: '1px solid #404040',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <ChatList onSelect={setSelectedChatId} />
            </div>
            
            {/* Chat View - Right Panel (Light theme like Signal) */}
            <div style={{ flex: 1, backgroundColor: '#ffffff' }}>
              {selectedChatId ? (
                <ChatView chatId={selectedChatId} />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666666',
                  fontSize: '16px'
                }}>
                  Select a chat to start messaging
                </div>
              )}
            </div>
          </>
        ) : currentScreen === 'friends' ? (
          <div style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <FriendsScreen 
              onBack={() => setCurrentScreen('main')} 
              onOpenChat={(friendId: string, friendName: string) => {
                console.log("Open chat with friend:", friendId, friendName);
                // TODO: Implement chat creation with friend
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <SettingsScreen onBack={() => setCurrentScreen('main')} />
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  console.log("🎨 App component rendering");
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ChatApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;