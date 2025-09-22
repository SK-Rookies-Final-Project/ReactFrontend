// src/lib/kafkaControlCenter.ts
import { API_CONFIG } from '../config/api';
import { http } from './http';

// === Types ===
export type CreateTopicReq = { 
  name: string; 
  partitions: number; 
  replicationFactor: number 
};

export type ConsumerGroupMember = {
  memberId: string;
  clientId: string;
  host: string;
  assignedPartitions: string[];
};

export type ConsumerGroupDetail = {
  groupId: string;
  state: string;
  coordinator: string;
  members: ConsumerGroupMember[];
  assignments: Record<string, string>;
  lag: number;
};

export type AclEntry = {
  principal: string;
  resourceType: 'TOPIC' | 'GROUP' | 'CLUSTER' | 'TRANSACTIONAL_ID' | 'DELEGATION_TOKEN';
  resourceName: string;
  operation: 'READ' | 'WRITE' | 'CREATE' | 'DELETE' | 'ALTER' | 'DESCRIBE' | 'CLUSTER_ACTION' | 'DESCRIBE_CONFIGS' | 'ALTER_CONFIGS' | 'IDEMPOTENT_WRITE' | 'ALL';
  permissionType: 'ALLOW' | 'DENY';
  host: string;
  patternType: 'LITERAL' | 'PREFIXED';
};

export type ConfigResource = {
  resourceType: 'CLUSTER' | 'TOPIC';
  resourceName: string;
  configs: Record<string, string>;
};

export type Broker = {
  id: number;
  host: string;
  port: number;
  rack: string;
  isController: boolean;
};

export type ClusterInfo = {
  clusterId: string;
  brokers: Broker[];
  clusterConfigs: Record<string, string>;
  totalPartitions: number;
  totalTopics: number;
};

export type PartitionInfo = {
  topicName: string;
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
  offline: boolean;
  size: number;
  offset: number;
};

export type PartitionReassignment = {
  topicName: string;
  partition: number;
  replicas: number[];
};

// === Topics ===
export const listTopics = () => http.get<string[]>(API_CONFIG.ENDPOINTS.TOPICS);

export const createTopic = (payload: CreateTopicReq) =>
  http.post<string>(API_CONFIG.ENDPOINTS.TOPICS, payload, 'text');

export const deleteTopic = (topicName: string) =>
  http.del<string>(API_CONFIG.ENDPOINTS.TOPIC_DELETE(topicName), 'text');

export const describeTopics = (topicNames: string[]) =>
  http.post<Record<string, any>>(API_CONFIG.ENDPOINTS.TOPICS_DESCRIBE, topicNames);

// === Consumer Groups === (사용하지 않음 - 주석 처리)
// export const listConsumerGroups = () =>
//   http.get<string[]>(API_CONFIG.ENDPOINTS.CONSUMER_GROUPS);

// export const getConsumerGroupDetail = (groupId: string) =>
//   http.get<ConsumerGroupDetail>(API_CONFIG.ENDPOINTS.CONSUMER_GROUP_DETAIL(groupId));

// export const deleteConsumerGroup = (groupId: string) =>
//   http.del<string>(API_CONFIG.ENDPOINTS.CONSUMER_GROUP_DELETE(groupId), 'text');

// export const resetConsumerGroupOffset = (
//   groupId: string, 
//   topicName: string, 
//   partition: number, 
//   offset: number
// ) => {
//   const params = new URLSearchParams({
//     topicName,
//     partition: partition.toString(),
//     offset: offset.toString()
//   });
//   return http.post<string>(
//     `${API_CONFIG.ENDPOINTS.CONSUMER_GROUP_RESET_OFFSET(groupId)}?${params}`,
//     null,
//     'text'
//   );
// };

// === ACLs === (사용하지 않음 - 주석 처리)
// export const listAcls = () =>
//   http.get<AclEntry[]>(API_CONFIG.ENDPOINTS.ACLS);

// export const createAcl = (acl: AclEntry) =>
//   http.post<string>(API_CONFIG.ENDPOINTS.ACLS, acl, 'text');

// export const deleteAcl = (acl: AclEntry) =>
//   http.del<string>(API_CONFIG.ENDPOINTS.ACLS, acl, 'text');

// === Configs ===
export const getClusterConfig = () =>
  http.get<ConfigResource>(API_CONFIG.ENDPOINTS.CONFIGS_CLUSTER);

export const getTopicConfig = (topicName: string) =>
  http.get<ConfigResource>(API_CONFIG.ENDPOINTS.CONFIGS_TOPIC(topicName));

export const updateConfig = (config: ConfigResource) =>
  http.put<string>(API_CONFIG.ENDPOINTS.CONFIGS_UPDATE, config, 'text');

// === Cluster Info ===
export const getClusterInfo = () =>
  http.get<ClusterInfo>(API_CONFIG.ENDPOINTS.CLUSTER_INFO);

// === Partitions ===
export const getPartitions = (topicName: string) =>
  http.get<PartitionInfo[]>(API_CONFIG.ENDPOINTS.PARTITIONS(topicName));

export const reassignPartitions = (reassignments: PartitionReassignment[]) =>
  http.post<string>(API_CONFIG.ENDPOINTS.PARTITIONS_REASSIGN, reassignments, 'text');
