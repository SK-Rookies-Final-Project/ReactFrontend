import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  FolderKanban, 
  Plus, 
  RefreshCcw, 
  Trash2, 
  Settings, 
  Server, 
  Database
} from 'lucide-react';

import {
  listTopics, createTopic, deleteTopic,
  getTopicConfig,
  getClusterInfo,
  getPartitions,
  type ConfigResource,
  type ClusterInfo,
  type PartitionInfo
} from '../lib/kafkaControlCenter';

export const SettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ---- Cluster Info ----
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);

  // ---- Topics ----
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [partitions, setPartitions] = useState(1);
  const [replication, setReplication] = useState(1);

  // ---- Configs ----
  const [selectedTopicForConfig, setSelectedTopicForConfig] = useState<string>('');
  const [topicConfig, setTopicConfig] = useState<ConfigResource | null>(null);

  // ---- Partitions ----
  const [selectedTopicForPartitions, setSelectedTopicForPartitions] = useState<string>('');
  const [topicPartitions, setTopicPartitions] = useState<PartitionInfo[]>([]);

  // ---- Message (토스트 대용) ----
  const [msg, setMsg] = useState('');
  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // reload helpers
  const reloadClusterInfo = useCallback(async () => {
    setClusterLoading(true);
    try {
      const info = await getClusterInfo();
      setClusterInfo(info);
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message || '클러스터 정보 조회 실패');
    } finally {
      setClusterLoading(false);
    }
  }, []);

  const reloadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const allTopics = await listTopics();
      const visibleTopics = allTopics.filter((t) => !t.startsWith('_'));
      setTopics(visibleTopics);
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message || '토픽 조회 실패');
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  // actions
  const handleCreateTopic = async () => {
    if (!newTopic.trim()) return toast('토픽명을 입력하세요');
    try {
      await createTopic({ 
        name: newTopic.trim(), 
        partitions: Math.max(1, partitions|0), 
        replicationFactor: Math.max(1, replication|0) 
      });
      toast(`토픽 생성: ${newTopic}`);
      setNewTopic('');
      await reloadTopics();
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message || '토픽 생성 실패');
    }
  };

  const handleDeleteTopic = async (topicName: string) => {
    const confirmed = window.confirm(`정말로 토픽 "${topicName}"을 삭제하시겠습니까?\n\n⚠️ 주의: 이 작업은 되돌릴 수 없으며, 토픽 내의 모든 데이터가 영구적으로 삭제됩니다.`);
    if (!confirmed) return;

    try {
      await deleteTopic(topicName);
      toast(`토픽 삭제: ${topicName}`);
      await reloadTopics();
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message || '토픽 삭제 실패');
    }
  };


  const handleLoadTopicConfig = async (topicName: string) => {
    setSelectedTopicForConfig(topicName);
    try {
      const config = await getTopicConfig(topicName);
      setTopicConfig(config);
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message || '토픽 설정 조회 실패');
    }
  };

  const handleLoadPartitions = async (topicName: string) => {
    setSelectedTopicForPartitions(topicName);
    try {
      const partitionList = await getPartitions(topicName);
      setTopicPartitions(partitionList);
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message || '파티션 정보 조회 실패');
    }
  };

  // 초기 로드
  useEffect(() => {
    reloadClusterInfo();
    reloadTopics();
  }, [reloadClusterInfo, reloadTopics]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              대시보드로 돌아가기
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kafka Control Center</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">{msg}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Cluster Info */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-500 text-white mr-4">
                <Server className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">클러스터 정보</h2>
            </div>
            <button
              onClick={reloadClusterInfo}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
            >
              <RefreshCcw className="h-4 w-4" /> 새로고침
            </button>
          </div>

          {clusterLoading ? (
            <div className="text-sm text-gray-500">불러오는 중...</div>
          ) : clusterInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">클러스터 ID</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{clusterInfo.clusterId}</div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">브로커 수</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{clusterInfo.brokers.length}</div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">총 토픽 수</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{clusterInfo.totalTopics}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">클러스터 정보를 불러올 수 없습니다</div>
          )}
        </section>

        {/* Topics */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500 text-white mr-4">
                <FolderKanban className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">토픽 관리</h2>
            </div>
            <button
              onClick={reloadTopics}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
            >
              <RefreshCcw className="h-4 w-4" /> 새로고침
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 목록 */}
            <div className="md:col-span-2">
              {topicsLoading ? (
                <div className="text-sm text-gray-500">불러오는 중...</div>
              ) : topics.length === 0 ? (
                <div className="text-gray-500">토픽이 없습니다</div>
              ) : (
                <ul className="space-y-2">
                  {topics.map(t => (
                    <li key={t} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-800 dark:text-gray-100">{t}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadTopicConfig(t)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                          title="설정 보기"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleLoadPartitions(t)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300"
                          title="파티션 보기"
                        >
                          <Database className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(t)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 생성 */}
            <div className="md:col-span-1">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="font-medium mb-3 text-gray-800 dark:text-gray-100">새 토픽 생성</div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      토픽 이름
                    </label>
                    <input
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      placeholder="topic-name"
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 
                                border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        파티션 개수
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={partitions}
                        onChange={e => setPartitions(parseInt(e.target.value || '1', 10))}
                        className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 
                                  border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        복제 계수
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={replication}
                        onChange={e => setReplication(parseInt(e.target.value || '1', 10))}
                        className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 
                                  border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateTopic}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 
                              rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" /> 생성
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Topic Config & Partitions */}
        {(selectedTopicForConfig || selectedTopicForPartitions) && (
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-lg bg-indigo-500 text-white mr-4">
                <Settings className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedTopicForConfig ? `${selectedTopicForConfig} 설정` : `${selectedTopicForPartitions} 파티션`}
              </h2>
            </div>

            {selectedTopicForConfig && topicConfig && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">토픽 설정</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(topicConfig.configs).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{key}</div>
                      <div className="text-sm text-gray-900 dark:text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTopicForPartitions && topicPartitions.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">파티션 정보</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">파티션</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">리더</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">복제본</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ISR</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">오프셋</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">상태</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {topicPartitions.map((partition) => (
                        <tr key={partition.partition}>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{partition.partition}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{partition.leader}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{partition.replicas.join(', ')}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{partition.isr.join(', ')}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{partition.offset.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              partition.offline 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {partition.offline ? 'Offline' : 'Online'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};