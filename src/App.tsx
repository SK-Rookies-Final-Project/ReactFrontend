import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SSEProvider } from './contexts/SSEContext';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { StreamPage } from './pages/StreamPage';
import { AuthSuccessPage } from './pages/AuthSuccessPage';
import { AuthFailedPage } from './pages/AuthFailedPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SSEProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
              <Header />
              <Navigation />
              
              <main className="pb-8">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<Navigate to="/stream" replace />} />
                  <Route path="/stream" element={
                    <ProtectedRoute>
                      <StreamPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/auth" element={
                    <ProtectedRoute>
                      <AuthSuccessPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/auth-failed" element={
                    <ProtectedRoute>
                      <AuthFailedPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/unauth" element={
                    <ProtectedRoute>
                      <UnauthorizedPage />
                    </ProtectedRoute>
                  } />
                </Routes>
              </main>
            </div>
          </Router>
        </SSEProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;