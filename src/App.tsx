import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SSEProvider } from './contexts/SSEContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuditPage } from './pages/AuditPage';
import { HistoryDashboard } from './pages/HistoryDashboard';
import { SettingsPage } from './pages/SettingsPage';
import PrometheusPage from './pages/PrometheusPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SSEProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/audit" element={
                <ProtectedRoute>
                  <AuditPage />
                </ProtectedRoute> 
              } />
              <Route path="/history" element={
                <ProtectedRoute>
                  <HistoryDashboard />
                </ProtectedRoute>
              } />
              <Route path="/prometheus" element={
                <ProtectedRoute>
                  <PrometheusPage />
                </ProtectedRoute> 
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </SSEProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
