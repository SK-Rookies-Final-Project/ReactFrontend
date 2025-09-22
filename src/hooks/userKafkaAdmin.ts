// src/hooks/useKafkaAdmin.ts
import { useCallback, useEffect, useState } from 'react';
import {
  listTopics, createTopic, deleteTopic,
  type CreateTopicReq
} from '../lib/kafkaAdmin';

export function useKafkaAdmin() {
  // topics
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);


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

  const removeTopic = useCallback(async (topicName: string) => {
    try {
      await deleteTopic(topicName);
      toast(`토픽 삭제: ${topicName}`);
      loadTopics();
    } catch (e: any) {
      toast(e.message || '토픽 삭제 실패');
    }
  }, [loadTopics]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  return {
    // state
    topics, topicsLoading,
    message,

    // actions
    loadTopics, addTopic, removeTopic,
  };
}