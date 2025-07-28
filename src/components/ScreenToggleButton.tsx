import React from 'react';

interface ScreenToggleButtonProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ScreenToggleButton: React.FC<ScreenToggleButtonProps> = ({ isCollapsed, onToggleCollapse }) => {
  if (!isCollapsed) {
    return null; // Don't show when sidebar is expanded
  }

  return (
    <button
      onClick={onToggleCollapse}
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
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
        zIndex: 20
      }}
      title="Expand sidebar"
    >
      ☰
    </button>
  );
};

export default ScreenToggleButton; 