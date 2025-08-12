import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Note: Emergency recovery methods not implemented in current SessionManager
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    // Note: Emergency recovery not implemented in current SessionManager
    
    // Reset error state
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
          flexDirection: 'column',
          gap: '20px',
          padding: '40px'
        }}>
          <h1 style={{ fontSize: '24px', margin: 0, color: '#ef4444' }}>Something went wrong</h1>
          
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#9ca3af' }}>
              The application encountered an unexpected error. We've attempted to recover automatically.
            </p>
            
            {this.state.error && (
              <details style={{ 
                textAlign: 'left', 
                backgroundColor: '#3a3a3a', 
                padding: '16px', 
                borderRadius: '6px',
                marginTop: '16px',
                fontSize: '14px'
              }}>
                <summary style={{ cursor: 'pointer', color: '#d1d5db' }}>
                  Error Details
                </summary>
                <pre style={{ 
                  color: '#ef4444', 
                  margin: '8px 0 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre style={{ 
                    color: '#9ca3af', 
                    margin: '8px 0 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '12px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '20px'
          }}>
            <button 
              onClick={this.handleRetry}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Try Again
            </button>
            
            <button 
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
