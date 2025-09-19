import React from 'react';
// 차트 관련 import 제거
import { 
  GroupCountResult 
} from '../services/dbApiService';
import { parseKoreanTimeString } from '../utils/dateUtils';

interface DataVisualizationProps {
  data: any[];
  tableType: 'certified_2_time' | 'certified_not_move' | 'resource_level_false' | 'system_level_false';
  groupByClientIp?: GroupCountResult[];
  groupByAlertType?: GroupCountResult[];
  totalCount: number;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  data,
  tableType,
  groupByClientIp = [],
  groupByAlertType = [],
  totalCount
}) => {
  // 차트 관련 함수 제거

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // 백엔드에서 전달하는 한국어 형식 시간 문자열을 파싱
    return parseKoreanTimeString(timeString);
  };

  const getTableTitle = () => {
    switch (tableType) {
      case 'certified_2_time':
        return '인증 실패 모니터링 (certified_2_time)';
      case 'certified_not_move':
        return '의심스러운 활동 감지 (certified_not_move)';
      case 'resource_level_false':
        return '리소스 레벨 접근 제어 (resource_level_false)';
      case 'system_level_false':
        return '시스템 레벨 접근 제어 (system_level_false)';
      default:
        return '데이터 조회 결과';
    }
  };

  // 차트 데이터 제거

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 text-white rounded-lg">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 레코드 수</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalCount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 text-white rounded-lg">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">고유 IP 수</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {groupByClientIp.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500 text-white rounded-lg">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">경고 타입 수</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {groupByAlertType.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 text-white rounded-lg">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">평균 시간당</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Math.round(totalCount / 24).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* 데이터 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getTableTitle()} - 상세 데이터
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  IP 주소
                </th>
                {(tableType === 'certified_2_time' || tableType === 'certified_not_move') && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      경고 타입
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      실패 횟수
                    </th>
                  </>
                )}
                {(tableType === 'resource_level_false' || tableType === 'system_level_false') && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      리소스
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      작업
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      허용 여부
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.slice(0, 50).map((record, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatTime(
                      'alertTimeKST' in record ? record.alertTimeKST : 
                      'eventTimeKST' in record ? record.eventTimeKST : 
                      ''
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {record.clientIp}
                  </td>
                  {(tableType === 'certified_2_time' || tableType === 'certified_not_move') && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          {record.alertType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.failureCount}
                      </td>
                    </>
                  )}
                  {(tableType === 'resource_level_false' || tableType === 'system_level_false') && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.principal}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.resourceName} ({record.resourceType})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.operation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.granted 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {record.granted ? '허용' : '거부'}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">조회된 데이터가 없습니다.</p>
            </div>
          )}
          {data.length > 50 && (
            <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              상위 50개 레코드만 표시됩니다. (총 {data.length.toLocaleString()}개)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
