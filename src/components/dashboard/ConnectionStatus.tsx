import React from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { ConnectionStatus as ConnectionStatusType } from '../../types/kafka';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  isConnecting: boolean;
  endpoint: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  isConnecting,
  endpoint,
  onConnect,
  onDisconnect
}) => {
  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-600 dark:text-yellow-400';
    if (status.isConnected) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBgColor = () => {
    if (isConnecting) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    if (status.isConnected) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  const getStatusIcon = () => {
    if (isConnecting) return <Loader className="h-5 w-5 animate-spin" />;
    if (status.isConnected) return <CheckCircle className="h-5 w-5" />;
    if (status.error) return <AlertCircle className="h-5 w-5" />;
    return <WifiOff className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (isConnecting) return '연결 중...';
    if (status.isConnected) return '연결됨';
    if (status.error) return `연결 실패: ${status.error}`;
    return '연결 끊김';
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusBgColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              연결 상태
            </h4>
            <p className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {status.lastUpdate && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                마지막 업데이트: {status.lastUpdate.toLocaleTimeString('ko-KR')}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          {status.isConnected ? (
            <button
              onClick={onDisconnect}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
            >
              연결 해제
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 rounded transition-colors"
            >
              {isConnecting ? '연결 중...' : '연결'}
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          엔드포인트: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{endpoint}</code>
        </p>
      </div>
    </div>
  );
};