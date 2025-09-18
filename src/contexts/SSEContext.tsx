import React, { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_CONFIG } from '../config/api';
import { 
  AuthSystemEvent, 
  AuthResourceEvent, 
  AuthFailureEvent, 
  AuthSuspiciousEvent, 
  StandardSSEEvent,
  ChartDataPoint 
} from '../types';

interface SSEContextType {
  isConnected: boolean;
  data: {
    authSystem: AuthSystemEvent[];
    authResource: AuthResourceEvent[];
    authFailure: AuthFailureEvent[];
    authSuspicious: AuthSuspiciousEvent[];
  };
  chartData: {
    authSystem: ChartDataPoint[];
    authResource: ChartDataPoint[];
    authFailure: ChartDataPoint[];
    authSuspicious: ChartDataPoint[];
  };
  connect: () => void;
  forceDisconnect: () => void;
  generateDummyData: () => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

interface SSEProviderProps {
  children: ReactNode;
}

export const SSEProvider: React.FC<SSEProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState({
    authSystem: [] as AuthSystemEvent[],
    authResource: [] as AuthResourceEvent[],
    authFailure: [] as AuthFailureEvent[],
    authSuspicious: [] as AuthSuspiciousEvent[]
  });
  const [chartData, setChartData] = useState({
    authSystem: [] as ChartDataPoint[],
    authResource: [] as ChartDataPoint[],
    authFailure: [] as ChartDataPoint[],
    authSuspicious: [] as ChartDataPoint[]
  });

  // 배치 업데이트를 위한 임시 데이터 저장소
  const batchDataRef = useRef({
    authSystem: [] as AuthSystemEvent[],
    authResource: [] as AuthResourceEvent[],
    authFailure: [] as AuthFailureEvent[],
    authSuspicious: [] as AuthSuspiciousEvent[]
  });

  // SSE 연결 참조 (AbortController)
  const connectionsRef = useRef<{
    authSystem: AbortController | null;
    authResource: AbortController | null;
    authFailure: AbortController | null;
    authSuspicious: AbortController | null;
  }>({
    authSystem: null,
    authResource: null,
    authFailure: null,
    authSuspicious: null
  });

  // 5초 주기 배치 업데이트 타이머
  const batchUpdateTimerRef = useRef<number | null>(null);

  // 이벤트 파싱 함수
  const parseSSEEvent = (eventType: string, rawMessage: string): AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent | null => {
    try {
      const parsed = JSON.parse(rawMessage);
      
      switch (eventType) {
        case 'auth_system':
          return parsed as AuthSystemEvent;
        case 'auth_resource':
          return parsed as AuthResourceEvent;
        case 'auth_failure':
          return parsed as AuthFailureEvent;
        case 'auth_suspicious':
          return parsed as AuthSuspiciousEvent;
        default:
          console.warn('알 수 없는 이벤트 타입:', eventType);
          return null;
      }
    } catch (error) {
      console.error('SSE 이벤트 파싱 오류:', error, rawMessage);
      return null;
    }
  };

  // 차트 데이터 업데이트 함수
  const updateChartData = useCallback((eventType: string) => {
    const now = new Date();
    const timeKey = now.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const timestamp = now.getTime();

    setChartData(prev => {
      const newChartData = { ...prev };
      const eventTypeKey = eventType as keyof typeof prev;
      
      if (newChartData[eventTypeKey]) {
        // 기존 데이터에서 같은 시간대 항목 찾기
        const existingIndex = newChartData[eventTypeKey].findIndex(
          item => item.time === timeKey
        );
        
        if (existingIndex >= 0) {
          // 기존 시간대 데이터 업데이트
          newChartData[eventTypeKey][existingIndex] = {
            time: timeKey,
            count: newChartData[eventTypeKey][existingIndex].count + 1,
            timestamp
          };
        } else {
          // 새로운 시간대 데이터 추가
          newChartData[eventTypeKey].push({
            time: timeKey,
            count: 1,
            timestamp
          });
        }
        
        // 최근 1시간 데이터만 유지 (60개 항목)
        if (newChartData[eventTypeKey].length > 60) {
          newChartData[eventTypeKey] = newChartData[eventTypeKey].slice(-60);
        }
      }
      
      return newChartData;
    });
  }, []);

