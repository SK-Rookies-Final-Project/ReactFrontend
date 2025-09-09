import { useState, useEffect, useCallback, useRef } from 'react';
import { LogEntry, LogWithMetadata, LogType, ConnectionStatus } from '../types/kafka';
import { generateLogId, determineLogLevel } from '../utils/logUtils';
import { SSE_ENDPOINTS } from '../config/api';

const RECONNECT_INTERVAL = 5000;
const RENDER_BATCH_INTERVAL = parseInt(import.meta.env.VITE_RENDER_BATCH_INTERVAL || '5000', 10);

// 로그 타입을 분류하는 함수
const classifyLogType = (data: any): LogType => {
  // Kafka 감사 로그 분석
  if (data.type === 'io.confluent.kafka.server/authorization') {
    const authInfo = data.data?.authenticationInfo;
    const authzInfo = data.data?.authorizationInfo;
    
    // 인증 성공 (granted: true)
    if (authzInfo?.granted === true) {
      return LogType.AUTH_SUCCESS;
    }
    
    // 인증 실패 (granted: false)
    if (authzInfo?.granted === false) {
      return LogType.AUTH_FAILED;
    }
    
    // 권한 부족 (인증은 되었지만 권한이 없음)
    if (authInfo?.principal && authzInfo?.granted === false) {
      return LogType.UNAUTHORIZED;
    }
  }
  
  // 기본적으로 일반 로그로 분류
  return LogType.GENERAL;
};

// 엔드포인트별 이벤트 이름 반환
const getEventNameForEndpoint = (endpoint: string): string => {
  if (endpoint.includes('/stream')) return 'streams';
  if (endpoint.includes('/auth') && !endpoint.includes('_failed') && !endpoint.includes('unauth')) return 'auth';
  if (endpoint.includes('/auth_failed')) return 'auth_failed';
  if (endpoint.includes('/unauth')) return 'unauth';
  return 'streams'; // 기본값
};

interface GlobalSSEState {
  logs: LogWithMetadata[];
  connectionStatus: Record<string, ConnectionStatus>;
  isConnecting: Record<string, boolean>;
}

interface PendingLog {
  rawLog: LogEntry;
  logType: LogType;
  timestamp: number;
}

