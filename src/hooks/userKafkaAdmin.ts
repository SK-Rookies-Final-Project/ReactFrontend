// src/hooks/useKafkaAdmin.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listTopics, createTopic,
  listSchemaSubjects, getLatestSchema,
  listConsumerGroups, listConsumerGroupSummaries, deleteConsumerGroup,
  type LatestSchema, type ConsumerGroupSummary
} from '../lib/kafkaAdmin';

export function useKafkaAdmin() {
  // topics
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // schemas
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [latest, setLatest] = useState<LatestSchema | null>(null);
  const [schemasLoading, setSchemasLoading] = useState(false);

  // consumer groups
  const [groups, setGroups] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<ConsumerGroupSummary[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [message, setMessage] = useState('');
  const toast = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 2000); };

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try { setTopics(await listTopics()); } 
    catch (e: any) { toast(e.message || '토픽 조회 실패'); }
    finally { setTopicsLoading(false); }
  }, []);

  const addTopic = useCallback(async (name: string, partitions = 1, replication = 1) => {
    try {
      await createTopic({ name, partitions, replicationFactor: replication });
      toast(`토픽 생성: ${name}`);
      loadTopics();
    } catch (e: any) {
      toast(e.message || '토픽 생성 실패');
    }
  }, [loadTopics]);

  const loadSubjects = useCallback(async () => {
    setSchemasLoading(true);
    try { setSubjects(await listSchemaSubjects()); }
    catch (e: any) { toast(e.message || '스키마 조회 실패'); }
    finally { setSchemasLoading(false); }
  }, []);

  const pickSubject = useCallback(async (subj: string) => {
    setSelectedSubject(subj);
    if (!subj) { setLatest(null); return; }
    try { setLatest(await getLatestSchema(subj)); }
    catch (e: any) { toast(e.message || '최신 스키마 조회 실패'); }
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const [names, sums] = await Promise.all([listConsumerGroups(), listConsumerGroupSummaries()]);
      setGroups(names); setSummaries(sums);
    } catch (e: any) { toast(e.message || '컨슈머 그룹 조회 실패'); }
    finally { setGroupsLoading(false); }
  }, []);

  const removeGroup = useCallback(async (gid: string) => {
    try { await deleteConsumerGroup(gid); toast(`삭제 완료: ${gid}`); loadGroups(); }
    catch (e: any) { toast(e.message || '삭제 실패'); }
  }, [loadGroups]);

  useEffect(() => {
    loadTopics(); loadSubjects(); loadGroups();
  }, [loadTopics, loadSubjects, loadGroups]);

  const summaryMap = useMemo(() => {
    const m = new Map<string, ConsumerGroupSummary>();
    summaries.forEach(s => m.set(s.groupId, s));
    return m;
  }, [summaries]);

  return {
    // state
    topics, topicsLoading,
    subjects, selectedSubject, latest, schemasLoading,
    groups, summaries, summaryMap, groupsLoading,
    message,

    // actions
    loadTopics, addTopic,
    loadSubjects, pickSubject,
    loadGroups, removeGroup,
  };
}