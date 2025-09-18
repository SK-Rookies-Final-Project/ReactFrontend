export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    AUTH_SYSTEM: '/api/kafka/auth_system',
    AUTH_RESOURCE: '/api/kafka/auth_resource',
    AUTH_FAILURE: '/api/kafka/auth_failure',
    AUTH_SUSPICIOUS: '/api/kafka/auth_suspicious',
    PROMETHEUS: '/prom',

    TOPICS: '/api/topics',
    SCHEMAS_SUBJECTS: '/api/schemas/subjects',
    SCHEMA_LATEST: (subject: string) =>
      `/api/schemas/${encodeURIComponent(subject)}/latest`,

    CONSUMER_GROUPS: '/api/consumer-groups',       // GET 그룹 이름 목록
    CONSUMER_GROUPS_SUMMARY: '/api/consumer-groups/summary', // GET 요약
    CONSUMER_GROUP_DELETE: (groupId: string) =>
      `/api/consumer-groups/${encodeURIComponent(groupId)}`, // DELETE

  }
} as const;