  // 배치 업데이트 실행 함수
  const executeBatchUpdate = useCallback(() => {
    console.log('📊 배치 업데이트 실행');
    
    setData(prev => {
      const newData = { ...prev };
      
      // 배치 데이터를 실제 데이터에 추가
      if (batchDataRef.current.authSystem.length > 0) {
        newData.authSystem = [...newData.authSystem, ...batchDataRef.current.authSystem];
        if (newData.authSystem.length > 1000) {
          newData.authSystem = newData.authSystem.slice(-1000);
        }
      }
      
      if (batchDataRef.current.authResource.length > 0) {
        newData.authResource = [...newData.authResource, ...batchDataRef.current.authResource];
        if (newData.authResource.length > 1000) {
          newData.authResource = newData.authResource.slice(-1000);
        }
      }
      
      if (batchDataRef.current.authFailure.length > 0) {
        newData.authFailure = [...newData.authFailure, ...batchDataRef.current.authFailure];
        if (newData.authFailure.length > 1000) {
          newData.authFailure = newData.authFailure.slice(-1000);
        }
      }
      
      if (batchDataRef.current.authSuspicious.length > 0) {
        newData.authSuspicious = [...newData.authSuspicious, ...batchDataRef.current.authSuspicious];
        if (newData.authSuspicious.length > 1000) {
          newData.authSuspicious = newData.authSuspicious.slice(-1000);
        }
      }
      
      return newData;
    });
    
    // 배치 데이터 초기화
    batchDataRef.current = {
      authSystem: [],
      authResource: [],
      authFailure: [],
      authSuspicious: []
    };
  }, []);

