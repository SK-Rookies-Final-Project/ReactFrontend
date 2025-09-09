import React, { useState } from 'react';
import { LogWithMetadata } from '../../types/kafka';
import { formatTimestamp, extractUserInfo, extractIpAddress, getLogLevelColor, getLogLevelBadgeColor } from '../../utils/logUtils';
import { ChevronDown, ChevronRight, User, Globe, Calendar } from 'lucide-react';

interface LogListProps {
  logs: LogWithMetadata[];
  maxHeight?: string;
}

export const LogList: React.FC<LogListProps> = ({ logs, maxHeight = "500px" }) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">로그가 없습니다</p>
          <p className="text-sm">실시간 로그 스트림에 연결하여 데이터를 받아보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          로그 목록 ({logs.length}개)
        </h3>
      </div>
      
      <div 
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <div className="space-y-2 p-4">
          {logs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            const levelColor = getLogLevelColor(log.level);
            const badgeColor = getLogLevelBadgeColor(log.level);
            const user = extractUserInfo(log);
            const ip = extractIpAddress(log);

            return (
              <div
                key={log.id}
                className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${levelColor}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.type === 'auth_success' ? 'bg-green-100 text-green-800' :
                        log.type === 'auth_failed' ? 'bg-red-100 text-red-800' :
                        log.type === 'unauthorized' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{user}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Globe className="h-4 w-4" />
                        <span>{ip}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpanded(log.id)}
                    className="ml-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    aria-label={isExpanded ? '축소' : '확장'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto text-gray-800 dark:text-gray-200">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};