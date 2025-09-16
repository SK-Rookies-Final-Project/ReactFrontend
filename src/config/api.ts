export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    AUTH_SYSTEM: '/api/kafka/auth_system',
    AUTH_RESOURCE: '/api/kafka/auth_resource',
    AUTH_FAILURE: '/api/kafka/auth_failure',
    AUTH_SUSPICIOUS: '/api/kafka/auth_suspicious',
    PROMETHEUS: '/prom'
  }
} as const;
