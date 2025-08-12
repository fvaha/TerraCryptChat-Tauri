import React from 'react';
import { useThemedStyles } from './useThemedStyles';

interface LoadingScreenProps {
  currentStep: string;
  progress: number;
  isVisible: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ currentStep, progress, isVisible }) => {
  const { theme } = useThemedStyles();

  console.log('[LoadingScreen] Rendering with props:', { currentStep, progress, isVisible, hasTheme: !!theme });

  if (!isVisible) {
    console.log('[LoadingScreen] Not visible, returning null');
    return null;
  }

  if (!theme) {
    console.log('[LoadingScreen] No theme available, using fallback');
    // Fallback theme in case the theme context is not ready
    const fallbackTheme = {
      background: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#a0a0a0',
      border: '#333333',
      primary: '#3b82f6'
    };
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: fallbackTheme.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: fallbackTheme.primary,
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>

        <h1 style={{
          color: fallbackTheme.text,
          fontSize: '28px',
          fontWeight: '600',
          margin: '0 0 8px 0',
          textAlign: 'center'
        }}>
          TerraCrypt Chat
        </h1>

        <p style={{
          color: fallbackTheme.textSecondary,
          fontSize: '16px',
          margin: '0 0 40px 0',
          textAlign: 'center'
        }}>
          Secure messaging for professionals
        </p>

        <div style={{
          width: '300px',
          height: '6px',
          backgroundColor: fallbackTheme.border,
          borderRadius: '3px',
          marginBottom: '24px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: fallbackTheme.primary,
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{
          color: fallbackTheme.text,
          fontSize: '16px',
          fontWeight: '500',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          {currentStep}
        </div>

        <div style={{
          color: fallbackTheme.textSecondary,
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {Math.round(progress)}%
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* App Logo/Icon */}
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: theme.primary,
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
        boxShadow: `0 8px 32px ${theme.primary}40`
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>

      {/* App Title */}
      <h1 style={{
        color: theme.text,
        fontSize: '28px',
        fontWeight: '600',
        margin: '0 0 8px 0',
        textAlign: 'center'
      }}>
        TerraCrypt Chat
      </h1>

      {/* Subtitle */}
      <p style={{
        color: theme.textSecondary,
        fontSize: '16px',
        margin: '0 0 40px 0',
        textAlign: 'center'
      }}>
        Secure messaging for professionals
      </p>

      {/* Progress Bar */}
      <div style={{
        width: '300px',
        height: '6px',
        backgroundColor: theme.border,
        borderRadius: '3px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: theme.primary,
          borderRadius: '3px',
          transition: 'width 0.3s ease',
          boxShadow: `0 0 8px ${theme.primary}60`
        }} />
      </div>

      {/* Current Step */}
      <div style={{
        color: theme.text,
        fontSize: '16px',
        fontWeight: '500',
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        {currentStep}
      </div>

      {/* Progress Percentage */}
      <div style={{
        color: theme.textSecondary,
        fontSize: '14px',
        textAlign: 'center'
      }}>
        {Math.round(progress)}%
      </div>

      {/* Loading Animation */}
      <div style={{
        marginTop: '32px',
        display: 'flex',
        gap: '8px'
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: theme.primary,
              borderRadius: '50%',
              animation: `pulse 1.4s ease-in-out infinite both`,
              animationDelay: `${i * 0.16}s`
            }}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 80%, 100% {
              transform: scale(0.8);
              opacity: 0.5;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingScreen;
