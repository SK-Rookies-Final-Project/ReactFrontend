import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, FolderKanban, FileCode2, Users, Plus, Trash2, RefreshCcw } from 'lucide-react';

import {
  listTopics, createTopic,
  listSchemaSubjects, getLatestSchema,
  listConsumerGroups, listConsumerGroupSummaries, deleteConsumerGroup,
  type LatestSchema, type ConsumerGroupSummary
} from '../lib/kafkaAdmin';

export const SettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ---- Topics ----
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [partitions, setPartitions] = useState(1);
  const [replication, setReplication] = useState(1);

  // ---- Schemas ----
  const [subjects, setSubjects] = useState<string[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [latestSchema, setLatestSchema] = useState<LatestSchema | null>(null);

  // ---- Consumer Groups ----
  const [groups, setGroups] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<ConsumerGroupSummary[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // ---- Message (토스트 대용) ----
  const [msg, setMsg] = useState('');
  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2000); };

  // 초기 로드
  useEffect(() => {
    reloadTopics();
    reloadSchemas();
    reloadGroups();
  }, []);

  // reload helpers
  const reloadTopics = async () => {
    setTopicsLoading(true);
    try {
      const allTopics = await listTopics();
      // 🔹 '_'로 시작하는 토픽 제외
      const visibleTopics = allTopics.filter((t) => !t.startsWith('_'));
      setTopics(visibleTopics);
    } catch (e: any) {
      toast(e?.message || '토픽 조회 실패');
    } finally {
      setTopicsLoading(false);
    }
  };                

  const reloadSchemas = async () => {
    setSchemasLoading(true);
    try {
      setSubjects(await listSchemaSubjects());
    } catch (e: any) {
      toast(e?.message || '스키마 subject 조회 실패');
    } finally {
      setSchemasLoading(false);
    }
  };

  const reloadGroups = async () => {
    setGroupsLoading(true);
    try {
      const [names, sums] = await Promise.all([
        listConsumerGroups(),
        listConsumerGroupSummaries()
      ]);
      setGroups(names);
      setSummaries(sums);
    } catch (e: any) {
      toast(e?.message || '컨슈머 그룹 조회 실패');
    } finally {
      setGroupsLoading(false);
    }
  };

  // actions
  const handleCreateTopic = async () => {
    if (!newTopic.trim()) return toast('토픽명을 입력하세요');
    try {
      await createTopic({ name: newTopic.trim(), partitions: Math.max(1, partitions|0), replicationFactor: Math.max(1, replication|0) });
      toast(`토픽 생성: ${newTopic}`);
      setNewTopic('');
      await reloadTopics();
    } catch (e: any) {
      toast(e?.message || '토픽 생성 실패');
    }
  };

  const handleSelectSubject = async (s: string) => {
    setSelectedSubject(s);
    try {
      setLatestSchema(await getLatestSchema(s));
    } catch (e: any) {
      toast(e?.message || '최신 스키마 조회 실패');
    }
  };

  const handleDeleteGroup = async (gid: string) => {
    if (!confirm(`컨슈머 그룹을 삭제할까요?\n${gid}`)) return;
    try {
      await deleteConsumerGroup(gid);
      toast(`삭제 완료: ${gid}`);
      await reloadGroups();
    } catch (e: any) {
      toast(e?.message || '삭제 실패');
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kafka 설정</h1>
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
                      {/* 필요하면 상세 버튼/삭제 버튼 추가 */}
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
                  {/* 토픽 이름 */}
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

                  {/* 파티션 & 복제계수 */}
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

                  {/* 버튼 */}
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

        {/* Schemas */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500 text-white mr-4">
                <FileCode2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">스키마 레지스트리</h2>
            </div>
            <button
              onClick={reloadSchemas}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
            >
              <RefreshCcw className="h-4 w-4" /> 새로고침
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* subject 목록 */}
            <div className="md:col-span-1">
              {schemasLoading ? (
                <div className="text-sm text-gray-500">불러오는 중...</div>
              ) : subjects.length === 0 ? (
                <div className="text-gray-500">등록된 subject가 없습니다</div>
              ) : (
                <ul className="space-y-2">
                  {subjects.map(s => (
                    <li key={s} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handleSelectSubject(s)}
                        className={`text-left w-full hover:underline ${
                          selectedSubject === s ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 최신 스키마 */}
            <div className="md:col-span-2">
              {selectedSubject ? (
                latestSchema ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="text-xs text-gray-500 mb-2">
                      subject: <span className="font-medium">{selectedSubject}</span> · id: {latestSchema.id} · version: {latestSchema.version}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
{latestSchema.schema}
                    </pre>
                  </div>
                ) : (
                  <div className="text-gray-500">선택된 subject의 최신 스키마를 불러오는 중...</div>
                )
              ) : (
                <div className="text-gray-500">좌측에서 subject를 선택하세요</div>
              )}
            </div>
          </div>
        </section>

        {/* Consumer Groups */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500 text-white mr-4">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">컨슈머 그룹</h2>
            </div>
            <button
              onClick={reloadGroups}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
            >
              <RefreshCcw className="h-4 w-4" /> 새로고침
            </button>
          </div>

          {groupsLoading ? (
            <div className="text-sm text-gray-500">불러오는 중...</div>
          ) : groups.length === 0 ? (
            <div className="text-gray-500">컨슈머 그룹이 없습니다</div>
          ) : (
            <ul className="space-y-2">
              {groups.map(g => {
                const sm = summaries.find(s => s.groupId === g);
                return (
                  <li key={g} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{g}</div>
                      <div className="text-xs text-gray-500">
                        state: {sm?.state ?? '-'} · members: {sm?.members ?? 0} · partitions: {sm?.partitions ?? '-'} ·
                        {' '}
                        lag: <span className={(sm?.totalLag ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {sm?.totalLag ?? 0}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(g)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" /> 삭제
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};