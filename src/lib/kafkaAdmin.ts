// src/lib/kafkaAdmin.ts
import { API_CONFIG } from '../config/api';
import { http } from './http';

// === Types (백엔드 DTO에 맞춰서) ===
export type CreateTopicReq = { name: string; partitions: number; replicationFactor: number };
export type LatestSchema = { subject: string; id: number; version: number; schema: string };

export type ConsumerGroupSummary = {
  groupId: string;
  state?: string;
  members?: number;
  partitions?: number;
  totalLag?: number;
};

export interface AssignedPartition {
  topic: string;
  partition: number;
  committedOffset: number;
  latestOffset: number;
  lag: number;
}

export interface MemberInfo {
  consumerId: string;
  clientId: string;
  host: string;
  assignedPartitions: AssignedPartition[];
}

export interface GroupDetail {
  groupId: string;
  state: string;
  coordinator: string;
  members: MemberInfo[];
  totalLag: number;
}

// === Topics ===
export const listTopics = () => http.get<string[]>(API_CONFIG.ENDPOINTS.TOPICS);

export const createTopic = (payload: CreateTopicReq) =>
  http.post<string>(API_CONFIG.ENDPOINTS.TOPICS, payload, 'text'); // 컨트롤러가 문자열 반환

// 선택: describe topics (주석 풀면)
// export const describeTopics = (names: string[]) =>
//   http.post<Record<string, any>>(API_CONFIG.ENDPOINTS.TOPICS_DESCRIBE, names);

// === Schemas ===
export const listSchemaSubjects = () =>
  http.get<string[]>(API_CONFIG.ENDPOINTS.SCHEMAS_SUBJECTS);

export const getLatestSchema = (subject: string) =>
  http.get<LatestSchema>(API_CONFIG.ENDPOINTS.SCHEMA_LATEST(subject));

// === Consumer Groups ===
export const listConsumerGroups = () =>
  http.get<string[]>(API_CONFIG.ENDPOINTS.CONSUMER_GROUPS);

export const listConsumerGroupSummaries = () =>
  http.get<ConsumerGroupSummary[]>(API_CONFIG.ENDPOINTS.CONSUMER_GROUPS_SUMMARY);

export const deleteConsumerGroup = (groupId: string) =>
  http.del<string>(API_CONFIG.ENDPOINTS.CONSUMER_GROUP_DELETE(groupId), 'text');

export const getConsumerGroupDetail = (groupId: string) =>
  http.get<GroupDetail>(API_CONFIG.ENDPOINTS.CONSUMER_GROUP_DETAIL(groupId));