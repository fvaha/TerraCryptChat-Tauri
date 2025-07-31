import React from 'react';
import { useTheme } from './ThemeContext';

interface SidebarProps {
  activeTab: 'chats' | 'friends' | 'settings';
  onTabChange: (tab: 'chats' | 'friends' | 'settings') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) => {
  const { theme } = useTheme();

  return (
    <div style={{
      width: isCollapsed ? '0px' : '72px',
      backgroundColor: theme.sidebar,
      borderRight: `1px solid ${theme.sidebarBorder}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0',
      flexShrink: 0,
      transition: 'width 0.3s ease-in-out',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Toggle Button - Always visible at top */}
      <button
        onClick={onToggleCollapse}
        className="toggle-button"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: 'transparent',
          color: theme.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          marginTop: '0px',
          marginBottom: '16px',
          transition: 'all 0.3s ease',
          animation: isCollapsed ? 'fadeOutSlide 0.3s ease' : 'none',
          opacity: isCollapsed ? 0 : 1,
          transform: isCollapsed ? 'translateX(-20px)' : 'translateX(0)'
        }}
        onMouseEnter={(e) => {
          if (!isCollapsed) {
            e.currentTarget.style.backgroundColor = theme.hover;
            e.currentTarget.style.color = theme.text;
          }
        }}
        onMouseLeave={(e) => {
          if (!isCollapsed) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.textSecondary;
          }
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Main Navigation buttons container - slides left when collapsed */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        transform: isCollapsed ? 'translateX(-24px)' : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out',
        opacity: isCollapsed ? 0 : 1
      }}>
        {/* Chats Tab */}
        <button
          onClick={() => onTabChange('chats')}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activeTab === 'chats' ? theme.primary : 'transparent',
            color: activeTab === 'chats' ? '#ffffff' : theme.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            marginBottom: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'chats') {
              e.currentTarget.style.backgroundColor = theme.hover;
              e.currentTarget.style.color = theme.text;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'chats') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textSecondary;
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        {/* Friends Tab */}
        <button
          onClick={() => onTabChange('friends')}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activeTab === 'friends' ? theme.primary : 'transparent',
            color: activeTab === 'friends' ? '#ffffff' : theme.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            marginBottom: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'friends') {
              e.currentTarget.style.backgroundColor = theme.hover;
              e.currentTarget.style.color = theme.text;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'friends') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textSecondary;
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="m22 21-2-2"/>
            <path d="M16 16.28A13.13 13.13 0 0 1 22 21"/>
          </svg>
        </button>
      </div>

      {/* Settings Tab - Fixed at bottom */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: isCollapsed ? 'translateX(-24px)' : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out',
        opacity: isCollapsed ? 0 : 1
      }}>
        <button
          onClick={() => onTabChange('settings')}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activeTab === 'settings' ? theme.primary : 'transparent',
            color: activeTab === 'settings' ? '#ffffff' : theme.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'settings') {
              e.currentTarget.style.backgroundColor = theme.hover;
              e.currentTarget.style.color = theme.text;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'settings') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textSecondary;
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
      
      <style>{`
        @keyframes fadeOutSlide {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default Sidebar;