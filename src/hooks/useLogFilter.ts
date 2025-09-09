import { useState, useMemo } from 'react';
import { LogWithMetadata, LogType, LogLevel } from '../types/kafka';

export interface FilterOptions {
  searchTerm: string;
  logTypes: LogType[];
  logLevels: LogLevel[];
  timeRange: number; // minutes
  userFilter: string;
  ipFilter: string;
}

const DEFAULT_FILTERS: FilterOptions = {
  searchTerm: '',
  logTypes: Object.values(LogType),
  logLevels: Object.values(LogLevel),
  timeRange: 0, // 0 means no time filter
  userFilter: '',
  ipFilter: ''
};

export const useLogFilter = (logs: LogWithMetadata[]) => {
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchLower)
      );
    }

    // Log type filter
    if (filters.logTypes.length < Object.values(LogType).length) {
      filtered = filtered.filter(log => filters.logTypes.includes(log.type));
    }

    // Log level filter
    if (filters.logLevels.length < Object.values(LogLevel).length) {
      filtered = filtered.filter(log => filters.logLevels.includes(log.level));
    }

    // Time range filter
    if (filters.timeRange > 0) {
      const cutoffTime = new Date(Date.now() - filters.timeRange * 60 * 1000);
      filtered = filtered.filter(log => log.timestamp >= cutoffTime);
    }

    // User filter
    if (filters.userFilter) {
      const userLower = filters.userFilter.toLowerCase();
      filtered = filtered.filter(log => {
        const logStr = JSON.stringify(log).toLowerCase();
        return logStr.includes(`"user":"${userLower}"`) || 
               logStr.includes(`"principal":"user:${userLower}"`);
      });
    }

    // IP filter
    if (filters.ipFilter) {
      const ipFilter = filters.ipFilter.toLowerCase();
      filtered = filtered.filter(log => {
        const logStr = JSON.stringify(log).toLowerCase();
        return logStr.includes(`"remote_addr":"${ipFilter}"`) || 
               logStr.includes(`"clientip":"${ipFilter}"`) ||
               logStr.includes(`"ip":"${ipFilter}"`);
      });
    }

    return filtered;
  }, [logs, filters]);

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    filteredLogs,
    updateFilter,
    resetFilters
  };
};