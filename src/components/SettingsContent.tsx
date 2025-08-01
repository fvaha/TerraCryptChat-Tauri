import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { useTheme } from './ThemeContext';
import { ColorScheme } from './ThemeContext';

interface SettingsContentProps {
  selectedCategory: string;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ selectedCategory, zoomLevel, onZoomChange }) => {
  const { user, logout, services } = useAppContext();
  const { isDarkMode, toggleTheme, theme, colorScheme, setColorScheme } = useTheme();
  const [editName, setEditName] = useState(user?.name || "");
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleZoomChange = (newZoom: string) => {
    const zoom = parseFloat(newZoom) / 100;
    onZoomChange(zoom);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      console.log("Profile update:", { name: editName, username: editUsername, email: editEmail });
      
      // Validate input
      if (!editName.trim() || !editUsername.trim() || !editEmail.trim()) {
        alert("Please fill in all fields");
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmail)) {
        alert("Please enter a valid email address");
        return;
      }
      
      // Get current user token
      const token = services.sessionManager.getToken();
      if (!token) {
        alert("No authentication token found. Please log in again.");
        return;
      }
      
      // Call API to update profile
      const response = await services.apiService.updateUser({
        name: editName.trim(),
        username: editUsername.trim(),
        email: editEmail.trim()
      });
      
      console.log("Profile updated successfully:", response);
      alert("Profile updated successfully!");
      
      // Update local user data
      if (user) {
        user.name = editName.trim();
        user.username = editUsername.trim();
        user.email = editEmail.trim();
      }
      
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const colorSchemeOptions: { value: ColorScheme; label: string; color: string }[] = [
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'green', label: 'Green', color: '#10b981' },
    { value: 'purple', label: 'Purple', color: '#8b5cf6' },
    { value: 'orange', label: 'Orange', color: '#f97316' },
    { value: 'red', label: 'Red', color: '#ef4444' },
  ];

  const renderGeneralSettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        General
      </h2>
      
      {/* Account Information */}
      <div>
        <h3 style={{ fontSize: "18px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Account
        </h3>
        <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ color: theme.text, fontSize: "14px" }}>Username</span>
            <span style={{ color: theme.textSecondary, fontSize: "14px" }}>{user?.username || "Not set"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ color: theme.text, fontSize: "14px" }}>Email</span>
            <span style={{ color: theme.textSecondary, fontSize: "14px" }}>{user?.email || "Not set"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: theme.text, fontSize: "14px" }}>Account Status</span>
            <span style={{ color: theme.success, fontSize: "14px" }}>Active</span>
          </div>
        </div>
      </div>

      {/* Application Settings */}
      <div style={{ marginTop: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Application
        </h3>
        <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ color: theme.text, fontSize: "14px" }}>Start with system</span>
            <input type="checkbox" style={{ width: "20px", height: "20px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: theme.text, fontSize: "14px" }}>Minimize to system tray</span>
            <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px" }} />
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div style={{ marginTop: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Permissions
        </h3>
        <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ color: theme.text, fontSize: "14px" }}>Allow access to the microphone</span>
            <input type="checkbox" style={{ width: "20px", height: "20px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: theme.text, fontSize: "14px" }}>Allow access to the camera</span>
            <input type="checkbox" style={{ width: "20px", height: "20px" }} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        Appearance
      </h2>
      
      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px" }}></span>
            <span style={{ color: theme.text, fontSize: "14px" }}>Language</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: theme.textSecondary, fontSize: "12px" }}>System Language</div>
            <select style={{ 
              backgroundColor: theme.inputBackground, 
              color: theme.text, 
              border: `1px solid ${theme.border}`, 
              borderRadius: "4px", 
              padding: "4px 8px",
              fontSize: "14px"
            }}>
              <option>System</option>
              <option>English</option>
              <option>Spanish</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Theme</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: theme.textSecondary, fontSize: "14px" }}>Dark Mode</span>
            <input 
              type="checkbox" 
              checked={isDarkMode}
              onChange={toggleTheme}
              style={{ 
                width: "20px", 
                height: "20px",
                accentColor: theme.primary
              }} 
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Color Scheme</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select 
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
              style={{ 
                backgroundColor: theme.inputBackground, 
                color: theme.text, 
                border: `1px solid ${theme.border}`, 
                borderRadius: "4px", 
                padding: "4px 8px",
                fontSize: "14px"
              }}
            >
              {colorSchemeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div style={{ 
              width: "24px", 
              height: "24px", 
              backgroundColor: colorSchemeOptions.find(opt => opt.value === colorScheme)?.color || theme.primary, 
              borderRadius: "50%",
              border: `2px solid ${theme.border}`
            }}></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Zoom level</span>
          <select 
            style={{ 
              backgroundColor: theme.inputBackground, 
              color: theme.text, 
              border: `1px solid ${theme.border}`, 
              borderRadius: "4px", 
              padding: "4px 8px",
              fontSize: "14px"
            }}
            onChange={(e) => handleZoomChange(e.target.value)}
            value={Math.round(zoomLevel * 100)}
          >
            <option value="100">100%</option>
            <option value="125">125%</option>
            <option value="150">150%</option>
            <option value="175">175%</option>
            <option value="200">200%</option>
          </select>
        </div>
      </div>

      {/* Color Scheme Preview */}
      <div style={{ marginTop: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Color Scheme Preview
        </h3>
        <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {colorSchemeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setColorScheme(option.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `2px solid ${colorScheme === option.value ? option.color : theme.border}`,
                  backgroundColor: colorScheme === option.value ? option.color + '20' : 'transparent',
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  minWidth: "80px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = option.color + '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colorScheme === option.value ? option.color + '20' : 'transparent';
                }}
              >
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  backgroundColor: option.color, 
                  borderRadius: "50%",
                  border: `2px solid ${theme.border}`
                }}></div>
                <span style={{ 
                  color: theme.text, 
                  fontSize: "12px", 
                  fontWeight: colorScheme === option.value ? "600" : "400"
                }}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderChatsSettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        Chats
      </h2>
      
      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Chats
        </h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Spell check text entered in message composition box</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Show text formatting popover when text is selected</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Generate link previews</span>
          <input type="checkbox" style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        <p style={{ color: theme.textSecondary, fontSize: "12px", margin: "8px 0 0 0" }}>
          
        </p>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Convert typed emoticons to emoji</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        <p style={{ color: theme.textSecondary, fontSize: "12px", margin: "8px 0 0 0" }}>
          For example, :-) will be converted to 
        </p>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Emoji skin tone
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          {['', '', '', '', '', ''].map((emoji, index) => (
            <div key={index} style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: index === 0 ? theme.hover : "transparent",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
              {emoji}
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Import contacts
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: theme.text, fontSize: "14px", margin: "0 0 4px 0" }}>
              Import all Signal groups and contacts from your mobile device.
            </p>
            <p style={{ color: theme.textSecondary, fontSize: "12px", margin: 0 }}>
              Last import at 7/28/2025 2:05:48 PM
            </p>
          </div>
          <button style={{
            backgroundColor: theme.inputBackground,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: "4px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer"
          }}>
            Import now
          </button>
        </div>
      </div>
    </div>
  );

  const renderCallsSettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        Calls
      </h2>
      
      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Calling
        </h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Enable incoming calls</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Play calling sounds</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Devices
        </h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Video</span>
          <select style={{ 
            backgroundColor: theme.inputBackground, 
            color: theme.text, 
            border: `1px solid ${theme.border}`, 
            borderRadius: "4px", 
            padding: "4px 8px",
            fontSize: "14px"
          }}>
            <option>No devices available</option>
          </select>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Microphone</span>
          <select style={{ 
            backgroundColor: theme.inputBackground, 
            color: theme.text, 
            border: `1px solid ${theme.border}`, 
            borderRadius: "4px", 
            padding: "4px 8px",
            fontSize: "14px"
          }}>
            <option>No devices available</option>
          </select>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Speakers</span>
          <select style={{ 
            backgroundColor: theme.inputBackground, 
            color: theme.text, 
            border: `1px solid ${theme.border}`, 
            borderRadius: "4px", 
            padding: "4px 8px",
            fontSize: "14px"
          }}>
            <option>Communication - Speakers (Realtek High Definition Audio)</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Advanced
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Always relay calls</span>
          <input type="checkbox" style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
      </div>
    </div>
  );

  const renderNotificationsSettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        Notifications
      </h2>
      
      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Enable notifications</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Show notifications for calls</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Draw attention to this window when a notification arrives</span>
          <input type="checkbox" style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Include muted chats in badge count</span>
          <input type="checkbox" style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Notification content</span>
          <select style={{ 
            backgroundColor: theme.inputBackground, 
            color: theme.text, 
            border: `1px solid ${theme.border}`, 
            borderRadius: "4px", 
            padding: "4px 8px",
            fontSize: "14px"
          }}>
            <option>Name, content, and actions</option>
            <option>Name only</option>
            <option>No name or message</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Notification Sounds
        </h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Push notification sounds</span>
          <input type="checkbox" style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>In-chat message sounds</span>
          <input type="checkbox" style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        <p style={{ color: theme.textSecondary, fontSize: "12px", margin: "8px 0 0 0" }}>
          Hear a notification sound for sent and received messages while in the chat.
        </p>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        Privacy
      </h2>
      
      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Blocked</span>
          <span style={{ color: theme.textSecondary, fontSize: "14px" }}>0 contacts</span>
        </div>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Messaging
        </h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Read receipts</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Typing indicators</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        <p style={{ color: theme.textSecondary, fontSize: "12px", margin: "8px 0 0 0" }}>
          To change these settings, open the Signal app on your mobile device and navigate to Settings {'>'} Privacy
        </p>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Disappearing messages
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: theme.text, fontSize: "14px", margin: "0 0 4px 0" }}>
              Default timer for new chats
            </p>
            <p style={{ color: theme.textSecondary, fontSize: "12px", margin: 0 }}>
              Set a default disappearing message timer for all new chats started by you.
            </p>
          </div>
          <select style={{ 
            backgroundColor: theme.inputBackground, 
            color: theme.text, 
            border: `1px solid ${theme.border}`, 
            borderRadius: "4px", 
            padding: "4px 8px",
            fontSize: "14px"
          }}>
            <option>Off</option>
            <option>30 seconds</option>
            <option>1 hour</option>
            <option>1 day</option>
            <option>1 week</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderDataUsageSettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        Data usage
      </h2>
      
      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Media auto-download
        </h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Photos</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Videos</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Audio</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: theme.text, fontSize: "14px" }}>Documents</span>
          <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: theme.primary }} />
        </div>
        <p style={{ color: theme.textSecondary, fontSize: "12px", margin: "8px 0 0 0" }}>
          Voice messages and stickers are always auto-downloaded.
        </p>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: theme.text, margin: "0 0 16px 0" }}>
          Sent media quality
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: theme.text, fontSize: "14px", margin: "0 0 4px 0" }}>
              Sending high quality media will use more data.
            </p>
          </div>
          <select style={{ 
            backgroundColor: theme.inputBackground, 
            color: theme.text, 
            border: `1px solid ${theme.border}`, 
            borderRadius: "4px", 
            padding: "4px 8px",
            fontSize: "14px"
          }}>
            <option>Standard</option>
            <option>High</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderProfileSettings = () => (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "600", color: theme.text, margin: "0 0 24px 0" }}>
        Profile
      </h2>
      
      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
            fontSize: "32px",
            margin: "0 auto 16px"
          }}>
            {user ? getUserInitials(user.name || user.username) : "U"}
          </div>
          <button style={{
            backgroundColor: theme.inputBackground,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer"
          }}>
            Edit photo
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "18px" }}></span>
          <span style={{ color: theme.text, fontSize: "16px", fontWeight: "500" }}>
            {user?.name || user?.username || "Unknown User"}
          </span>
        </div>

        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "18px" }}></span>
            <span style={{ color: theme.text, fontSize: "14px" }}>About</span>
          </div>
          <p style={{ color: theme.textSecondary, fontSize: "12px", margin: "0 0 16px 0" }}>
            Your profile and changes to it will be visible to people you message, contacts and groups.
          </p>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px" }}>@</span>
            <span style={{ color: theme.text, fontSize: "14px" }}>Username</span>
          </div>
          <p style={{ color: theme.textSecondary, fontSize: "12px", margin: "8px 0 0 0" }}>
            People can now message you using your optional username so you don't have to give out your phone number.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: theme.surface, borderRadius: "8px", padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "transparent",
              color: "#dc2626",
              border: "1px solid #dc2626",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#dc2626";
            }}
          >
            Logout
          </button>
          
          <button
            onClick={() => console.log("Delete user - TODO")}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "transparent",
              color: "#dc2626",
              border: "1px solid #dc2626",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#dc2626";
            }}
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );

  const renderEditProfile = () => (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100%",
      padding: "24px"
    }}>
      <div style={{
        backgroundColor: theme.surface,
        borderRadius: "12px",
        padding: "32px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Profile Photo Section */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
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
            fontSize: "32px",
            margin: "0 auto 16px"
          }}>
            {user ? getUserInitials(user.name || user.username) : "U"}
          </div>
          <button style={{
            padding: "8px 16px",
            backgroundColor: theme.primary,
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer"
          }}>
            Change Photo
          </button>
        </div>

        {/* Form Fields */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: theme.text, fontSize: "14px" }}>
            Name
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Enter your name"
            style={{
              width: "100%",
              padding: "12px",
              border: `1px solid ${theme.border}`,
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: theme.inputBackground,
              color: theme.text
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: theme.text, fontSize: "14px" }}>
            Username
          </label>
          <input
            type="text"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: `1px solid ${theme.border}`,
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: theme.inputBackground,
              color: theme.text
            }}
          />
        </div>

        <div style={{ marginBottom: "32px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: theme.text, fontSize: "14px" }}>
            Email
          </label>
          <input
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: `1px solid ${theme.border}`,
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: theme.inputBackground,
              color: theme.text
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => {/* TODO: Handle cancel */}}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: theme.textSecondary,
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
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
              padding: "12px",
              backgroundColor: theme.primary,
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'general':
        return renderGeneralSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'chats':
        return renderChatsSettings();
      case 'calls':
        return renderCallsSettings();
      case 'notifications':
        return renderNotificationsSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'data':
        return renderDataUsageSettings();
      case 'profile':
        return renderProfileSettings();
      case 'edit-profile':
        return renderEditProfile();
      default:
        return (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: theme.text,
            fontSize: "16px"
          }}>
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} settings coming soon...
          </div>
        );
    }
  };

  return (
    <div style={{ 
      flex: 1, 
      backgroundColor: theme.background, 
      overflow: "auto"
    }}>
      {renderCategoryContent()}
    </div>
  );
};

export default SettingsContent; 