import React, { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";
import { MessageEntity } from "./models";
import * as messageService from "./messageService";
import UserInitialsAvatar from "./UserInitialsAvatar";
import { useThemedStyles } from "./useThemedStyles";
import { nativeApiService } from "./nativeApiService";
import ChatScreen from "./ChatScreen";

interface ChatViewProps {
  chatId: string;
  onBack?: () => void;
}

interface ChatData {
  chat_id: string;
  chat_name?: string;
  chat_type?: string;
  is_group: boolean;
  created_at: string;
  creator_id?: string;
  admin_id?: string;
  unread_count?: number;
  description?: string;
  group_name?: string;
  last_message_content?: string;
  last_message_timestamp?: number;
  participants?: string;
}

interface ChatMember {
  user: {
    user_id: string;
    username: string;
    name: string;
    email: string;
  };
  is_admin: boolean;
  joined_at: string;
}



const ChatView: React.FC<ChatViewProps> = ({ chatId, onBack }) => {
  const { token, user, services, websocketStatus } = useAppContext();
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
  const [messages, setMessages] = useState<MessageEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles();

  // Load chat data and members when chatId changes
  useEffect(() => {
    const loadChatData = async () => {
      if (!chatId || !token) return;

      try {
        setIsLoading(true);
        setError(null);
        console.log("📂 Loading chat data for:", chatId);

        // Load chat members from native API
        nativeApiService.setToken(token);
        const membersData = await nativeApiService.getChatMembers(chatId);
        console.log("✅ Chat members loaded:", membersData);
        
        // Validate members data
        const validMembers = membersData.data?.filter(member => 
          member && member.user && member.user.user_id
        ) || [];
        
        setChatMembers(validMembers);

        // Create chat data based on members
        const otherMember = validMembers.find(member => member.user.user_id !== user?.userId);
        const isGroup = validMembers.length > 2;
        
        const chatName = isGroup 
          ? `Group Chat (${validMembers.length} members)`
          : (otherMember?.user.name || otherMember?.user.username || "Unknown");

        setChatData({
          chat_id: chatId,
          chat_name: chatName,
          chat_type: isGroup ? "group" : "direct",
          is_group: isGroup,
          created_at: new Date().toISOString(),
          creator_id: user?.userId || ""
        });

        // Load messages with error handling
        try {
          const chatMessages = await messageService.fetchMessages(chatId);
          setMessages(chatMessages || []);
        } catch (messageError) {
          console.error("❌ Failed to load messages:", messageError);
          setMessages([]);
          // Don't throw here, just show empty messages
        }

      } catch (err) {
        console.error("❌ Failed to load chat data:", err);
        setError(err instanceof Error ? err.message : "Failed to load chat data");
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [chatId, token, user?.userId]);

  // Listen for new messages from WebSocket
  useEffect(() => {
    const handleNewMessage = (message: MessageEntity) => {
      if (message.chatId === chatId) {
        setMessages(prev => [...prev, message]);
      }
    };

    services.websocketService.on("chat-message", handleNewMessage);

    return () => {
      services.websocketService.off("chat-message", handleNewMessage);
    };
  }, [chatId, services.websocketService]);

  const handleMessageSent = (message: MessageEntity) => {
    // Add message to local state
    setMessages(prev => [...prev, message]);
  };





  if (isLoading) {
    return (
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        backgroundColor: styles.theme.background
      }}>
        {/* Loading header */}
        <div style={{ 
          padding: "16px 24px", 
          borderBottom: `1px solid ${styles.theme.border}`, 
          backgroundColor: styles.theme.surface
        }}>
          <div style={{ 
            height: "20px", 
            backgroundColor: styles.theme.border, 
            borderRadius: "4px", 
            width: "200px" 
          }}></div>
        </div>
        
        {/* Loading messages */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              display: "inline-block",
              width: "32px",
              height: "32px",
              border: `2px solid ${styles.theme.border}`,
              borderTop: `2px solid ${styles.theme.primary}`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px"
            }}></div>
            <p style={{ color: styles.theme.textSecondary }}>Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        flex: 1, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        backgroundColor: styles.theme.background
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "24px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            backgroundColor: styles.theme.errorBackground,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <span style={{ color: styles.theme.error, fontSize: "24px" }}>⚠</span>
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: styles.theme.text }}>
            Failed to load chat data
          </h3>
          <p style={{ color: styles.theme.textSecondary, marginBottom: "16px" }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: styles.theme.primary,
              color: "white",
              fontWeight: "500",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!chatData) {
    return null;
  }

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: styles.theme.background
    }}>
      {/* Chat Header */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: `1px solid ${styles.theme.border}`, 
        backgroundColor: styles.theme.surface,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: styles.theme.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "16px",
                color: styles.theme.textSecondary
              }}
            >
              ←
            </button>
          )}
          <UserInitialsAvatar username={chatData.chat_name || "CH"} size="medium" style={{ marginRight: "12px" }} />
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: styles.theme.text }}>
              {chatData.chat_name}
            </h2>
            <p style={{ fontSize: "14px", color: styles.theme.textSecondary }}>
              {chatData.is_group ? `${chatMembers.length} members` : 'Direct message'}
              {websocketStatus.is_connected && (
                <span style={{ marginLeft: "8px", color: styles.theme.success }}>• Online</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Screen */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <ChatScreen
          chatId={chatId}
          messages={messages}
          isGroupChat={chatData.is_group}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
};

export default ChatView;