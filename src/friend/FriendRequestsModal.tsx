import React from 'react';
import { useTheme } from '../components/ThemeContext';
import { useThemedStyles } from '../components/useThemedStyles';

export interface FriendRequest {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: {
    user_id: string;
    username: string;
    name?: string;
    email?: string;
    picture?: string;
  };
}

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: FriendRequest[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  isLoading?: boolean;
}

const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onAccept,
  onDecline,
  isLoading = false
}) => {
  const { theme } = useTheme();
  const themedStyles = useThemedStyles();
  const getUserInitials = (name: string, username: string) => {
    const displayName = name || username;
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.surface,
        borderRadius: "12px",
        width: "90%",
        maxWidth: "500px",
        maxHeight: "80vh",
        overflow: "hidden",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: theme.text,
            margin: 0
          }}>
            Friend Requests ({requests.length})
          </h2>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: theme.hover,
              color: theme.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px"
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          maxHeight: "60vh",
          overflowY: "auto",
          ...themedStyles.scrollbar
        }}>
          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div style={{
                display: "inline-block",
                width: "32px",
                height: "32px",
                border: `2px solid ${theme.border}`,
                borderTop: `2px solid ${theme.primary}`,
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "16px"
              }}></div>
              <p style={{ color: theme.textSecondary }}>Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div style={{
              padding: "40px",
              textAlign: "center"
            }}>
              <div style={{
                width: "64px",
                height: "64px",
                backgroundColor: theme.hover,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}>
                <span style={{ fontSize: "24px" }}></span>
              </div>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "500",
                color: theme.text,
                margin: "0 0 8px 0"
              }}>
                No pending requests
              </h3>
              <p style={{ color: theme.textSecondary, margin: 0 }}>
                You're all caught up!
              </p>
            </div>
          ) : (
            <div style={{ padding: "16px" }}>
              {requests.map((request) => (
                <div
                  key={request.request_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "16px",
                    borderRadius: "8px",
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surface,
                    marginBottom: "12px"
                  }}
                >
                  <div style={{
                    width: "48px",
                    height: "48px",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "500",
                    fontSize: "14px",
                    marginRight: "16px"
                  }}>
                    {getUserInitials("", request.sender?.username || "U")}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: "16px",
                      fontWeight: "500",
                      color: theme.text,
                      margin: "0 0 4px 0"
                    }}>
                      {request.sender?.username || "Unknown"}
                    </h3>
                    <p style={{
                      fontSize: "14px",
                      color: theme.textSecondary,
                      margin: "0 0 4px 0"
                    }}>
                      @{request.sender?.username}
                    </p>
                    <p style={{
                      fontSize: "12px",
                      color: theme.textSecondary,
                      margin: 0
                    }}>
                      Wants to be your friend
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      onClick={() => onAccept(request.request_id)}
                      style={{
                        padding: "8px 16px",
                        border: "none",
                        borderRadius: "6px",
                        backgroundColor: "#10b981",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        minWidth: "80px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onDecline(request.request_id)}
                      style={{
                        padding: "8px 16px",
                        border: `1px solid ${theme.border}`,
                        borderRadius: "6px",
                        backgroundColor: theme.surface,
                        color: theme.textSecondary,
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        minWidth: "80px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsModal; 
