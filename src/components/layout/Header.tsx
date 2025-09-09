import React, { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff, Moon, Sun, Shield } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { buildApiUrl, API_CONFIG } from '../../config/api';

interface ApiStatus {
  stream: boolean;
  auth: boolean;
  unauth: boolean;
  auth_failed: boolean;
}

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    stream: false,
    auth: false,
    unauth: false,
    auth_failed: false
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check API endpoints on mount
  useEffect(() => {
    const checkEndpoint = async (endpoint: string, key: keyof ApiStatus) => {
      try {
        const response = await fetch(buildApiUrl(`/api/kafka/${endpoint}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setApiStatus(prev => ({ ...prev, [key]: response.ok }));
      } catch (error) {
        console.warn(`API endpoint ${endpoint} check failed:`, error);
        setApiStatus(prev => ({ ...prev, [key]: false }));
      }
    };

    checkEndpoint('stream', 'stream');
    checkEndpoint('auth', 'auth');
    checkEndpoint('unauth', 'unauth');
    checkEndpoint('auth_failed', 'auth_failed');
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Kafka 감사 로그 모니터링
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                실시간 보안 이벤트 대시보드
              </p>
            </div>
          </div>

          {/* Status and Controls */}
          <div className="flex items-center space-x-6">
            {/* Current Time */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTime(currentTime)}</span>
            </div>

            {/* API Status */}
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">API 상태:</span>
              {Object.entries(apiStatus).map(([key, status]) => (
                <div key={key} className="flex items-center space-x-1">
                  {status ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {key}
                  </span>
                </div>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="테마 전환"
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};