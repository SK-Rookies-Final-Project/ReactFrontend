import React from 'react';
import { Search, Filter, X, Clock, User, Globe } from 'lucide-react';
import { FilterOptions } from '../../hooks/useLogFilter';
import { LogType, LogLevel } from '../../types/kafka';

interface LogFilterProps {
  filters: FilterOptions;
  onFilterChange: (key: keyof FilterOptions, value: any) => void;
  onReset: () => void;
}

export const LogFilter: React.FC<LogFilterProps> = ({ filters, onFilterChange, onReset }) => {
  const logTypeOptions = [
    { value: LogType.GENERAL, label: '시스템 로그', color: 'text-blue-600' },
    { value: LogType.AUTH_SUCCESS, label: '인증 성공', color: 'text-green-600' },
    { value: LogType.AUTH_FAILED, label: '인증 실패', color: 'text-red-600' },
    { value: LogType.UNAUTHORIZED, label: '권한 부족', color: 'text-orange-600' }
  ];

  const logLevelOptions = [
    { value: LogLevel.SUCCESS, label: '성공', color: 'text-green-600' },
    { value: LogLevel.ERROR, label: '에러', color: 'text-red-600' },
    { value: LogLevel.WARNING, label: '경고', color: 'text-yellow-600' },
    { value: LogLevel.INFO, label: '정보', color: 'text-blue-600' }
  ];

  const timeRangeOptions = [
    { value: 0, label: '전체 시간' },
    { value: 5, label: '최근 5분' },
    { value: 15, label: '최근 15분' },
    { value: 30, label: '최근 30분' },
    { value: 60, label: '최근 1시간' },
    { value: 180, label: '최근 3시간' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">필터</h3>
        </div>
        <button
          onClick={onReset}
          className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
          <span>초기화</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Search className="h-4 w-4 inline mr-1" />
            검색
          </label>
          <input
            type="text"
            value={filters.searchTerm}
            onChange={(e) => onFilterChange('searchTerm', e.target.value)}
            placeholder="로그 내용 검색..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            사용자
          </label>
          <input
            type="text"
            value={filters.userFilter}
            onChange={(e) => onFilterChange('userFilter', e.target.value)}
            placeholder="사용자 이름..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* IP Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Globe className="h-4 w-4 inline mr-1" />
            IP 주소
          </label>
          <input
            type="text"
            value={filters.ipFilter}
            onChange={(e) => onFilterChange('ipFilter', e.target.value)}
            placeholder="IP 주소..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            시간 범위
          </label>
          <select
            value={filters.timeRange}
            onChange={(e) => onFilterChange('timeRange', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Log Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            로그 타입
          </label>
          <div className="space-y-1">
            {logTypeOptions.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.logTypes.includes(option.value)}
                  onChange={(e) => {
                    const newTypes = e.target.checked
                      ? [...filters.logTypes, option.value]
                      : filters.logTypes.filter(t => t !== option.value);
                    onFilterChange('logTypes', newTypes);
                  }}
                  className="mr-2"
                />
                <span className={`text-sm ${option.color}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Log Levels */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            로그 레벨
          </label>
          <div className="space-y-1">
            {logLevelOptions.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.logLevels.includes(option.value)}
                  onChange={(e) => {
                    const newLevels = e.target.checked
                      ? [...filters.logLevels, option.value]
                      : filters.logLevels.filter(l => l !== option.value);
                    onFilterChange('logLevels', newLevels);
                  }}
                  className="mr-2"
                />
                <span className={`text-sm ${option.color}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};