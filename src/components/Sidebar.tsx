// FIRST WINDOW: Sidebar component - displays navigation sidebar in the first window
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

  const sidebarStyles = {
    width: '72px',
    backgroundColor: "transparent",
    borderRight: `1px solid ${theme.sidebarBorder}`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    padding: '8px 0 0 0',
    flexShrink: 0,
    transition: 'width 0.3s ease-in-out',
    position: 'relative' as const,
    overflow: 'visible' as const,
    height: '100vh'
  };

  const toggleButtonStyles = {
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
    marginTop: '-20px',
    marginBottom: '12px',
    marginLeft: '12px',
    transition: 'all 0.15s ease',
    opacity: isCollapsed ? 0 : 1,
    transform: isCollapsed ? 'translateX(-20px)' : 'translateX(0)'
  };

  const navContainerStyles = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
    transform: isCollapsed ? 'translateX(-24px)' : 'translateX(0)',
    transition: 'all 0.15s ease',
    opacity: isCollapsed ? 0 : 1
  };

  const createNavButton = (tab: 'chats' | 'friends' | 'settings', icon: React.ReactNode) => {
    const isActive = activeTab === tab;
    return (
      <button
        key={tab}
        onClick={() => onTabChange(tab)}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: isActive ? theme.primary : 'transparent',
          color: isActive ? '#ffffff' : theme.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          marginBottom: '8px',
          transition: 'all 0.15s ease'
        }}
      >
        {icon}
      </button>
    );
  };

  return (
    <div style={sidebarStyles}>
      {/* Toggle Button - Always visible at top */}
      <button
        onClick={onToggleCollapse}
        className="toggle-button"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={toggleButtonStyles}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Main Navigation buttons container - slides left when collapsed */}
      <div style={navContainerStyles}>
        {createNavButton('chats', (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        ))}

        {createNavButton('friends', (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="m22 21-2-2a4 4 0 0 0-3-3h-1a4 4 0 0 0-3 3l2 2"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        ))}

        {createNavButton('settings', (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
