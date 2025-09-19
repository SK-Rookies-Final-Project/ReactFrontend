import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { User } from '../types';
import { getErrorMessage } from '../utils/networkUtils';
import { apiClient } from '../utils/apiClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    // test, test 계정으로 더미 로그인
    if (username === 'test' && password === 'test') {
      console.log('더미 계정으로 로그인 중...');
      
      const userData: User = {
        id: 'test-user',
        username: 'test',
        email: 'test@example.com',
      };

      // 더미 JWT 토큰 생성 (실제로는 유효하지 않지만 테스트용)
      const dummyToken = 'dummy-jwt-token-for-test-user';
      
      setToken(dummyToken);
      setUser(userData);
      localStorage.setItem('auth_token', dummyToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      
      console.log('더미 로그인 성공');
      return;
    }

    // 로컬 개발 환경에서는 네트워크 상태 체크를 건너뜀
    // 실제 서버 연결은 fetch 요청에서 자체적으로 처리됨

    try {
      console.log('로그인 시도 중...', { username, baseUrl: API_CONFIG.BASE_URL });
      
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.LOGIN, {
        username,
        password
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `로그인 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('서버에서 토큰을 받지 못했습니다.');
      }

      const userData: User = {
        id: data.user?.id || data.userId || username,
        username: data.user?.username || username,
        email: data.user?.email,
      };

      setToken(data.token);
      setUser(userData);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      
      console.log('로그인 성공');
    } catch (error) {
      console.error('로그인 오류:', error);
      throw new Error(getErrorMessage(error));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
