import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AppProvider } from './AppContext.tsx'
import { ThemeProvider } from './components/ThemeContext.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </ThemeProvider>
  </ErrorBoundary>,
)
