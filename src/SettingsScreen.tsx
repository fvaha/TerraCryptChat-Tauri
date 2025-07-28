import React, { useState } from "react";
import { useAppContext } from "./AppContext";

interface SettingsScreenProps {
  onBack: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCategoryChange: (category: string) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, isCollapsed, onToggleCollapse, onCategoryChange }) => {
  const { user } = useAppContext();

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const settingsCategories = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
    { id: 'chats', name: 'Chats', icon: '💬' },
    { id: 'calls', name: 'Calls', icon: '📞' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'privacy', name: 'Privacy', icon: '🔒' },
    { id: 'data', name: 'Data Usage', icon: '📊' },
    { id: 'profile', name: 'Profile', icon: '👤' }
  ];

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
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              fontSize: "16px",
              transition: "all 0.3s ease-in-out",
              transform: isCollapsed ? 'translateX(0)' : 'translateX(-48px)',
              opacity: isCollapsed ? 1 : 0
            }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            ☰
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
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#404040",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px"
            }}
            title="Edit Profile"
          >
            ✏️
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
            <span style={{ fontSize: "18px" }}>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>


    </div>
  );
};

export default SettingsScreen; 