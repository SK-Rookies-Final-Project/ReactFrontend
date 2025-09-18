import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { QueryBuilder } from '../components/QueryBuilder';
import { DataVisualization } from '../components/DataVisualization';
import { dbApiService, QueryParams } from '../services/dbApiService';
import { ArrowLeft, Database, AlertTriangle, Activity, Users } from 'lucide-react';

type TableType = 'certified_2_time' | 'certified_not_move' | 'resource_level_false' | 'system_level_false';

export const HistoryDashboard: React.FC = () => {
  const { logout, token } = useAuth();
  const navigate = useNavigate();
  
  const [selectedTable, setSelectedTable] = useState<TableType>('certified_2_time');
  const [queryParams, setQueryParams] = useState<QueryParams>({});
  const [data, setData] = useState<any[]>([]);
  const [groupByClientIp, setGroupByClientIp] = useState<any[]>([]);
  const [groupByAlertType, setGroupByAlertType] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // JWT 토큰 설정
  useEffect(() => {
    if (token) {
      dbApiService.setToken(token);
    }
  }, [token]);

  // 테이블 선택 시 데이터 초기화
  useEffect(() => {
    setData([]);
    setGroupByClientIp([]);
    setGroupByAlertType([]);
    setTotalCount(0);
    setError(null);
    // 초기 로드 시 자동 조회 제거
  }, [selectedTable]);

  // 데이터 조회 함수
  const fetchData = useCallback(async (params: QueryParams) => {
    if (!token) {
      setError('인증이 필요합니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let recordsPromise: Promise<any[]>;
      let countPromise: Promise<number>;
      let clientIpGroupPromise: Promise<any[]>;
      let alertTypeGroupPromise: Promise<any[]>;

      switch (selectedTable) {
        case 'certified_2_time':
          recordsPromise = dbApiService.getCertified2TimeRecords(params);
          countPromise = dbApiService.getCertified2TimeCount(params);
          clientIpGroupPromise = dbApiService.getCertified2TimeGroupByClientIp(params);
          alertTypeGroupPromise = dbApiService.getCertified2TimeGroupByAlertType(params);
          break;
        case 'certified_not_move':
          recordsPromise = dbApiService.getCertifiedNotMoveRecords(params);
          countPromise = dbApiService.getCertifiedNotMoveCount(params);
          clientIpGroupPromise = dbApiService.getCertifiedNotMoveGroupByClientIp(params);
          alertTypeGroupPromise = dbApiService.getCertifiedNotMoveGroupByAlertType(params);
          break;
        case 'resource_level_false':
          recordsPromise = dbApiService.getResourceLevelFalseRecords(params);
          countPromise = dbApiService.getResourceLevelFalseCount(params);
          clientIpGroupPromise = Promise.resolve([]);
          alertTypeGroupPromise = Promise.resolve([]);
          break;
        case 'system_level_false':
          recordsPromise = dbApiService.getSystemLevelFalseRecords(params);
          countPromise = dbApiService.getSystemLevelFalseCount(params);
          clientIpGroupPromise = Promise.resolve([]);
          alertTypeGroupPromise = Promise.resolve([]);
          break;
        default:
          throw new Error('지원하지 않는 테이블 타입입니다.');
      }

      // 모든 API 호출을 병렬로 실행
      const [records, count, clientIpGroup, alertTypeGroup] = await Promise.all([
        recordsPromise,
        countPromise,
        clientIpGroupPromise,
        alertTypeGroupPromise
      ]);

      console.log('📊 API 응답 데이터:', {
        recordsCount: records.length,
        totalCount: count,
        clientIpGroupCount: clientIpGroup.length,
        alertTypeGroupCount: alertTypeGroup.length
      });
      
      setData(records);
      setTotalCount(count);
      setGroupByClientIp(clientIpGroup);
      setGroupByAlertType(alertTypeGroup);

    } catch (err) {
      console.error('데이터 조회 오류:', err);
      setError(err instanceof Error ? err.message : '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, token]);

  // 쿼리 파라미터 변경 시 데이터 조회
  const handleQueryChange = useCallback(async (params: QueryParams) => {
    console.log('🔍 handleQueryChange 호출:', params);
    setQueryParams(params);
    await fetchData(params);
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getTableInfo = (tableType: TableType) => {
    switch (tableType) {
      case 'certified_2_time':
        return {
          title: '인증 실패 모니터링',
          description: 'FREQUENT_FAILURES: 10초 내 2회 이상 인증 실패 감지',
          icon: AlertTriangle,
          color: 'bg-yellow-500'
        };
      case 'certified_not_move':
        return {
          title: '의심스러운 활동 감지',
          description: 'INACTIVITY_AFTER_FAILURE: 인증 실패 후 10초간 비활성 상태 감지',
          icon: Activity,
          color: 'bg-purple-500'
        };
      case 'resource_level_false':
        return {
          title: '리소스 레벨 접근 제어',
          description: 'Topic, ConsumerGroup 등 Kafka 리소스별 접근 권한 모니터링',
          icon: Users,
          color: 'bg-orange-500'
        };
      case 'system_level_false':
        return {
          title: '시스템 레벨 접근 제어',
          description: 'SecurityMetadata, 클러스터 설정 등 시스템 레벨 리소스 접근 모니터링',
          icon: Database,
          color: 'bg-red-500'
        };
    }
  };

  const tableOptions: { value: TableType; label: string }[] = [
    { value: 'certified_2_time', label: '인증 실패 모니터링' },
    { value: 'certified_not_move', label: '의심스러운 활동 감지' },
    { value: 'resource_level_false', label: '리소스 레벨 접근 제어' },
    { value: 'system_level_false', label: '시스템 레벨 접근 제어' }
  ];

  const currentTableInfo = getTableInfo(selectedTable);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                대시보드로 돌아가기
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                과거 데이터 이력 조회
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 테이블 선택 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            데이터 테이블 선택
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tableOptions.map((option) => {
              const info = getTableInfo(option.value);
              const IconComponent = info.icon;
              const isSelected = selectedTable === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedTable(option.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${info.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${
                        isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-white'
                      }`}>
                        {option.label}
                      </p>
                      <p className={`text-sm ${
                        isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {info.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 쿼리 빌더 */}
        <QueryBuilder
          onQueryChange={handleQueryChange}
          tableType={selectedTable}
          isLoading={isLoading}
        />

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* 데이터 시각화 */}
        {data.length > 0 && (
          <DataVisualization
            data={data}
            tableType={selectedTable}
            groupByClientIp={groupByClientIp}
            groupByAlertType={groupByAlertType}
            totalCount={totalCount}
          />
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="text-gray-600 dark:text-gray-400">데이터를 조회하는 중...</span>
            </div>
          </div>
        )}

        {/* 데이터 없음 */}
        {!isLoading && data.length === 0 && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              조회된 데이터가 없습니다
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              다른 조회 조건을 시도해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
