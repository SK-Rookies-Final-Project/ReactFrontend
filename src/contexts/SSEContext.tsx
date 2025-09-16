import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { API_CONFIG } from '../config/api';
import { AuditEvent, ChartData } from '../types';
import { useAuth } from './AuthContext';

interface SSEContextType {
  isConnected: boolean;
  data: {
    authSystem: AuditEvent[];
    authResource: AuditEvent[];
    authFailure: AuditEvent[];
    authSuspicious: AuditEvent[];
  };
  chartData: ChartData;
  connect: () => void;
  disconnect: () => void;
  clearData: () => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

interface SSEProviderProps {
  children: ReactNode;
}

export const SSEProvider: React.FC<SSEProviderProps> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [abortControllers, setAbortControllers] = useState<AbortController[]>([]);
  // 재시도 로직 제거
  const [data, setData] = useState({
    authSystem: [] as AuditEvent[],
    authResource: [] as AuditEvent[],
    authFailure: [] as AuditEvent[],
    authSuspicious: [] as AuditEvent[]
  });
  const [chartData, setChartData] = useState<ChartData>({
    authSystem: [],
    authResource: [],
    authFailure: [],
    authSuspicious: []
  });
  
  // 5초 간격으로 데이터를 배치 처리하기 위한 버퍼
  const [dataBuffer, setDataBuffer] = useState<{
    authSystem: AuditEvent[];
    authResource: AuditEvent[];
    authFailure: AuditEvent[];
    authSuspicious: AuditEvent[];
  }>({
    authSystem: [],
    authResource: [],
    authFailure: [],
    authSuspicious: []
  });

