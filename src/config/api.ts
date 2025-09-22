export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    AUTH_SYSTEM: '/api/auth/auth_system',
    AUTH_RESOURCE: '/api/auth/auth_resource',
    AUTH_FAILURE: '/api/auth/auth_failure',
    AUTH_SUSPICIOUS: '/api/auth/auth_suspicious',
    PROMETHEUS: '/prom',

    // Topics
    TOPICS: '/api/kafka/topics',
    TOPIC_DELETE: (topicName: string) =>
      `/api/kafka/topics/${encodeURIComponent(topicName)}`,
    TOPICS_DESCRIBE: '/api/kafka/topics/describe',

    // Consumer Groups
    CONSUMER_GROUPS: '/api/kafka/consumer-groups',
    CONSUMER_GROUP_DETAIL: (groupId: string) =>
      `/api/kafka/consumer-groups/${encodeURIComponent(groupId)}`,
    CONSUMER_GROUP_DELETE: (groupId: string) =>
      `/api/kafka/consumer-groups/${encodeURIComponent(groupId)}`,
    CONSUMER_GROUP_RESET_OFFSET: (groupId: string) =>
      `/api/kafka/consumer-groups/${encodeURIComponent(groupId)}/reset-offset`,

    // ACLs
    ACLS: '/api/kafka/acls',

    // Configs
    CONFIGS_CLUSTER: '/api/kafka/configs/cluster',
    CONFIGS_TOPIC: (topicName: string) =>
      `/api/kafka/configs/topics/${encodeURIComponent(topicName)}`,
    CONFIGS_UPDATE: '/api/kafka/configs',

    // Cluster Info
    CLUSTER_INFO: '/api/kafka/cluster/info',

    // Partitions
    PARTITIONS: (topicName: string) =>
      `/api/kafka/partitions/${encodeURIComponent(topicName)}`,
    PARTITIONS_REASSIGN: '/api/kafka/partitions/reassign',
  }
} as const;
