// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    KAFKA_AUTH_FAILURE: '/api/kafka/auth_failure', // 비밀번호 연속으로 틀림
    KAFKA_AUTH_SUSPICIOUS: '/api/kafka/auth_suspicious', // 로그인 시도가 의심스러움
    KAFKA_AUTH_SYSTEM: '/api/kafka/auth_system', // 시스템 권한 부족
    KAFKA_AUTH_RESOURCE: '/api/kafka/auth_resource' // 유저/리소스 권한 부족
  }
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// SSE endpoint URLs
export const SSE_ENDPOINTS = {
  AUTH_FAILURE: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_AUTH_FAILURE),
  AUTH_SUSPICIOUS: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_AUTH_SUSPICIOUS),
  AUTH_SYSTEM: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_AUTH_SYSTEM),
  AUTH_RESOURCE: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_AUTH_RESOURCE)
} as const;