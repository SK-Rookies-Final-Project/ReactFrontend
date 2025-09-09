import React from 'react';
import { useSSEContext } from '../contexts/SSEContext';
import { useLogFilter } from '../hooks/useLogFilter';
import { LogType } from '../types/kafka';
import { AuthStatisticsCards } from '../components/dashboard/AuthStatisticsCards';
import { LogChart } from '../components/dashboard/LogChart';
import { LogFilter } from '../components/dashboard/LogFilter';
import { LogList } from '../components/dashboard/LogList';
import { ConnectionStatus } from '../components/dashboard/ConnectionStatus';
import { BatchProcessingInfo } from '../components/dashboard/BatchProcessingInfo';
import { SSE_ENDPOINTS } from '../config/api';

export const AuthSuccessPage: React.FC = () => {
  const { 
    getLogsByType, 
    getConnectionStatus, 
    isConnecting, 
    clearLogs,
    getPendingLogsCount
  } = useSSEContext();

  const logs = getLogsByType(LogType.AUTH_SUCCESS);
  const connectionStatus = getConnectionStatus(SSE_ENDPOINTS.AUTH);
  const isConnectingAuth = isConnecting(SSE_ENDPOINTS.AUTH);

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
            로그인 성공 로그
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            인증 성공 이벤트 모니터링
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
        isConnecting={isConnectingAuth}
        endpoint={SSE_ENDPOINTS.AUTH}
        onConnect={() => {}} // 연결은 전역에서 관리
        onDisconnect={() => {}} // 연결은 전역에서 관리
      />

      {/* Batch Processing Info */}
      <BatchProcessingInfo pendingLogsCount={getPendingLogsCount()} />

      {/* Statistics */}
      <AuthStatisticsCards logs={logs} logType={LogType.AUTH_SUCCESS} />

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