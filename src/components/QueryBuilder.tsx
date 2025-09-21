import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Search, Filter, X } from 'lucide-react';
import { QueryParams } from '../services/dbApiService';
import { 
  convertDateTimeLocalToBackend, 
  convertBackendToDateTimeLocal, 
  createTimeRange 
} from '../utils/dateUtils';

interface QueryBuilderProps {
  onQueryChange: (params: QueryParams) => void;
  tableType: 'certified_2_time' | 'certified_not_move' | 'resource_level_false' | 'system_level_false';
  isLoading?: boolean;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ 
  onQueryChange, 
  tableType, 
  isLoading = false 
}) => {
  const [params, setParams] = useState<QueryParams>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 기본 시간 범위 설정 (최근 24시간)
  useEffect(() => {
    const defaultRange = createTimeRange(24);
    setParams(defaultRange);
  }, []);

  // 초기 로드 시 자동 호출 제거 - 사용자가 명시적으로 조회 버튼을 클릭할 때만 호출

  const handleInputChange = (field: keyof QueryParams, value: string) => {
    setParams(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const handleDateTimeChange = (field: 'start' | 'end', value: string) => {
    if (value) {
      const backendFormat = convertDateTimeLocalToBackend(value);
      
      setParams(prev => ({
        ...prev,
        [field]: backendFormat
      }));
    } else {
      setParams(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const clearFilters = () => {
    const defaultRange = createTimeRange(24);
    setParams(defaultRange);
  };

  const getQuickTimeRanges = () => [
    { label: '최근 1시간', hours: 1 },
    { label: '최근 6시간', hours: 6 },
    { label: '최근 24시간', hours: 24 },
    { label: '최근 7일', hours: 24 * 7 },
    { label: '최근 30일', hours: 24 * 30 }
  ];

  const applyQuickRange = (hours: number) => {
    const timeRange = createTimeRange(hours);
    setParams(prev => ({
      ...prev,
      ...timeRange
    }));
  };

  // 유틸리티 함수로 대체됨
  // const formatDateTimeLocal = convertBackendToDateTimeLocal;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          조회 조건 설정
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {showAdvanced ? '간단히' : '고급 설정'}
          </button>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 빠른 시간 범위 선택 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          빠른 시간 범위
        </label>
        <div className="flex flex-wrap gap-2">
          {getQuickTimeRanges().map((range) => (
            <button
              key={range.hours}
              onClick={() => applyQuickRange(range.hours)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 기본 시간 범위 설정 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Calendar className="h-4 w-4 inline mr-1" />
            시작 시간
          </label>
          <input
            type="datetime-local"
            value={convertBackendToDateTimeLocal(params.start)}
            onChange={(e) => handleDateTimeChange('start', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Calendar className="h-4 w-4 inline mr-1" />
            종료 시간
          </label>
          <input
            type="datetime-local"
            value={convertBackendToDateTimeLocal(params.end)}
            onChange={(e) => handleDateTimeChange('end', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* 고급 설정 */}
      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                클라이언트 IP
              </label>
              <input
                type="text"
                value={params.clientIp || ''}
                onChange={(e) => handleInputChange('clientIp', e.target.value)}
                placeholder="예: 192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {(tableType === 'certified_2_time' || tableType === 'certified_not_move') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  경고 타입
                </label>
                <select
                  value={params.alert_type || ''}
                  onChange={(e) => handleInputChange('alert_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">전체</option>
                  <option value="FREQUENT_FAILURES">FREQUENT_FAILURES</option>
                  <option value="INACTIVITY_AFTER_FAILURE">INACTIVITY_AFTER_FAILURE</option>
                </select>
              </div>
            )}
            
            {(tableType === 'resource_level_false' || tableType === 'system_level_false') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    계정명
                  </label>
                  <input
                    type="text"
                    value={params.principal || ''}
                    onChange={(e) => handleInputChange('principal', e.target.value)}
                    placeholder="예: User:admin"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    리소스 이름
                  </label>
                  <input
                    type="text"
                    value={params.resource_name || ''}
                    onChange={(e) => handleInputChange('resource_name', e.target.value)}
                    placeholder="예: audit-topic"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    작업 유형
                  </label>
                  <input
                    type="text"
                    value={params.operation || ''}
                    onChange={(e) => handleInputChange('operation', e.target.value)}
                    placeholder="예: Read, Write, Describe"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 조회 버튼 */}
      <div className="flex justify-end mt-4">
        <button
          onClick={() => {
            onQueryChange(params);
          }}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md transition-colors"
        >
          {isLoading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              조회 중...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              데이터 조회
            </>
          )}
        </button>
      </div>
    </div>
  );
};
