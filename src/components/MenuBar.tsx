import React, { useState } from 'react';

const MenuBar: React.FC = () => {
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
      { label: 'Toggle Sidebar', action: () => console.log('Toggle Sidebar') },
      { label: 'Show Friends', action: () => console.log('Show Friends') },
      { label: 'Show Settings', action: () => console.log('Show Settings') },
      { label: '---' },
      { label: 'Zoom In', action: () => console.log('Zoom In') },
      { label: 'Zoom Out', action: () => console.log('Zoom Out') },
      { label: 'Reset Zoom', action: () => console.log('Reset Zoom') }
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
      backgroundColor: '#2d2d2d',
      borderBottom: '1px solid #404040',
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
              color: '#ffffff',
              borderRadius: '2px',
              transition: 'background-color 0.1s'
            }}
            onMouseEnter={() => setActiveMenu(menuName)}
          >
            {menuName}
          </button>
          
          {activeMenu === menuName && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                backgroundColor: '#404040',
                border: '1px solid #555555',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
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
                       backgroundColor: '#555555',
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
                       padding: '4px 12px',
                       textAlign: 'left',
                       cursor: 'pointer',
                       fontSize: '12px',
                       color: '#ffffff',
                       transition: 'background-color 0.1s'
                     }}
                                             onMouseEnter={(e) => {
                         e.currentTarget.style.backgroundColor = '#555555';
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