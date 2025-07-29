import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';

interface MenuBarProps {
  onToggleSidebar?: () => void;
  onShowFriends?: () => void;
  onShowSettings?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ 
  onToggleSidebar, 
  onShowFriends, 
  onShowSettings,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) => {
  const { theme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = {
    File: [
      { label: 'New Chat', action: () => console.log('New Chat') },
      { label: 'Open Chat...', action: () => console.log('Open Chat') },
      { label: 'Save Chat', action: () => console.log('Save Chat') },
      { label: '---' },
      { label: 'Exit', action: () => window.close() }
    ],
    Edit: [
      { label: 'Undo', action: () => console.log('Undo') },
      { label: 'Redo', action: () => console.log('Redo') },
      { label: '---' },
      { label: 'Cut', action: () => console.log('Cut') },
      { label: 'Copy', action: () => console.log('Copy') },
      { label: 'Paste', action: () => console.log('Paste') }
    ],
    View: [
      { label: 'Toggle Sidebar', action: onToggleSidebar || (() => console.log('Toggle Sidebar')) },
      { label: 'Show Friends', action: onShowFriends || (() => console.log('Show Friends')) },
      { label: 'Show Settings', action: onShowSettings || (() => console.log('Show Settings')) },
      { label: '---' },
      { label: 'Zoom In', action: onZoomIn || (() => console.log('Zoom In')) },
      { label: 'Zoom Out', action: onZoomOut || (() => console.log('Zoom Out')) },
      { label: 'Reset Zoom', action: onResetZoom || (() => console.log('Reset Zoom')) }
    ],
    Window: [
      { label: 'Minimize', action: () => console.log('Minimize') },
      { label: 'Maximize', action: () => console.log('Maximize') },
      { label: '---' },
      { label: 'Always on Top', action: () => console.log('Always on Top') },
      { label: 'Full Screen', action: () => console.log('Full Screen') }
    ]
  };

  return (
    <div style={{
      height: '24px',
      backgroundColor: theme.sidebar,
      borderBottom: `1px solid ${theme.sidebarBorder}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      flexShrink: 0
    }}>
      {Object.entries(menuItems).map(([menuName, items]) => (
        <div key={menuName} style={{ position: 'relative' }}>
          <button
            onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              color: theme.text,
              borderRadius: '2px',
              transition: 'background-color 0.1s'
            }}
            onMouseEnter={() => setActiveMenu(menuName)}
            onMouseLeave={(e) => {
              if (activeMenu !== menuName) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {menuName}
          </button>
          
          {activeMenu === menuName && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                boxShadow: theme.shadow,
                zIndex: 1000,
                minWidth: '150px',
                padding: '4px 0'
              }}
              onMouseLeave={() => setActiveMenu(null)}
            >
              {items.map((item, index) => (
                <div key={index}>
                  {item.label === '---' ? (
                    <div style={{
                      height: '1px',
                      backgroundColor: theme.border,
                      margin: '2px 8px'
                    }} />
                  ) : (
                    <button
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        }
                        setActiveMenu(null);
                      }}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: theme.text,
                        textAlign: 'left',
                        transition: 'background-color 0.1s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuBar; 