  // fetch를 사용한 SSE 연결 생성 함수
  const createSSEConnection = useCallback((endpoint: string, eventType: string): AbortController | null => {
    if (!token) {
      console.error('JWT 토큰이 없습니다.');
      return null;
    }

    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    console.log(`🔗 SSE 연결 생성: ${url}`);

    const abortController = new AbortController();
    
    const startSSEConnection = async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✅ SSE 연결 성공: ${eventType}`);
        setIsConnected(true);

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body reader not available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`🔌 SSE 연결 종료: ${eventType}`);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                console.log(`🔌 SSE 스트림 완료: ${eventType}`);
                return;
              }

              try {
                const sseEvent: StandardSSEEvent = JSON.parse(data);
                const parsedEvent = parseSSEEvent(eventType, sseEvent.data.rawMessage);
                
                if (parsedEvent) {
                  // 배치 데이터에 추가
                  if (eventType === 'auth_system') {
                    batchDataRef.current.authSystem.push(parsedEvent as AuthSystemEvent);
                  } else if (eventType === 'auth_resource') {
                    batchDataRef.current.authResource.push(parsedEvent as AuthResourceEvent);
                  } else if (eventType === 'auth_failure') {
                    batchDataRef.current.authFailure.push(parsedEvent as AuthFailureEvent);
                  } else if (eventType === 'auth_suspicious') {
                    batchDataRef.current.authSuspicious.push(parsedEvent as AuthSuspiciousEvent);
                  }
                  
                  // 차트 데이터 즉시 업데이트
                  updateChartData(eventType);
                  
                  console.log(`📨 ${eventType} 이벤트 수신:`, parsedEvent);
                }
              } catch (error) {
                console.error('SSE 메시지 처리 오류:', error, data);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`🔌 SSE 연결 중단: ${eventType}`);
        } else {
          console.error(`❌ SSE 연결 오류 (${eventType}):`, error);
          setIsConnected(false);
        }
      }
    };

    startSSEConnection();
    return abortController;
  }, [token, updateChartData]);

  // 모든 SSE 연결 시작
  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      console.error('인증되지 않은 사용자입니다.');
      return;
    }

    console.log('🚀 SSE 연결 시작');
    
    // 기존 연결 정리
    Object.values(connectionsRef.current).forEach(controller => {
      if (controller) {
        controller.abort();
      }
    });
    
    connectionsRef.current = {
      authSystem: null,
      authResource: null,
      authFailure: null,
      authSuspicious: null
    };
    
    setIsConnected(false);
    
    if (batchUpdateTimerRef.current) {
      window.clearInterval(batchUpdateTimerRef.current);
      batchUpdateTimerRef.current = null;
    }

    // 4개 엔드포인트에 대한 SSE 연결 생성
    const authSystemController = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_SYSTEM, 'auth_system');
    const authResourceController = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_RESOURCE, 'auth_resource');
    const authFailureController = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_FAILURE, 'auth_failure');
    const authSuspiciousController = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_SUSPICIOUS, 'auth_suspicious');

    if (authSystemController) connectionsRef.current.authSystem = authSystemController;
    if (authResourceController) connectionsRef.current.authResource = authResourceController;
    if (authFailureController) connectionsRef.current.authFailure = authFailureController;
    if (authSuspiciousController) connectionsRef.current.authSuspicious = authSuspiciousController;

    // 배치 업데이트 타이머 시작 (5초 주기)
    if (batchUpdateTimerRef.current) {
      clearInterval(batchUpdateTimerRef.current);
    }
    
    batchUpdateTimerRef.current = window.setInterval(executeBatchUpdate, 5000);
  }, [isAuthenticated, token, executeBatchUpdate, createSSEConnection]);

  // 모든 SSE 연결 종료
  const forceDisconnect = useCallback(() => {
    console.log('🔌 SSE 연결 종료');
    
    Object.values(connectionsRef.current).forEach(controller => {
      if (controller) {
        controller.abort();
      }
    });
    
    connectionsRef.current = {
      authSystem: null,
      authResource: null,
      authFailure: null,
      authSuspicious: null
    };
    
    setIsConnected(false);
    
    if (batchUpdateTimerRef.current) {
      window.clearInterval(batchUpdateTimerRef.current);
      batchUpdateTimerRef.current = null;
    }
  }, []);

  // 더미 데이터 생성 함수
  const generateDummyData = useCallback(() => {
    console.log('🎭 더미 데이터 생성');
    
    const now = new Date();
    const timeString = now.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 더미 시스템 이벤트
    const dummySystemEvent: AuthSystemEvent = {
      id: `system-${Date.now()}`,
      event_time_kst: timeString,
      processing_time_kst: timeString,
      principal: 'test-user',
      client_ip: '192.168.1.100',
      method_name: 'testMethod',
      granted: false,
      resource_type: 'CLUSTER',
      resource_name: 'test-cluster',
      operation: 'READ'
    };

    // 더미 리소스 이벤트
    const dummyResourceEvent: AuthResourceEvent = {
      id: `resource-${Date.now()}`,
      event_time_kst: timeString,
      processing_time_kst: timeString,
      principal: 'test-user',
      client_ip: '192.168.1.101',
      method_name: 'testMethod',
      granted: false,
      resource_type: 'TOPIC',
      resource_name: 'test-topic',
      operation: 'WRITE'
    };

    // 더미 실패 이벤트
    const dummyFailureEvent: AuthFailureEvent = {
      id: `failure-${Date.now()}`,
      client_ip: '192.168.1.102',
      alert_time_kst: timeString,
      alert_type: 'FREQUENT_FAILURES',
      description: '10초 내 2회 이상 인증 실패',
      failure_count: 3
    };

    // 더미 의심 이벤트
    const dummySuspiciousEvent: AuthSuspiciousEvent = {
      id: `suspicious-${Date.now()}`,
      client_ip: '192.168.1.103',
      alert_time_kst: timeString,
      alert_type: 'INACTIVITY_AFTER_FAILURE',
      description: '인증 실패 후 10초간 비활성 상태',
      failure_count: 1
    };

    // 배치 데이터에 추가
    batchDataRef.current.authSystem.push(dummySystemEvent);
    batchDataRef.current.authResource.push(dummyResourceEvent);
    batchDataRef.current.authFailure.push(dummyFailureEvent);
    batchDataRef.current.authSuspicious.push(dummySuspiciousEvent);

    // 차트 데이터 업데이트
    updateChartData('auth_system');
    updateChartData('auth_resource');
    updateChartData('auth_failure');
    updateChartData('auth_suspicious');
  }, [updateChartData]);

  // 컴포넌트 언마운트 시 연결 정리
  useEffect(() => {
    return () => {
      forceDisconnect();
    };
  }, [forceDisconnect]);

  // 인증 상태 변경 시 연결 관리
  useEffect(() => {
    if (!isAuthenticated) {
      forceDisconnect();
    }
  }, [isAuthenticated, forceDisconnect]);

  const value: SSEContextType = {
    isConnected,
    data,
    chartData,
    connect,
    forceDisconnect,
    generateDummyData
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = (): SSEContextType => {
  const context = useContext(SSEContext);
  if (context === undefined) {
    throw new Error('useSSE must be used within an SSEProvider');
  }
  return context;
};
