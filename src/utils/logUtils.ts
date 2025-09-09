import { LogEntry, LogType, LogLevel, AuthLog, UnauthorizedLog, KafkaAuditLog } from '../types/kafka';

export const generateLogId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const parseLogEntry = (data: any): LogEntry => {
  return data as LogEntry;
};

export const determineLogType = (log: LogEntry): LogType => {
  if ('status' in log) {
    return log.status === '200' ? LogType.AUTH_SUCCESS : LogType.AUTH_FAILED;
  }
  if ('granted' in log && log.granted === false) {
    return LogType.UNAUTHORIZED;
  }
  return LogType.GENERAL;
};

export const determineLogLevel = (log: LogEntry, type: LogType): LogLevel => {
  switch (type) {
    case LogType.AUTH_SUCCESS:
      return LogLevel.SUCCESS;
    case LogType.AUTH_FAILED:
    case LogType.UNAUTHORIZED:
      return LogLevel.ERROR;
    case LogType.GENERAL:
      if ('data' in log && log.data?.authorizationInfo?.granted === false) {
        return LogLevel.WARNING;
      }
      return LogLevel.INFO;
    default:
      return LogLevel.INFO;
  }
};

export const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleString();
};

export const extractUserInfo = (log: LogEntry): string => {
  if ('user' in log) return log.user;
  if ('principal' in log) return log.principal;
  if ('data' in log && log.data?.authenticationInfo?.principal) {
    return log.data.authenticationInfo.principal;
  }
  return 'Unknown';
};

export const extractIpAddress = (log: LogEntry): string => {
  if ('remote_addr' in log) return log.remote_addr;
  if ('clientIp' in log) return log.clientIp;
  if ('data' in log && log.data?.clientAddress?.[0]?.ip) {
    return log.data.clientAddress[0].ip;
  }
  return 'Unknown';
};

export const getLogLevelColor = (level: LogLevel): string => {
  switch (level) {
    case LogLevel.SUCCESS:
      return 'text-green-600 bg-green-50 border-green-200';
    case LogLevel.ERROR:
      return 'text-red-600 bg-red-50 border-red-200';
    case LogLevel.WARNING:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case LogLevel.INFO:
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getLogLevelBadgeColor = (level: LogLevel): string => {
  switch (level) {
    case LogLevel.SUCCESS:
      return 'bg-green-100 text-green-800';
    case LogLevel.ERROR:
      return 'bg-red-100 text-red-800';
    case LogLevel.WARNING:
      return 'bg-yellow-100 text-yellow-800';
    case LogLevel.INFO:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};