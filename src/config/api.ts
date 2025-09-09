// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  ENDPOINTS: {
    KAFKA_STREAM: '/api/kafka/stream',
    KAFKA_AUTH: '/api/kafka/auth',
    KAFKA_AUTH_FAILED: '/api/kafka/auth_failed',
    KAFKA_UNAUTH: '/api/kafka/unauth'
  }
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// SSE endpoint URLs
export const SSE_ENDPOINTS = {
  STREAM: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_STREAM),
  AUTH: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_AUTH),
  AUTH_FAILED: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_AUTH_FAILED),
  UNAUTH: buildApiUrl(API_CONFIG.ENDPOINTS.KAFKA_UNAUTH)
} as const;