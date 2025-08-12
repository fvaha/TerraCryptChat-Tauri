import React from "react";
import { useTheme } from "./ThemeContext";

interface UserInitialsAvatarProps {
  username: string;
  name?: string;
  size?: "small" | "medium" | "large";
  className?: string;
  style?: React.CSSProperties;
}

const UserInitialsAvatar: React.FC<UserInitialsAvatarProps> = ({ 
  username, 
  name, 
  size = "medium", 
  className = "", 
  style = {} 
}) => {
  const { isDarkMode } = useTheme();

  const getInitials = (username: string, name?: string): string => {
    const displayName = name || username;
    const cleaned = displayName.trim()
      .replace(/[^A-Za-z\s]/g, "") // Keep only letters and spaces
      .toUpperCase();
    
    const words = cleaned.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    } else if (words.length === 1) {
      return words[0].slice(0, 2);
    } else {
      return username.slice(0, 2).toUpperCase();
    }
  };

  const getAvatarColor = (username: string): string => {
    const darkShades = [
      "#1C1C1C", "#2C2C2C", "#3C3C3C", "#4C4C4C", "#5C5C5C"
    ];
    
    const lightShades = [
      "#E3F2FD", "#FFF9C4", "#FFE0B2", "#DCEDC8", "#D1C4E9"
    ];
    
    const shades = isDarkMode ? darkShades : lightShades;
    const hash = Math.abs(username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    const index = hash % shades.length;
    return shades[index];
  };

  const getSizeStyles = (size: "small" | "medium" | "large") => {
    switch (size) {
      case "small":
        return {
          width: "32px",
          height: "32px",
          fontSize: "12px",
          borderRadius: "6px"
        };
      case "large":
        return {
          width: "64px",
          height: "64px",
          fontSize: "20px",
          borderRadius: "12px"
        };
      default: // medium
        return {
          width: "48px",
          height: "48px",
          fontSize: "16px",
          borderRadius: "10px"
        };
    }
  };

  const initials = getInitials(username, name);
  const backgroundColor = getAvatarColor(username);
  const sizeStyles = getSizeStyles(size);

  return (
    <div
      className={className}
      style={{
        ...sizeStyles,
        backgroundColor,
        color: isDarkMode ? "#FFFFFF" : "#1F2937",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "600",
        userSelect: "none",
        flexShrink: 0,
        ...style
      }}
    >
      {initials}
    </div>
  );
};

export default UserInitialsAvatar; 
