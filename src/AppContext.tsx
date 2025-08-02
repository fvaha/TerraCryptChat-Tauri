import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import * as messageService from "./services/messageService";
import * as chatService from "./chat/chatService";
import * as participantService from "./participant/participantService";
import * as userService from "./services/userService";
import * as friendService from "./friend/friendService";
import * as authService from "./auth/authService";
import * as chatRequestService from "./services/chatRequestService";
import * as settingsService from "./settings/settingsService";
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
    isLoggedIn: false,
    currentUser: null,
    isSessionInitialized: false,
    isDarkModeEnabled: false
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

  // Initialize session on mount and listen to session changes
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('Initializing session...');
        
        // Set up WebSocket status listener first
        const handleWebSocketStatusChange = (status: WebSocketStatus) => {
          console.log('WebSocket status changed:', status);
          setWebsocketStatus(status);
        };

        websocketService.onStatusChange(handleWebSocketStatusChange);

        // Initialize session immediately
        try {
          const isLoggedIn = await sessionManager.initializeSession();
          
          if (isLoggedIn) {
            const currentUser = sessionManager.getCurrentUser();
            const currentToken = sessionManager.getToken();
            
            console.log('[AppContext] Session manager reports logged in');
            console.log('[AppContext] Current user:', currentUser ? 'has user' : 'no user');
            console.log('[AppContext] Current token:', currentToken ? 'has token' : 'no token');
            
            if (currentUser && currentToken) {
              setUser(currentUser);
              setToken(currentToken);
              console.log('[AppContext] Session restored successfully');
            } else {
              console.log('[AppContext] Session restoration failed - missing user or token');
            }
          } else {
            console.log('[AppContext] Session manager reports not logged in');
          }
          
          console.log('Session initialization completed');
          
          // Verify MessageService is initialized
          console.log('Checking MessageService initialization...');
          if (messageService.messageService) {
            console.log('MessageService is available');
          } else {
            console.log('MessageService is not available');
          }

          // Debug: Log current session state
          console.log('[AppContext] Session initialization completed. Current state:', {
            isLoggedIn: sessionManager.isLoggedIn(),
            currentUser: sessionManager.getCurrentUser(),
            token: sessionManager.getToken() ? 'has token' : 'no token'
          });
        } catch (error) {
          console.error('Session initialization failed:', error);
          setError('Failed to initialize session. Please restart the application.');
        }
        
      } catch (error) {
        console.error('AppContext initialization failed:', error);
        setError('Failed to initialize application. Please restart the application.');
      }
    };

    // Listen to session manager state changes
    const unsubscribe = sessionManager.onStateChange((newState) => {
      console.log('[AppContext] Session state changed:', newState);
      setSessionState(newState);
      
      // Update user and token based on session state
      if (newState.isLoggedIn && newState.currentUser) {
        console.log('[AppContext] Setting user and token from session state');
        setUser(newState.currentUser);
        setToken(sessionManager.getToken());
      } else {
        console.log('[AppContext] Clearing user and token');
        setUser(null);
        setToken(null);
      }
    });

    initializeSession();

    // Cleanup listeners on unmount
    return () => {
      unsubscribe();
      // Remove the WebSocket status listener
      websocketService.offStatusChange((status: WebSocketStatus) => {
        console.log('WebSocket status changed:', status);
        setWebsocketStatus(status);
      });
    };
  }, []);

  // Updated login function to handle new response format
  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Attempting login...");
      const result = await sessionManager.login(username, password);
      
      if (result.success) {
        console.log("Login successful");
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