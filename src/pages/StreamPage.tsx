import React from 'react';
import { useSSEContext } from '../contexts/SSEContext';
import { useLogFilter } from '../hooks/useLogFilter';
import { LogType } from '../types/kafka';
import { StatisticsCards } from '../components/dashboard/StatisticsCards';
import { LogChart } from '../components/dashboard/LogChart';
import { LogFilter } from '../components/dashboard/LogFilter';
import { LogList } from '../components/dashboard/LogList';
import { ConnectionStatus } from '../components/dashboard/ConnectionStatus';
import { BatchProcessingInfo } from '../components/dashboard/BatchProcessingInfo';
import { SSE_ENDPOINTS } from '../config/api';

export const StreamPage: React.FC = () => {
  const { 
    getLogsByType, 
    getConnectionStatus, 
    isConnecting, 
    clearLogs,
    getPendingLogsCount
  } = useSSEContext();

  const logs = getLogsByType(LogType.GENERAL);
  const connectionStatus = getConnectionStatus(SSE_ENDPOINTS.STREAM);
  const isConnectingStream = isConnecting(SSE_ENDPOINTS.STREAM);

  const {
    filters,
    filteredLogs,
    updateFilter,
    resetFilters
  } = useLogFilter(logs);


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            시스템 모니터링 대시보드
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            실시간 시스템 이벤트 및 보안 로그 모니터링
          </p>
        </div>
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          로그 지우기
        </button>
      </div>

      {/* Connection Status */}
      <ConnectionStatus
        status={connectionStatus}
        isConnecting={isConnectingStream}
        endpoint={SSE_ENDPOINTS.STREAM}
        onConnect={() => {}} // 연결은 전역에서 관리
        onDisconnect={() => {}} // 연결은 전역에서 관리
      />

      {/* Batch Processing Info */}
      <BatchProcessingInfo pendingLogsCount={getPendingLogsCount()} />

      {/* Debug Info - 모든 엔드포인트 연결 상태 */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">연결 상태 및 로그 분류 디버그</h3>
        <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
          <p>Stream: {getConnectionStatus(SSE_ENDPOINTS.STREAM).isConnected ? '연결됨' : '연결 안됨'} {getConnectionStatus(SSE_ENDPOINTS.STREAM).error && `(${getConnectionStatus(SSE_ENDPOINTS.STREAM).error})`}</p>
          <p>Auth: {getConnectionStatus(SSE_ENDPOINTS.AUTH).isConnected ? '연결됨' : '연결 안됨'} {getConnectionStatus(SSE_ENDPOINTS.AUTH).error && `(${getConnectionStatus(SSE_ENDPOINTS.AUTH).error})`}</p>
          <p>Auth Failed: {getConnectionStatus(SSE_ENDPOINTS.AUTH_FAILED).isConnected ? '연결됨' : '연결 안됨'} {getConnectionStatus(SSE_ENDPOINTS.AUTH_FAILED).error && `(${getConnectionStatus(SSE_ENDPOINTS.AUTH_FAILED).error})`}</p>
          <p>Unauth: {getConnectionStatus(SSE_ENDPOINTS.UNAUTH).isConnected ? '연결됨' : '연결 안됨'} {getConnectionStatus(SSE_ENDPOINTS.UNAUTH).error && `(${getConnectionStatus(SSE_ENDPOINTS.UNAUTH).error})`}</p>
          <p>Stream URL: {SSE_ENDPOINTS.STREAM}</p>
          <p>Auth URL: {SSE_ENDPOINTS.AUTH}</p>
          <p>Auth Failed URL: {SSE_ENDPOINTS.AUTH_FAILED}</p>
          <p>Unauth URL: {SSE_ENDPOINTS.UNAUTH}</p>
          <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
            <p>분류된 로그 수:</p>
            <p>- 인증 성공: {getLogsByType(LogType.AUTH_SUCCESS).length}개</p>
            <p>- 인증 실패: {getLogsByType(LogType.AUTH_FAILED).length}개</p>
            <p>- 권한 부족: {getLogsByType(LogType.UNAUTHORIZED).length}개</p>
            <p>- 일반 로그: {getLogsByType(LogType.GENERAL).length}개</p>
          </div>
        </div>
      </div>


      {/* Statistics */}
      <StatisticsCards logs={logs} />

      {/* Chart */}
      <LogChart logs={logs} timeWindow={60} />

      {/* Filters */}
      <LogFilter
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
      />

      {/* Log List */}
      <LogList logs={filteredLogs} />
    </div>
  );
};