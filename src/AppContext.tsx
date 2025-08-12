import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { messageService } from "./services/messageService";
import { chatService } from "./services/chatService";
import { participantService } from "./participant/participantService";
import { userService } from "./services/userService";
import { friendService } from "./friend/friendService";
import * as authService from "./auth/authService";
import * as chatRequestService from "./services/chatRequestService";
import { settingsService } from "./settings/settingsService";
import * as notificationsService from "./services/notificationsService";

import { sessionManager, SessionState } from "./utils/sessionManager";
import { apiService } from "./api/apiService";
import { websocketService, WebSocketStatus, ConnectionState } from "./websocket/websocketService";
import { nativeApiService } from "./api/nativeApiService";
import { UserEntity } from "./models/models";

interface AppContextType {
  user: UserEntity | null;
  token: string | null;
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  websocketStatus: WebSocketStatus;
  sessionState: SessionState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  services: {
    sessionManager: typeof sessionManager;
    messageService: typeof messageService;
    chatService: typeof chatService;
    participantService: typeof participantService;
    userService: typeof userService;
    friendService: typeof friendService;
    authService: typeof authService;
    chatRequestService: typeof chatRequestService;
    settingsService: typeof settingsService;
    notificationsService: typeof notificationsService;
    apiService: typeof apiService;
    websocketService: typeof websocketService;
    nativeApiService: typeof nativeApiService;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simple state without complex initialization
  const [user, setUser] = useState<UserEntity | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    is_logged_in: false,
    current_user: null,
    is_session_initialized: false,
    is_dark_mode_enabled: false
  });
  const [websocketStatus, setWebsocketStatus] = useState<WebSocketStatus>({
    connection_state: ConnectionState.Disconnected,
    is_connected: false,
    is_connecting: false,
    reconnect_attempts: 0,
    last_heartbeat: 0,
    max_reconnect_attempts: 5,
    heartbeat_interval: 30,
  });

  // Simple initialization - just set up listeners and let App.tsx handle the rest
  useEffect(() => {
    // Set up WebSocket status listener
    const handleWebSocketStatusChange = (status: WebSocketStatus) => {
      setWebsocketStatus(status);
    };

    websocketService.onStatusChange(handleWebSocketStatusChange);

    // Listen to session manager state changes
    const unsubscribe = sessionManager.onStateChange((newState) => {
      setSessionState(newState);
      
      // Update user and token based on session state
      if (newState.is_logged_in && newState.current_user) {
        setUser(newState.current_user);
        setToken(sessionManager.getToken());
      } else {
        setUser(null);
        setToken(null);
      }
    });

    // Initialize session after setting up listeners
    const initSession = async () => {
      try {
        await sessionManager.initialize_session();
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };
    
    initSession();

    // Cleanup listeners on unmount
    return () => {
      unsubscribe();
      websocketService.offStatusChange(handleWebSocketStatusChange);
    };
  }, []);

  // Simple login function
  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await sessionManager.login(username, password);
      
      if (result.success) {
        // Update state after successful login
        const currentUser = sessionManager.getCurrentUser();
        const currentToken = sessionManager.getToken();
        setUser(currentUser);
        setToken(currentToken);
      } else {
        throw new Error(result.error || "Login failed");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed: " + (err instanceof Error ? err.message : "Unknown error"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simple logout function
  const logout = useCallback(async () => {
    try {
      await sessionManager.logOut();
      setUser(null);
      setToken(null);
      setError(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Logout failed. Please try again.");
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Network status detection
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const value: AppContextType = {
    user,
    token,
    isLoading,
    isOnline,
    error,
    websocketStatus,
    sessionState,
    login,
    logout,
    clearError,
    services: useMemo(() => ({
      sessionManager,
      messageService,
      chatService,
      participantService,
      userService,
      friendService,
      authService,
      chatRequestService,
      settingsService,
      notificationsService,
      apiService,
      websocketService,
      nativeApiService,
    }), []),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Export as named function to avoid Fast Refresh issues
export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}; 
