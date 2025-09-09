import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LogWithMetadata, LogLevel } from '../../types/kafka';

interface LogChartProps {
  logs: LogWithMetadata[];
  timeWindow?: number; // minutes
}

export const LogChart: React.FC<LogChartProps> = ({ logs, timeWindow = 60 }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow * 60 * 1000);
    
    // Filter logs within time window
    const recentLogs = logs.filter(log => log.timestamp >= windowStart);
    
    // Create 5-minute intervals
    const intervals = [];
    for (let i = timeWindow; i >= 0; i -= 5) {
      const intervalStart = new Date(now.getTime() - i * 60 * 1000);
      const intervalEnd = new Date(now.getTime() - Math.max(0, i - 5) * 60 * 1000);
      
      const intervalLogs = recentLogs.filter(log => 
        log.timestamp >= intervalStart && log.timestamp < intervalEnd
      );

      const data = {
        time: intervalStart.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        timestamp: intervalStart.getTime(),
        total: intervalLogs.length,
        success: intervalLogs.filter(log => log.level === LogLevel.SUCCESS).length,
        error: intervalLogs.filter(log => log.level === LogLevel.ERROR).length,
        warning: intervalLogs.filter(log => log.level === LogLevel.WARNING).length,
        info: intervalLogs.filter(log => log.level === LogLevel.INFO).length
      };

      intervals.push(data);
    }

    return intervals;
  }, [logs, timeWindow]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          시간별 로그 발생 빈도
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          최근 {timeWindow}분간의 5분 단위 집계
        </p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis className="text-xs" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="success" 
              stroke="#10b981" 
              strokeWidth={2}
              name="성공"
              dot={{ fill: '#10b981', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="error" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="에러"
              dot={{ fill: '#ef4444', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="warning" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="경고"
              dot={{ fill: '#f59e0b', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="info" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="정보"
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};