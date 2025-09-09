import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SSEProvider } from './contexts/SSEContext';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { StreamPage } from './pages/StreamPage';
import { AuthSuccessPage } from './pages/AuthSuccessPage';
import { AuthFailedPage } from './pages/AuthFailedPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

function App() {
  return (
    <ThemeProvider>
      <SSEProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Header />
            <Navigation />
            
            <main className="pb-8">
              <Routes>
                <Route path="/" element={<Navigate to="/stream" replace />} />
                <Route path="/stream" element={<StreamPage />} />
                <Route path="/auth" element={<AuthSuccessPage />} />
                <Route path="/auth-failed" element={<AuthFailedPage />} />
                <Route path="/unauth" element={<UnauthorizedPage />} />
              </Routes>
            </main>
          </div>
        </Router>
      </SSEProvider>
    </ThemeProvider>
  );
}

export default App;