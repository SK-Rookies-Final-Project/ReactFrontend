import React, { useMemo } from 'react';
import { Activity, Server, AlertTriangle, Clock, Database } from 'lucide-react';
import { LogWithMetadata, LogLevel, LogType } from '../../types/kafka';

interface StatisticsCardsProps {
  logs: LogWithMetadata[];
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ logs }) => {
  const stats = useMemo(() => {
    const totalEvents = logs.length;
    const errorEvents = logs.filter(log => log.level === LogLevel.ERROR).length;
    const warningEvents = logs.filter(log => log.level === LogLevel.WARNING).length;
    const infoEvents = logs.filter(log => log.level === LogLevel.INFO).length;
    
    // Extract unique IP addresses
    const ips = new Set<string>();
    logs.forEach(log => {
      if ('remote_addr' in log && log.remote_addr) ips.add(log.remote_addr);
      if ('clientip' in log && log.clientip) ips.add(log.clientip);
      if ('ip' in log && log.ip) ips.add(log.ip);
    });

    // Calculate events per minute (last 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentEvents = logs.filter(log => log.timestamp >= fiveMinutesAgo).length;
    const eventsPerMinute = recentEvents / 5;

    const errorRate = totalEvents > 0 ? ((errorEvents / totalEvents) * 100) : 0;

    return {
      totalEvents,
      errorEvents,
      warningEvents,
      infoEvents,
      uniqueIPs: ips.size,
      eventsPerMinute,
      errorRate
    };
  }, [logs]);

  const cards = [
    {
      title: '총 이벤트',
      value: stats.totalEvents.toLocaleString(),
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: '에러 이벤트',
      value: stats.errorEvents.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      subtitle: `에러율 ${stats.errorRate.toFixed(1)}%`
    },
    {
      title: '경고 이벤트',
      value: stats.warningEvents.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800'
    },
    {
      title: '고유 IP',
      value: stats.uniqueIPs.toLocaleString(),
      icon: Server,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: '이벤트/분',
      value: stats.eventsPerMinute.toFixed(1),
      icon: Clock,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      subtitle: '최근 5분 평균'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`${card.bgColor} ${card.borderColor} border rounded-lg p-4 transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.color}`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <Icon className={`h-8 w-8 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};