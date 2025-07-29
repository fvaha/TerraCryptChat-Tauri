import React from 'react';
import { useAppContext } from './AppContext';

interface SettingsScreenProps {
  onBack: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCategoryChange: (category: string) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ isCollapsed, onToggleCollapse, onCategoryChange }) => {
  const { user } = useAppContext();

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
      backgroundColor: "#2d2d2d" 
    }}>
      {/* Header */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid #404040", 
        backgroundColor: "#2d2d2d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px",
          transform: isCollapsed ? 'translateX(0)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out'
        }}>
          <button
            onClick={onToggleCollapse}
            className={`toggle-button ${isCollapsed ? 'slide-in' : 'slide-out'}`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              border: "1px solid #404040",
              backgroundColor: "transparent",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              transition: "all 0.2s ease"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            color: "#ffffff", 
            margin: 0,
            transform: isCollapsed ? 'translateX(0)' : 'translateX(-48px)',
            transition: 'transform 0.3s ease-in-out'
          }}>
            Settings
          </h1>
        </div>
      </div>

      {/* User Profile Section */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid #404040",
        backgroundColor: "#2d2d2d"
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
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff", margin: "0 0 4px 0" }}>
              {user?.name || user?.username || "Unknown User"}
            </h3>
            <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
              {user?.email || "No email"}
            </p>
          </div>
          <button
            onClick={() => onCategoryChange('edit-profile')}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid #404040",
              backgroundColor: "transparent",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              transition: "all 0.2s ease"
            }}
            title="Edit Profile"
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#404040";
              (e.target as HTMLButtonElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.target as HTMLButtonElement).style.color = "#9ca3af";
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
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#2d2d2d" }}>
        {settingsCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            style={{
              width: "100%",
              padding: "12px 24px",
              border: "none",
              backgroundColor: "#404040",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              fontSize: "14px",
              textAlign: "left",
              transition: "all 0.2s ease"
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