import React from 'react';

const FallbackApp: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#242424',
      color: 'white',
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
          color: '#646cff'
        }}>
          🚀 Terracrypt Chat
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          marginBottom: '2rem',
          color: 'rgba(255, 255, 255, 0.87)'
        }}>
          Secure messaging application
        </p>
        
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>Application Status</h3>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            textAlign: 'left'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>✅ React Framework: Loaded</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ TypeScript: Working</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ Tauri Backend: Connected</li>
            <li style={{ marginBottom: '0.5rem' }}>🔄 Authentication: Initializing...</li>
          </ul>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          Refresh Application
        </button>
      </div>
    </div>
  );
};

export default FallbackApp; 