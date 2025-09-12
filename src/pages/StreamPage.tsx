import React from 'react';
import { useSSEContext } from '../contexts/SSEContext';
import { useLogFilter } from '../hooks/useLogFilter';
import { LogType } from '../types/kafka';
import { StatisticsCards } from '../components/dashboard/StatisticsCards';
import { LogChart } from '../components/dashboard/LogChart';
import { LogFilter } from '../components/dashboard/LogFilter';
import { LogList } from '../components/dashboard/LogList';
import { BatchProcessingInfo } from '../components/dashboard/BatchProcessingInfo';

export const StreamPage: React.FC = () => {
  const { 
    getLogsByType, 
    clearLogs,
    getPendingLogsCount
  } = useSSEContext();

  const logs = getLogsByType(LogType.GENERAL);

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
            시스템 레벨 비인가 접근 감지
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            시스템 권한 부족으로 인한 비인가 접근 시도 모니터링
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