export const useGlobalSSE = () => {
  const [state, setState] = useState<GlobalSSEState>({
    logs: [],
    connectionStatus: {},
    isConnecting: {}
  });

  const eventSourcesRef = useRef<Record<string, EventSource | null>>({});
  const reconnectTimeoutsRef = useRef<Record<string, number | null>>({});
  const pendingLogsRef = useRef<PendingLog[]>([]);
  const batchTimeoutRef = useRef<number | null>(null);

  // 배치로 로그를 처리하는 함수
  const processBatchLogs = useCallback(() => {
    if (pendingLogsRef.current.length === 0) return;

    const logsToProcess = [...pendingLogsRef.current];
    pendingLogsRef.current = [];

    const processedLogs: LogWithMetadata[] = logsToProcess.map(({ rawLog, logType }) => ({
      ...rawLog,
      id: generateLogId(),
      timestamp: new Date(),
      type: logType,
      level: determineLogLevel(rawLog, logType)
    }));

    setState(prev => ({
      ...prev,
      logs: [...processedLogs, ...prev.logs]
    }));
  }, []);

  // 배치 타이머를 설정하는 함수
  const scheduleBatchUpdate = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    batchTimeoutRef.current = setTimeout(() => {
      processBatchLogs();
      batchTimeoutRef.current = null;
    }, RENDER_BATCH_INTERVAL);
  }, [processBatchLogs]);

  // 즉시 로그를 추가하는 함수 (배치 처리)
  const addLog = useCallback((rawLog: LogEntry, logType: LogType) => {
    pendingLogsRef.current.push({
      rawLog,
      logType,
      timestamp: Date.now()
    });

    // 첫 번째 로그이거나 배치 타이머가 없으면 타이머 설정
    if (pendingLogsRef.current.length === 1 || !batchTimeoutRef.current) {
      scheduleBatchUpdate();
    }
  }, [scheduleBatchUpdate]);

  const connectToEndpoint = useCallback((endpoint: string, logType: LogType) => {
    // 이미 연결되어 있으면 재연결하지 않음
    if (eventSourcesRef.current[endpoint]) {
      console.log(`[GlobalSSE] Already connected to ${endpoint}, skipping...`);
      return;
    }

    console.log(`[GlobalSSE] Connecting to ${endpoint} for ${logType}`);
    
    setState(prev => ({
      ...prev,
      isConnecting: { ...prev.isConnecting, [endpoint]: true },
      connectionStatus: {
        ...prev.connectionStatus,
        [endpoint]: { ...prev.connectionStatus[endpoint], error: null }
      }
    }));

    const eventSource = new EventSource(endpoint);
    eventSourcesRef.current[endpoint] = eventSource;

    eventSource.onopen = () => {
      console.log(`[GlobalSSE] Connected to ${endpoint} for ${logType}`);
      setState(prev => ({
        ...prev,
        isConnecting: { ...prev.isConnecting, [endpoint]: false },
        connectionStatus: {
          ...prev.connectionStatus,
          [endpoint]: {
            isConnected: true,
            lastUpdate: new Date(),
            error: null
          }
        }
      }));
    };

    eventSource.onmessage = (event) => {
      console.log(`[GlobalSSE] Received message from ${endpoint}:`, event.data);
      try {
        const data = JSON.parse(event.data);
        console.log(`[GlobalSSE] Parsed data for ${logType}:`, data);
        addLog(data, logType);
      } catch (error) {
        console.error(`[GlobalSSE] Error parsing data from ${endpoint}:`, error);
        setState(prev => ({
          ...prev,
          connectionStatus: {
            ...prev.connectionStatus,
            [endpoint]: {
              ...prev.connectionStatus[endpoint],
              error: 'Failed to parse log data'
            }
          }
        }));
      }
    };

    // Handle custom event types based on endpoint
    const eventName = getEventNameForEndpoint(endpoint);
    eventSource.addEventListener(eventName, (event) => {
      console.log(`[GlobalSSE] Received ${eventName} event from ${endpoint}:`, event.data);
      try {
        const data = JSON.parse(event.data);
        console.log(`[GlobalSSE] Parsed ${eventName} data for ${logType}:`, data);
        addLog(data, logType);
      } catch (error) {
        console.error(`[GlobalSSE] Error parsing ${eventName} data from ${endpoint}:`, error);
        setState(prev => ({
          ...prev,
          connectionStatus: {
            ...prev.connectionStatus,
            [endpoint]: {
              ...prev.connectionStatus[endpoint],
              error: `Failed to parse ${eventName} data`
            }
          }
        }));
      }
    });

    eventSource.onerror = (error) => {
      console.error(`[GlobalSSE] Connection error for ${endpoint}:`, error);
      setState(prev => ({
        ...prev,
        isConnecting: { ...prev.isConnecting, [endpoint]: false },
        connectionStatus: {
          ...prev.connectionStatus,
          [endpoint]: {
            isConnected: false,
            lastUpdate: prev.connectionStatus[endpoint]?.lastUpdate || null,
            error: 'Connection lost'
          }
        }
      }));

      eventSource.close();
      eventSourcesRef.current[endpoint] = null;
      
      // Auto reconnect
      if (reconnectTimeoutsRef.current[endpoint]) {
        clearTimeout(reconnectTimeoutsRef.current[endpoint]!);
      }
      
      reconnectTimeoutsRef.current[endpoint] = setTimeout(() => {
        console.log(`[GlobalSSE] Attempting to reconnect to ${endpoint}...`);
        connectToEndpoint(endpoint, logType);
      }, RECONNECT_INTERVAL);
    };
  }, [addLog]);

  const disconnectFromEndpoint = useCallback((endpoint: string) => {
    if (eventSourcesRef.current[endpoint]) {
      eventSourcesRef.current[endpoint]!.close();
      eventSourcesRef.current[endpoint] = null;
    }
    
    if (reconnectTimeoutsRef.current[endpoint]) {
      clearTimeout(reconnectTimeoutsRef.current[endpoint]!);
      reconnectTimeoutsRef.current[endpoint] = null;
    }

    setState(prev => ({
      ...prev,
      connectionStatus: {
        ...prev.connectionStatus,
        [endpoint]: {
          isConnected: false,
          lastUpdate: null,
          error: null
        }
      },
      isConnecting: { ...prev.isConnecting, [endpoint]: false }
    }));
  }, []);

  const clearLogs = useCallback(() => {
    // 대기 중인 로그도 모두 제거
    pendingLogsRef.current = [];
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  const getLogsByType = useCallback((logType: LogType) => {
    return state.logs.filter(log => log.type === logType);
  }, [state.logs]);

  const getConnectionStatus = useCallback((endpoint: string) => {
    return state.connectionStatus[endpoint] || {
      isConnected: false,
      lastUpdate: null,
      error: null
    };
  }, [state.connectionStatus]);

  const isConnecting = useCallback((endpoint: string) => {
    return state.isConnecting[endpoint] || false;
  }, [state.isConnecting]);

  const getPendingLogsCount = useCallback(() => {
    return pendingLogsRef.current.length;
  }, []);

  // Initialize all connections on mount
  useEffect(() => {
    const endpoints = [
      { url: SSE_ENDPOINTS.STREAM, type: LogType.GENERAL },
      { url: SSE_ENDPOINTS.AUTH, type: LogType.AUTH_SUCCESS },
      { url: SSE_ENDPOINTS.AUTH_FAILED, type: LogType.AUTH_FAILED },
      { url: SSE_ENDPOINTS.UNAUTH, type: LogType.UNAUTHORIZED }
    ];

    endpoints.forEach(({ url, type }) => {
      connectToEndpoint(url, type);
    });

    // Cleanup on unmount
    return () => {
      Object.keys(eventSourcesRef.current).forEach(endpoint => {
        disconnectFromEndpoint(endpoint);
      });
      
      // 배치 타이머 정리
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
    };
  }, [connectToEndpoint, disconnectFromEndpoint]);

  return {
    allLogs: state.logs,
    getLogsByType,
    getConnectionStatus,
    isConnecting,
    clearLogs,
    connectToEndpoint,
    disconnectFromEndpoint,
    getPendingLogsCount
  };
};
