import { useState, useEffect, useCallback, useRef } from 'react';
import { LogEntry, LogWithMetadata, LogType, ConnectionStatus } from '../types/kafka';
import { generateLogId, determineLogLevel } from '../utils/logUtils';
import { SSE_ENDPOINTS } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const RENDER_BATCH_INTERVAL = parseInt(import.meta.env.VITE_RENDER_BATCH_INTERVAL || '5000', 10);

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
  const { token, isAuthenticated } = useAuth();
  const [state, setState] = useState<GlobalSSEState>({
    logs: [],
    connectionStatus: {},
    isConnecting: {}
  });

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
    // 인증되지 않은 경우 연결하지 않음
    if (!isAuthenticated || !token) {
      return;
    }

    // 이미 연결 중이면 재연결하지 않음
    if (state.isConnecting[endpoint]) {
      return;
    }

    
    setState(prev => ({
      ...prev,
      isConnecting: { ...prev.isConnecting, [endpoint]: true },
      connectionStatus: {
        ...prev.connectionStatus,
        [endpoint]: { ...prev.connectionStatus[endpoint], error: null }
      }
    }));

    // fetch API를 사용하여 헤더에 토큰 포함
    const connectWithFetch = async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 연결 성공 상태 업데이트
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

        // 스트림 읽기
        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsedData = JSON.parse(data);
                    addLog(parsedData, logType);
                  } catch {
                    // 파싱 에러는 무시하고 계속 진행
                  }
                }
              }
            }
          } catch {
            setState(prev => ({
              ...prev,
              connectionStatus: {
                ...prev.connectionStatus,
                [endpoint]: {
                  isConnected: false,
                  lastUpdate: prev.connectionStatus[endpoint]?.lastUpdate || null,
                  error: 'Stream reading failed'
                }
              }
            }));
          }
        };

        readStream();

      } catch (error) {
        setState(prev => ({
          ...prev,
          isConnecting: { ...prev.isConnecting, [endpoint]: false },
          connectionStatus: {
            ...prev.connectionStatus,
            [endpoint]: {
              isConnected: false,
              lastUpdate: prev.connectionStatus[endpoint]?.lastUpdate || null,
              error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }));
      }
    };

    connectWithFetch();
  }, [addLog, isAuthenticated, token, state.isConnecting]);

  const disconnectFromEndpoint = useCallback((endpoint: string) => {
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

  // Initialize all connections when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const endpoints = [
      { url: SSE_ENDPOINTS.AUTH_SYSTEM, type: LogType.GENERAL },
      { url: SSE_ENDPOINTS.AUTH_SUSPICIOUS, type: LogType.AUTH_SUCCESS },
      { url: SSE_ENDPOINTS.AUTH_FAILURE, type: LogType.AUTH_FAILED },
      { url: SSE_ENDPOINTS.AUTH_RESOURCE, type: LogType.UNAUTHORIZED }
    ];

    endpoints.forEach(({ url, type }) => {
      connectToEndpoint(url, type);
    });

    // Cleanup on unmount
    return () => {
      Object.keys(state.connectionStatus).forEach(endpoint => {
        disconnectFromEndpoint(endpoint);
      });
      
      // 배치 타이머 정리
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, token, connectToEndpoint, disconnectFromEndpoint, state.connectionStatus]);

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
