export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    AUTH_SYSTEM: '/api/auth/auth_system',
    AUTH_RESOURCE: '/api/auth/auth_resource',
    AUTH_FAILURE: '/api/auth/auth_failure',
    AUTH_SUSPICIOUS: '/api/auth/auth_suspicious',
    PROMETHEUS: '/prom',

    TOPICS: '/api/kafka/topics',
    SCHEMAS_SUBJECTS: '/api/kafka/schemas/subjects',
    SCHEMA_REGISTER: '/api/kafka/schemas/avro',
    SCHEMA_LATEST: (subject: string) =>
      `/api/kafka/schemas/${encodeURIComponent(subject)}/latest`,

    CONSUMER_GROUPS: '/api/kafka/consumer-groups',       // GET 그룹 이름 목록
    CONSUMER_GROUPS_SUMMARY: '/api/kafka/consumer-groups/summary', // GET 요약
    CONSUMER_GROUP_DELETE: (groupId: string) =>
      `/api/kafka/consumer-groups/${encodeURIComponent(groupId)}`, // DELETE

  }
} as const;
