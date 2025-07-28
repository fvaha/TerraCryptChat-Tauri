import React from 'react';

interface SidebarProps {
  activeTab: 'chats' | 'friends' | 'settings';
  onTabChange: (tab: 'chats' | 'friends' | 'settings') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) => {
  return (
    <div style={{
      width: isCollapsed ? '0px' : '72px',
      backgroundColor: '#2d2d2d',
      borderRight: '1px solid #404040',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0',
      flexShrink: 0,
      transition: 'width 0.3s ease-in-out',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Toggle Button - Always visible at top */}
      <button
        onClick={onToggleCollapse}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          transition: 'all 0.2s ease',
          marginBottom: '16px'
        }}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        ☰
      </button>

      {/* Navigation buttons container - slides left when collapsed */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
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
            backgroundColor: activeTab === 'chats' ? '#0078d4' : 'transparent',
            color: activeTab === 'chats' ? '#ffffff' : '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            marginBottom: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          💬
        </button>

        {/* Friends Tab */}
        <button
          onClick={() => onTabChange('friends')}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: activeTab === 'friends' ? '#0078d4' : 'transparent',
            color: activeTab === 'friends' ? '#ffffff' : '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            marginBottom: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          👥
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Settings Tab - Always visible at bottom */}
      <button
        onClick={() => onTabChange('settings')}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: activeTab === 'settings' ? '#0078d4' : 'transparent',
          color: activeTab === 'settings' ? '#ffffff' : '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'all 0.2s ease',
          marginBottom: '16px'
        }}
      >
        ⚙️
      </button>
    </div>
  );
};

export default Sidebar;