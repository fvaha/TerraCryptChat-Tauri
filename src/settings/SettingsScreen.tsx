// SECOND WINDOW: SettingsScreen component - displays settings categories in the second window
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { useTheme } from '../components/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

interface SettingsScreenProps {
  onBack: () => void;
  onCategoryChange: (category: string) => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onCategoryChange, onToggleSidebar, sidebarCollapsed }) => {
  const { user } = useAppContext();
  const { theme } = useTheme();

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const settingsCategories = [
    { id: 'general', name: 'General', icon: 'settings' },
    { id: 'appearance', name: 'Appearance', icon: 'palette' },
    { id: 'chats', name: 'Chats', icon: 'message-circle' },
    { id: 'calls', name: 'Calls', icon: 'phone' },
    { id: 'notifications', name: 'Notifications', icon: 'bell' },
    { id: 'privacy', name: 'Privacy', icon: 'lock' },
    { id: 'data', name: 'Data Usage', icon: 'bar-chart' },
    { id: 'profile', name: 'Profile', icon: 'user' }
  ];

  const getIconSvg = (iconName: string) => {
    const icons: { [key: string]: string } = {
      settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
      palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
      'message-circle': '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
      phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
      bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="16" r="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      'bar-chart': '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-6"/>',
      user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
    };
    return icons[iconName] || icons.user;
  };

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: theme.background 
    }}>
             <ScreenHeader
         title="Settings"
         onToggleSidebar={onToggleSidebar}
         sidebarCollapsed={sidebarCollapsed}
       />

      {/* User Profile Section */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.sidebar
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "600",
            fontSize: "18px"
          }}>
            {user ? getUserInitials(user.name || user.username) : "U"}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 4px 0" }}>
              {user?.name || user?.username || "Unknown User"}
            </h3>
            <p style={{ fontSize: "14px", color: theme.textSecondary, margin: 0 }}>
              {user?.email || "No email"}
            </p>
          </div>
          <button
            onClick={() => onCategoryChange('edit-profile')}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: `1px solid ${theme.border}`,
              backgroundColor: "transparent",
              color: theme.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              transition: "all 0.2s ease"
            }}
            title="Edit Profile"
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = theme.hover;
              (e.target as HTMLButtonElement).style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.target as HTMLButtonElement).style.color = theme.textSecondary;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Categories */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: theme.background }}>
        {settingsCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            style={{
              width: "100%",
              padding: "12px 24px",
              border: "none",
              backgroundColor: theme.surface,
              color: theme.text,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              fontSize: "14px",
              textAlign: "left",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.surface;
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                 dangerouslySetInnerHTML={{ __html: getIconSvg(category.icon) }} />
            <span>{category.name}</span>
          </button>
        ))}
      </div>


    </div>
  );
};

export default SettingsScreen; 