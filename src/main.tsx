import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AppProvider } from './AppContext'
import './index.css'

// Force MessageService instantiation early
import { messageService } from './services/messageService';
console.log(' Main: MessageService imported and instantiated');

// Force the MessageService to be instantiated
if (messageService) {
  console.log(' MessageService is available in main');
} else {
  console.log(' MessageService is not available in main');
}

// Global error handlers to prevent crashes
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent the error from crashing the app
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the rejection from crashing the app
  event.preventDefault();
});

// Override console.error to catch errors
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError.apply(console, args);
  
  // Log to a file or send to error reporting service
  if (args.some(arg => arg instanceof Error)) {
    console.warn('Error detected, app may be unstable');
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
