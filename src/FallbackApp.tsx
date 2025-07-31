import React from 'react';
import { useTheme } from './components/ThemeContext';

const FallbackApp: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.background,
      color: theme.text,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '1rem',
          color: theme.primary
        }}>
          🚀 Terracrypt Chat
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          marginBottom: '2rem',
          color: theme.textSecondary
        }}>
          Secure messaging application
        </p>
        
        <div style={{
          backgroundColor: theme.surface,
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: `1px solid ${theme.border}`
        }}>
          <h3 style={{ marginBottom: '1rem', color: theme.text }}>Application Status</h3>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            textAlign: 'left'
          }}>
            <li style={{ marginBottom: '0.5rem', color: theme.text }}>✅ React Framework: Loaded</li>
            <li style={{ marginBottom: '0.5rem', color: theme.text }}>✅ TypeScript: Working</li>
            <li style={{ marginBottom: '0.5rem', color: theme.text }}>✅ Tauri Backend: Connected</li>
            <li style={{ marginBottom: '0.5rem', color: theme.text }}>🔄 Authentication: Initializing...</li>
          </ul>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: theme.primary,
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.primaryHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.primary;
          }}
        >
          Reload Application
        </button>
      </div>
    </div>
  );
};

export default FallbackApp; 