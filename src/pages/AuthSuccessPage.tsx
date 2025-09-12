import React from 'react';
import { useSSEContext } from '../contexts/SSEContext';
import { useLogFilter } from '../hooks/useLogFilter';
import { LogType } from '../types/kafka';
import { AuthStatisticsCards } from '../components/dashboard/AuthStatisticsCards';
import { LogChart } from '../components/dashboard/LogChart';
import { LogFilter } from '../components/dashboard/LogFilter';
import { LogList } from '../components/dashboard/LogList';
import { BatchProcessingInfo } from '../components/dashboard/BatchProcessingInfo';

export const AuthSuccessPage: React.FC = () => {
  const { 
    getLogsByType, 
    clearLogs,
    getPendingLogsCount
  } = useSSEContext();

  const logs = getLogsByType(LogType.AUTH_SUCCESS);

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
            의심스러운 로그인 시도 감지
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            의심스러운 로그인 시도 행위 모니터링
          </p>
        </div>
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          로그 지우기
        </button>
      </div>


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