  const updateChartDataRef = useRef<(endpoint: string) => void>();
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);

  const updateChartData = useCallback((endpoint: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    setChartData(prev => {
      const currentData = [...prev[endpoint]];
      
      // 마지막 데이터 포인트와 같은 시간인지 확인
      const lastDataPoint = currentData[currentData.length - 1];
      if (lastDataPoint && lastDataPoint.time === timeString) {
        // 같은 시간이면 카운트 증가
        currentData[currentData.length - 1] = {
          ...lastDataPoint,
          count: lastDataPoint.count + 1
        };
      } else {
        // 새로운 시간이면 새 데이터 포인트 추가
        currentData.push({
          time: timeString,
          count: 1,
          timestamp: now.getTime()
        });
      }
      
      // 1시간(12개 데이터 포인트, 5분 간격)까지만 유지
      if (currentData.length > 12) {
        currentData.shift();
      }
      
      return {
        ...prev,
        [endpoint]: currentData
      };
    });
  }, []);

  // ref에 최신 함수 저장
  updateChartDataRef.current = updateChartData;

  const connect = useCallback(async () => {
    if (isConnectedRef.current || isConnectingRef.current) {
      console.log('SSE 연결 시도 중단: 이미 연결 중 또는 연결됨');
      return;
    }

    if (!token) {
      console.log('SSE 연결 시도 중단: 토큰이 없습니다');
      return;
    }

    isConnectingRef.current = true;
    console.log('SSE 연결 시작...');

    const endpoints = [
      { key: 'authSystem', url: API_CONFIG.ENDPOINTS.AUTH_SYSTEM },
      { key: 'authResource', url: API_CONFIG.ENDPOINTS.AUTH_RESOURCE },
      { key: 'authFailure', url: API_CONFIG.ENDPOINTS.AUTH_FAILURE },
      { key: 'authSuspicious', url: API_CONFIG.ENDPOINTS.AUTH_SUSPICIOUS }
    ];

    const newAbortControllers: AbortController[] = [];

    const connectToEndpoint = async (key: string, url: string) => {
      const abortController = new AbortController();
      newAbortControllers.push(abortController);

      try {
        console.log(`🔄 SSE 연결 시도: ${key}`);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          console.error(`❌ SSE 연결 실패: ${key} - ${response.status} ${response.statusText}`);
          console.error(`요청 URL: ${API_CONFIG.BASE_URL}${url}`);
          console.error(`토큰: ${token ? '존재함' : '없음'}`);
          const errorText = await response.text();
          console.error(`에러 응답: ${errorText}`);
          return; // 실패 시 재시도하지 않고 종료
        }

        console.log(`✅ SSE 연결 성공: ${key}`);
        console.log(`📡 SSE 스트림 시작: ${key} - ${API_CONFIG.BASE_URL}${url}`);

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`SSE 스트림 종료: ${key}`);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.slice(6); // 'data: ' 제거
                if (jsonData.trim() === '') continue;
                
                const newEvent: AuditEvent = JSON.parse(jsonData);
                
                // 버퍼에 데이터 추가 (실시간 업데이트하지 않음)
                setDataBuffer(prev => ({
                  ...prev,
                  [key as keyof typeof prev]: [newEvent, ...prev[key as keyof typeof prev]]
                }));
              } catch (error) {
                console.error(`SSE 데이터 파싱 오류 (${key}):`, error);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`SSE 연결 중단: ${key}`);
        } else {
          console.error(`SSE 연결 오류: ${key}`, error);
          console.error(`요청 URL: ${API_CONFIG.BASE_URL}${url}`);
          console.error(`토큰: ${token ? '존재함' : '없음'}`);
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.error('네트워크 오류: 서버에 연결할 수 없습니다. CORS 설정이나 서버 상태를 확인하세요.');
          }
          // 재시도하지 않음
        }
      }
    };

    // 모든 엔드포인트에 동시 연결
    const connectionPromises = endpoints.map(({ key, url }) => 
      connectToEndpoint(key, url)
    );

    setAbortControllers(newAbortControllers);
    isConnectedRef.current = true;
    isConnectingRef.current = false;
    setIsConnected(true);

    // 연결을 백그라운드에서 실행
    Promise.allSettled(connectionPromises).then(results => {
      const failedConnections = results.filter(result => result.status === 'rejected').length;
      if (failedConnections > 0) {
        console.warn(`${failedConnections}개의 SSE 연결이 실패했습니다.`);
      }
    }).catch(error => {
      console.error('SSE 연결 중 오류 발생:', error);
      isConnectingRef.current = false;
    });
  }, [token]);

  const disconnect = useCallback(() => {
    abortControllers.forEach(controller => {
      controller.abort();
    });
    setAbortControllers([]);
    isConnectedRef.current = false;
    isConnectingRef.current = false;
    setIsConnected(false);
  }, [abortControllers]);

  const clearData = useCallback(() => {
    setData({
      authSystem: [],
      authResource: [],
      authFailure: [],
      authSuspicious: []
    });
    setChartData({
      authSystem: [],
      authResource: [],
      authFailure: [],
      authSuspicious: []
    });
    setDataBuffer({
      authSystem: [],
      authResource: [],
      authFailure: [],
      authSuspicious: []
    });
  }, []);

  // 토큰이 없을 때만 연결 해제
  useEffect(() => {
    if (!token && (isConnectedRef.current || isConnectingRef.current)) {
      console.log('토큰 없음, SSE 연결 해제');
      disconnect();
    }
  }, [token]); // disconnect 의존성 제거

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      abortControllers.forEach(controller => {
        controller.abort();
      });
    };
  }, [abortControllers]);

  // 5초마다 버퍼의 데이터를 실제 데이터로 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setDataBuffer(prevBuffer => {
        // 버퍼에 데이터가 있으면 실제 데이터로 업데이트
        const hasNewData = Object.values(prevBuffer).some(events => events.length > 0);
        
        if (hasNewData) {
          console.log('📊 5초 간격 데이터 업데이트');
          
          setData(prevData => {
            const newData = { ...prevData };
            Object.keys(prevBuffer).forEach(key => {
              if (prevBuffer[key as keyof typeof prevBuffer].length > 0) {
                // 새로운 데이터를 앞에 추가하고 최대 100개 유지
                newData[key as keyof typeof newData] = [...prevBuffer[key as keyof typeof prevBuffer], ...prevData[key as keyof typeof prevData]].slice(0, 100);
                updateChartDataRef.current?.(key);
              }
            });
            return newData;
          });
          
          // 버퍼 초기화
          return {
            authSystem: [],
            authResource: [],
            authFailure: [],
            authSuspicious: []
          };
        }
        
        return prevBuffer;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // 5초마다 차트 데이터 업데이트 (빈 데이터도 유지)
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const updatedData = { ...prev };
        
        Object.keys(updatedData).forEach(key => {
          const currentData = [...updatedData[key]];
          const lastDataPoint = currentData[currentData.length - 1];
          
          // 마지막 데이터 포인트가 5분 이상 오래되었다면 새로운 빈 데이터 포인트 추가
          if (lastDataPoint && now.getTime() - lastDataPoint.timestamp > 5 * 60 * 1000) {
            currentData.push({
              time: timeString,
              count: 0,
              timestamp: now.getTime()
            });
            
            // 12개 데이터 포인트까지만 유지
            if (currentData.length > 12) {
              currentData.shift();
            }
            
            updatedData[key] = currentData;
          }
        });
        
        return updatedData;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SSEContext.Provider value={{
      isConnected,
      data,
      chartData,
      connect,
      disconnect,
      clearData
    }}>
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
