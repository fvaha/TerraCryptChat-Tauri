import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import * as messageService from "./messageService";
import * as chatService from "./chatService";
import * as participantService from "./participantService";
import * as userService from "./userService";
import * as friendService from "./friendService";
import * as authService from "./authService";
import * as chatRequestService from "./chatRequestService";
import * as settingsService from "./settingsService";
import * as notificationsService from "./notificationsService";

import { sessionManager, SessionState } from "./sessionManager";
import { apiService } from "./apiService";
import { websocketService, WebSocketStatus } from "./websocketService";
import { nativeApiService } from "./nativeApiService";
import { UserEntity } from "./models";

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
  const [user, setUser] = useState<UserEntity | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>(sessionManager.getState());
  const [websocketStatus, setWebsocketStatus] = useState<WebSocketStatus>({
    is_connected: false,
    is_connecting: false,
    reconnect_attempts: 0,
    last_heartbeat: 0,
  });
  const [lastInitTime, setLastInitTime] = useState<number>(0); // Prevent rapid reinitialization

  // Login function
  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("🔐 Attempting login...");
      const result = await sessionManager.login(username, password);
      
      if (result.success) {
        console.log("✅ Login successful");
      } else {
        throw new Error(result.error || "Login failed");
      }
    } catch (err) {
      console.error("❌ Login failed:", err);
      setError("Login failed: " + (err instanceof Error ? err.message : "Unknown error"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await sessionManager.logOut();
      setUser(null);
      setToken(null);
      setError(null);
    } catch (err) {
      console.error("❌ Logout error:", err);
      setError("Logout failed. Please try again.");
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // WebSocket status monitoring
  useEffect(() => {
    const handleStatusChange = (status: WebSocketStatus) => {
      setWebsocketStatus(status);
      console.log("🔌 WebSocket status changed:", status);
    };

    websocketService.onStatusChange(handleStatusChange);

    return () => {
      websocketService.offStatusChange(handleStatusChange);
    };
  }, []);

  // Listen to session state changes
  useEffect(() => {
    const unsubscribe = sessionManager.onStateChange((state) => {
      setSessionState(state);
      setUser(state.currentUser);
      setToken(state.currentUser?.tokenHash || null);
    });

    return unsubscribe;
  }, []);

  // Initialize session
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Prevent rapid reinitialization (minimum 2 seconds between attempts)
        const now = Date.now();
        if (now - lastInitTime < 2000) {
          console.log("⚠️ Skipping rapid reinitialization");
          return;
        }
        setLastInitTime(now);
        
        console.log("🚀 Initializing application...");
        setIsLoading(true);
        setError(null);
        
        // Initialize session manager with timeout
        const initTimeout = setTimeout(() => {
          console.warn("⚠️ Session initialization taking longer than expected");
        }, 5000);
        
        await sessionManager.initializeSession();
        clearTimeout(initTimeout);
        
        // TODO: Set up message flow callback for WebSocket
        // websocketService.setMessageFlowCallback((message) => {
        //   // Handle incoming messages
        //   messageService.messageService.handleIncomingMessage(JSON.stringify(message));
        // });
        
        console.log("✅ Application initialized");
      } catch (err) {
        console.error("❌ Application initialization failed:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError("Failed to initialize application: " + errorMessage);
        
        // Try to recover by clearing session and allowing retry
        try {
          await sessionManager.logOut();
        } catch (logoutError) {
          console.error("❌ Failed to logout during error recovery:", logoutError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [lastInitTime]);

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
    }), []), // Empty dependency array since these are static service instances
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Export as named function to avoid Fast Refresh issues
export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
};