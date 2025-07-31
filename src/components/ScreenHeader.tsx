import React from 'react';
import { useTheme } from './ThemeContext';

interface ScreenHeaderProps {
  title: string;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
  showSearchBar?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  addButtonTitle?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onToggleSidebar,
  sidebarCollapsed = false,
  showAddButton = false,
  onAddClick,
  showSearchBar = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  addButtonTitle = 'Add'
}) => {
  const { theme } = useTheme();

  return (
    <div style={{
      padding: "16px",
      borderBottom: `1px solid ${theme.border}`,
      backgroundColor: theme.sidebar,
      transition: "all 0.3s ease"
    }}>
      {/* Main Header Row */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: showSearchBar ? "12px" : "0"
      }}>
                 {/* Left side with hamburger menu and title */}
         <div style={{
           display: "flex",
           alignItems: "center",
           gap: "12px"
         }}>
           {/* Hamburger Menu Button - Always present but with smooth transitions */}
           <div style={{
             width: sidebarCollapsed ? "48px" : "0px",
             height: "48px",
             display: "flex",
             alignItems: "center",
             justifyContent: "center",
             position: "relative",
             overflow: "hidden",
             transition: "width 0.3s ease"
           }}>
             {sidebarCollapsed && onToggleSidebar && (
               <button
                 onClick={onToggleSidebar}
                 style={{
                   width: "48px",
                   height: "48px",
                   borderRadius: "12px",
                   border: "none",
                   backgroundColor: "transparent",
                   color: theme.textSecondary,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   cursor: "pointer",
                   fontSize: "20px",
                   transition: "all 0.3s ease",
                   animation: "fadeInSlide 0.3s ease"
                 }}
                 title="Toggle sidebar"
                 onMouseEnter={(e) => {
                   e.currentTarget.style.backgroundColor = theme.hover;
                   e.currentTarget.style.color = theme.text;
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.backgroundColor = "transparent";
                   e.currentTarget.style.color = theme.textSecondary;
                 }}
               >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <line x1="3" y1="6" x2="21" y2="6"/>
                   <line x1="3" y1="12" x2="21" y2="12"/>
                   <line x1="3" y1="18" x2="21" y2="18"/>
                 </svg>
               </button>
             )}
           </div>
           
                       <h2 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: theme.text,
              margin: 0,
              transition: "all 0.3s ease",
              transform: sidebarCollapsed ? "translateX(0)" : "translateX(-12px)",
              opacity: sidebarCollapsed ? 1 : 1
            }}>
              {title}
            </h2>
         </div>

        {/* Right side with add button */}
        {showAddButton && onAddClick && (
          <button
            onClick={onAddClick}
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
            title={addButtonTitle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.hover;
              e.currentTarget.style.borderColor = theme.primary;
              e.currentTarget.style.color = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.color = theme.textSecondary;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Search Bar */}
      {showSearchBar && onSearchChange && (
        <div style={{ 
          marginTop: "12px",
          animation: "slideDown 0.3s ease"
        }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              fontSize: "14px",
              transition: "all 0.2s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = theme.primary;
              e.target.style.boxShadow = `0 0 0 2px ${theme.primary}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.border;
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeOutSlide {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default ScreenHeader; 