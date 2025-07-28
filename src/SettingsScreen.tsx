import React, { useState } from "react";
import { useAppContext } from "./AppContext";
import { useTheme } from "./ThemeContext";
import { useThemedStyles } from "./useThemedStyles";

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { user, token, logout } = useAppContext();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [useRustSdkEncryption, setUseRustSdkEncryption] = useState(false);
  
  // Edit profile form state
  const [editName, setEditName] = useState(user?.name || "");
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");

  const handleSaveProfile = async () => {
    if (!user || !token) return;

    try {
      setIsLoading(true);
      
      // Update user profile via API (placeholder - implement when backend supports it)
      console.log("Profile update:", { name: editName, username: editUsername, email: editEmail });
      
      // For now, just update local user data
      const updatedUser = {
        ...user!,
        name: editName,
        username: editUsername,
        email: editEmail
      };

      if (updatedUser) {
        // TODO: Update user in context
        console.log("Profile updated:", updatedUser);
        setShowEditProfile(false);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const styles = useThemedStyles();

  if (showEditProfile) {
    return (
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        backgroundColor: "#f8fafc" 
      }}>
        {/* Header */}
        <div style={{ 
          padding: "16px 24px", 
          borderBottom: "1px solid #e5e7eb", 
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <button
            onClick={() => setShowEditProfile(false)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px"
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111827", margin: 0 }}>
            Edit Profile
          </h1>
        </div>

        {/* Edit Form */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          <div style={{
            maxWidth: "480px",
            margin: "0 auto",
            padding: "2rem 1rem",
            borderRadius: "16px",
            ...styles.surface,
            border: `1px solid ${styles.theme.border}`,
            boxSizing: "border-box"
          }}>
            {/* Avatar */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{
                width: "120px",
                height: "120px",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "600",
                fontSize: "32px",
                margin: "0 auto 16px"
              }}>
                {getUserInitials(editName || editUsername || "U")}
              </div>
              <button style={{
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "14px",
                cursor: "pointer"
              }}>
                Change Photo
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500", 
                  color: "#374151", 
                  marginBottom: "8px" 
                }}>
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500", 
                  color: "#374151", 
                  marginBottom: "8px" 
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500", 
                  color: "#374151", 
                  marginBottom: "8px" 
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Save Button */}
            <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowEditProfile(false)}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  backgroundColor: "white",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isLoading ? "default" : "pointer",
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: "#f8fafc" 
    }}>
      {/* Header */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid #e5e7eb", 
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <button
          onClick={onBack}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "18px"
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111827", margin: 0 }}>
          Settings
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Profile Section */}
        <div style={{ backgroundColor: "white", padding: "24px", borderBottom: "8px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "600",
              fontSize: "24px"
            }}>
              {user ? getUserInitials(user.name || user.username) : "U"}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: "0 0 4px 0" }}>
                {user?.name || user?.username || "Unknown User"}
              </h2>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px 0" }}>
                {user?.email || "No email"}
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                {user?.verified ? "✓ Verified" : "⚠ Not verified"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEditProfile(true)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              backgroundColor: "white",
              color: "#374151",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            Edit Profile
          </button>
        </div>

        {/* Settings List */}
        <div style={{ backgroundColor: "white" }}>
          {/* Account Settings */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0" }}>
              Account
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "12px 0"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🔒</span>
                  <span style={{ fontSize: "14px", color: "#374151" }}>Privacy & Security</span>
                </div>
                <span style={{ fontSize: "16px", color: "#9ca3af" }}>›</span>
              </div>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "12px 0"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🔔</span>
                  <span style={{ fontSize: "14px", color: "#374151" }}>Notifications</span>
                </div>
                <span style={{ fontSize: "16px", color: "#9ca3af" }}>›</span>
              </div>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "12px 0"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>💾</span>
                  <span style={{ fontSize: "14px", color: "#374151" }}>Storage and Data</span>
                </div>
                <span style={{ fontSize: "16px", color: "#9ca3af" }}>›</span>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0" }}>
              Appearance
            </h3>
            
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              padding: "12px 0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>🌙</span>
                <span style={{ fontSize: "14px", color: "#374151" }}>Dark Mode</span>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={toggleTheme}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: isDarkMode ? "#3b82f6" : "#d1d5db",
                  borderRadius: "24px",
                  transition: "0.3s"
                }}>
                  <span style={{
                    position: "absolute",
                    content: '""',
                    height: "18px",
                    width: "18px",
                    left: isDarkMode ? "23px" : "3px",
                    bottom: "3px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: "0.3s"
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Security */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0" }}>
              Security
            </h3>
            
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              padding: "12px 0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>🔐</span>
                <div>
                  <div style={{ fontSize: "14px", color: "#374151" }}>Advanced Encryption</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>Use Rust SDK encryption</div>
                </div>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
                <input
                  type="checkbox"
                  checked={useRustSdkEncryption}
                  onChange={(e) => setUseRustSdkEncryption(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: useRustSdkEncryption ? "#3b82f6" : "#d1d5db",
                  borderRadius: "24px",
                  transition: "0.3s"
                }}>
                  <span style={{
                    position: "absolute",
                    content: '""',
                    height: "18px",
                    width: "18px",
                    left: useRustSdkEncryption ? "23px" : "3px",
                    bottom: "3px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: "0.3s"
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Support & About */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0" }}>
              Support & About
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "12px 0"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>❓</span>
                  <span style={{ fontSize: "14px", color: "#374151" }}>Help Center</span>
                </div>
                <span style={{ fontSize: "16px", color: "#9ca3af" }}>›</span>
              </div>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "12px 0"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>ℹ️</span>
                  <span style={{ fontSize: "14px", color: "#374151" }}>About Terracrypt Chat</span>
                </div>
                <span style={{ fontSize: "16px", color: "#9ca3af" }}>›</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div style={{ padding: "24px" }}>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#dc2626",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                cursor: isLoading ? "default" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {isLoading ? (
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
              ) : (
                <>
                  <span style={{ fontSize: "16px" }}>🚪</span>
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen; 