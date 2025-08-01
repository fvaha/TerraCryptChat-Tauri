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
  showFriendRequestsButton?: boolean;
  onFriendRequestsClick?: () => void;
  friendRequestsCount?: number;
  showSearchButton?: boolean;
  onSearchClick?: () => void;
  isSearchActive?: boolean;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onToggleSidebar,
  sidebarCollapsed = false,

  onAddClick,
  showSearchBar = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showFriendRequestsButton = false,
  onFriendRequestsClick,
  friendRequestsCount = 0,
  showSearchButton = false,
  onSearchClick,
  isSearchActive = false
}) => {
  const { theme } = useTheme();

  return (
    <>
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.sidebar,
        transition: "all 0.3s ease",
        height: "56px",
        display: "flex",
        alignItems: "flex-start",
        paddingTop: "4px"
      }}>
        {/* Main Header Row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%"
        }}>
                   {/* Left side with hamburger menu and title */}
           <div style={{
             display: "flex",
             alignItems: "flex-start",
             gap: "12px"
           }}>
             {/* Hamburger Menu Button - Always present but with smooth transitions */}
             <div style={{
               width: sidebarCollapsed ? "48px" : "0px",
               height: "48px",
               display: "flex",
               alignItems: "flex-start",
               justifyContent: "center",
               position: "relative",
               overflow: "hidden",
               transition: "width 0.3s ease",
               marginTop: "0px"
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
                     animation: "fadeInSlide 0.3s ease",
                     marginTop: "0px"
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
                     <path d="M3 6h18"/>
                     <path d="M3 12h18"/>
                     <path d="M3 18h18"/>
                   </svg>
                 </button>
               )}
             </div>
             
                         <h2 style={{
                           fontSize: "16px",
                           fontWeight: "600",
                           color: theme.text,
                           margin: 0,
                           marginTop: "14px",
                           transition: "all 0.3s ease",
                           transform: sidebarCollapsed ? "translateX(0)" : "translateX(-12px)",
                           opacity: sidebarCollapsed ? 1 : 1,
                           lineHeight: "1.2"
                         }}>
                           {title}
                         </h2>
           </div>

           {/* Right side with buttons */}
           <div style={{
             display: "flex",
             alignItems: "center",
             gap: "16px",
             marginTop: "8px" // Adjusted to align with hamburger
           }}>
             {/* Search Button */}
             {showSearchButton && (
               <button
                 onClick={onSearchClick}
                 style={{
                   width: "20px",
                   height: "20px",
                   border: "none",
                   backgroundColor: "transparent",
                   color: isSearchActive ? theme.primary : theme.textSecondary,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   cursor: "pointer",
                   fontSize: "16px",
                   transition: "all 0.2s ease",
                   padding: 0
                 }}
                 title="Search"
                 onMouseEnter={(e) => {
                   e.currentTarget.style.color = theme.text;
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.color = isSearchActive ? theme.primary : theme.textSecondary;
                 }}
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <circle cx="11" cy="11" r="8"/>
                   <path d="m21 21-4.35-4.35"/>
                 </svg>
               </button>
             )}

             {/* Friend Requests Button */}
             {showFriendRequestsButton && (
               <button
                 onClick={onFriendRequestsClick}
                 style={{
                   width: "20px",
                   height: "20px",
                   border: "none",
                   backgroundColor: "transparent",
                   color: theme.textSecondary,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   cursor: "pointer",
                   fontSize: "16px",
                   transition: "all 0.2s ease",
                   position: "relative",
                   padding: 0
                 }}
                 title="Friend Requests"
                 onMouseEnter={(e) => {
                   e.currentTarget.style.color = theme.text;
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.color = theme.textSecondary;
                 }}
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                   <circle cx="9" cy="7" r="4"/>
                   <path d="m22 21-2-2"/>
                   <path d="M16 16h6"/>
                 </svg>
                 {friendRequestsCount > 0 && (
                   <div style={{
                     position: "absolute",
                     top: "-4px",
                     right: "-4px",
                     backgroundColor: theme.error,
                     color: "white",
                     borderRadius: "50%",
                     width: "16px",
                     height: "16px",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     fontSize: "10px",
                     fontWeight: "bold",
                     border: `2px solid ${theme.sidebar}`
                   }}>
                     {friendRequestsCount > 99 ? "99+" : friendRequestsCount}
                   </div>
                 )}
               </button>
             )}

             {/* Add Button */}
             {onAddClick && (
               <button
                 onClick={onAddClick}
                 style={{
                   width: "20px",
                   height: "20px",
                   border: "none",
                   backgroundColor: "transparent",
                   color: theme.textSecondary,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   cursor: "pointer",
                   fontSize: "16px",
                   transition: "all 0.2s ease",
                   padding: 0
                 }}
                 title="Add"
                 onMouseEnter={(e) => {
                   e.currentTarget.style.color = theme.text;
                 }}
                 onMouseLeave={(e) => {
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
         </div>
       </div>

       {/* Search Bar - Slides down from below header */}
       {showSearchBar && isSearchActive && (
         <div style={{
           padding: "12px 16px",
           backgroundColor: theme.sidebar,
           borderBottom: `1px solid ${theme.border}`,
           animation: "slideDown 0.3s ease"
         }}>
           <input
             type="text"
             placeholder={searchPlaceholder}
             value={searchQuery}
             onChange={(e) => onSearchChange(e.target.value)}
             style={{
               width: "100%",
               padding: "6px 10px",
               borderRadius: "16px",
               border: `1px solid ${theme.border}`,
               backgroundColor: theme.background,
               color: theme.text,
               fontSize: "13px",
               outline: "none",
               transition: "all 0.3s ease"
             }}
             onFocus={(e) => {
               e.target.style.borderColor = theme.primary;
             }}
             onBlur={(e) => {
               e.target.style.borderColor = theme.border;
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
         
         @keyframes slideUp {
           from {
             opacity: 1;
             transform: translateY(0);
           }
           to {
             opacity: 0;
             transform: translateY(-10px);
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
    </>
  );
};

export default ScreenHeader; 