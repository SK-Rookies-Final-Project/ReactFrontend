import React, { useMemo } from 'react';
import { Shield, ShieldX, Users, Clock, AlertTriangle } from 'lucide-react';
import { LogWithMetadata, LogLevel, LogType } from '../../types/kafka';

interface AuthStatisticsCardsProps {
  logs: LogWithMetadata[];
  logType: LogType;
}

export const AuthStatisticsCards: React.FC<AuthStatisticsCardsProps> = ({ logs, logType }) => {
  const stats = useMemo(() => {
    const totalEvents = logs.length;
    const errorEvents = logs.filter(log => log.level === LogLevel.ERROR).length;
    const warningEvents = logs.filter(log => log.level === LogLevel.WARNING).length;
    const infoEvents = logs.filter(log => log.level === LogLevel.INFO).length;
    
    // Extract unique users
    const users = new Set<string>();
    logs.forEach(log => {
      if ('user' in log && log.user) users.add(log.user);
      if ('principal' in log && log.principal) users.add(log.principal);
      if ('data' in log && log.data?.authenticationInfo?.principal) {
        users.add(log.data.authenticationInfo.principal);
      }
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
      uniqueUsers: users.size,
      eventsPerMinute,
      errorRate
    };
  }, [logs]);

  const getCardsForType = (type: LogType) => {
    switch (type) {
      case LogType.AUTH_SUCCESS:
        return [
          {
            title: '총 성공 이벤트',
            value: stats.totalEvents.toLocaleString(),
            icon: Shield,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800'
          },
          {
            title: '고유 사용자',
            value: stats.uniqueUsers.toLocaleString(),
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800'
          },
          {
            title: '이벤트/분',
            value: stats.eventsPerMinute.toFixed(1),
            icon: Clock,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            borderColor: 'border-purple-200 dark:border-purple-800',
            subtitle: '최근 5분 평균'
          }
        ];
      
      case LogType.AUTH_FAILED:
        return [
          {
            title: '총 실패 이벤트',
            value: stats.totalEvents.toLocaleString(),
            icon: ShieldX,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800'
          },
          {
            title: '고유 사용자',
            value: stats.uniqueUsers.toLocaleString(),
            icon: Users,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            borderColor: 'border-orange-200 dark:border-orange-800'
          },
          {
            title: '이벤트/분',
            value: stats.eventsPerMinute.toFixed(1),
            icon: Clock,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
            subtitle: '최근 5분 평균'
          }
        ];
      
      case LogType.UNAUTHORIZED:
        return [
          {
            title: '총 권한 부족 이벤트',
            value: stats.totalEvents.toLocaleString(),
            icon: AlertTriangle,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            borderColor: 'border-orange-200 dark:border-orange-800'
          },
          {
            title: '고유 사용자',
            value: stats.uniqueUsers.toLocaleString(),
            icon: Users,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800'
          },
          {
            title: '이벤트/분',
            value: stats.eventsPerMinute.toFixed(1),
            icon: Clock,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            borderColor: 'border-orange-200 dark:border-orange-800',
            subtitle: '최근 5분 평균'
          }
        ];
      
      default:
        return [];
    }
  };

  const cards = getCardsForType(logType);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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


