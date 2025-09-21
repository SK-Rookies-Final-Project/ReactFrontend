import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthSystemEvent, AuthResourceEvent, AuthFailureEvent, AuthSuspiciousEvent } from '../types';
import { ArrowLeft, Activity, Users, AlertTriangle, Eye, Wifi, WifiOff, Clock } from 'lucide-react';
import { API_CONFIG } from '../config/api';

export const AuditPage: React.FC = () => {
  const { logout, token } = useAuth();
  const navigate = useNavigate();
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState<'system' | 'resource' | 'failure' | 'suspicious'>('failure');
  const [selectedEvent, setSelectedEvent] = useState<AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // 실시간 데이터
  const [data, setData] = useState({
    authSystem: [] as AuthSystemEvent[],
    authResource: [] as AuthResourceEvent[],
    authFailure: [] as AuthFailureEvent[],
    authSuspicious: [] as AuthSuspiciousEvent[]
  });

  // 배치 업데이트를 위한 임시 데이터 저장소
  const [pendingData, setPendingData] = useState({
    authSystem: [] as AuthSystemEvent[],
    authResource: [] as AuthResourceEvent[],
    authFailure: [] as AuthFailureEvent[],
    authSuspicious: [] as AuthSuspiciousEvent[]
  });

  // 폴링 간격 설정 (환경변수에서 읽어오기, 기본값 5초)
  const pollingInterval = parseInt(import.meta.env.VITE_RENDER_BATCH_INTERVAL || '5000');
  
  // SSE 연결 참조 (AbortController 사용)
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

  // 배치 업데이트 타이머 참조
  const batchUpdateTimerRef = useRef<number | null>(null);

  // SSE 연결 상태 모니터링
  const [connectionStats, setConnectionStats] = useState({
    lastDataReceived: null as Date | null,
    totalMessagesReceived: 0,
    lastBatchUpdate: null as Date | null
  });

  // 배치 업데이트 함수
  const processBatchUpdate = useCallback(() => {
    // 현재 pendingData 상태를 직접 참조하여 배치 업데이트
    setPendingData(currentPendingData => {
      
      // 연결 통계 업데이트
      setConnectionStats(prev => ({
        ...prev,
        lastBatchUpdate: new Date()
      }));
      
      // pendingData에 데이터가 있는 경우에만 업데이트
      if (currentPendingData.authSystem.length > 0 || 
          currentPendingData.authResource.length > 0 || 
          currentPendingData.authFailure.length > 0 || 
          currentPendingData.authSuspicious.length > 0) {
        
        setData(prevData => {
          const newData = { ...prevData };
          
          // pendingData의 모든 새 데이터를 실제 데이터에 추가
          if (currentPendingData.authSystem.length > 0) {
            newData.authSystem = [...newData.authSystem, ...currentPendingData.authSystem].slice(-100);
          }
          
          if (currentPendingData.authResource.length > 0) {
            newData.authResource = [...newData.authResource, ...currentPendingData.authResource].slice(-100);
          }
          
          if (currentPendingData.authFailure.length > 0) {
            newData.authFailure = [...newData.authFailure, ...currentPendingData.authFailure].slice(-100);
          }
          
          if (currentPendingData.authSuspicious.length > 0) {
            newData.authSuspicious = [...newData.authSuspicious, ...currentPendingData.authSuspicious].slice(-100);
          }
          
          return newData;
        });
        
        // 마지막 업데이트 시간 업데이트
        setLastUpdateTime(new Date());
      }
      
      // pendingData 초기화
      return {
        authSystem: [],
        authResource: [],
        authFailure: [],
        authSuspicious: []
      };
    });
  }, []);

  // 배치 업데이트 타이머 시작
  const startBatchUpdateTimer = useCallback(() => {
    if (batchUpdateTimerRef.current) {
      clearInterval(batchUpdateTimerRef.current);
    }
    
    batchUpdateTimerRef.current = window.setInterval(processBatchUpdate, pollingInterval);
  }, [pollingInterval, processBatchUpdate]);

  // 배치 업데이트 타이머 중지
  const stopBatchUpdateTimer = useCallback(() => {
    if (batchUpdateTimerRef.current) {
      window.clearInterval(batchUpdateTimerRef.current);
      batchUpdateTimerRef.current = null;
    }
  }, []);

  // fetch를 사용한 SSE 연결 생성 함수 (MIME 타입 문제 해결)
  const createSSEConnection = useCallback((endpoint: string, eventType: string) => {
    if (!token) {
      return null;
    }

    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    const abortController = new AbortController();
    
    const startSSEConnection = async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream, text/plain', // 두 MIME 타입 모두 허용
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        setIsConnected(true);
        
        // 연결 성공 시 통계 초기화
        setConnectionStats(prev => ({
          ...prev,
          lastDataReceived: null,
          totalMessagesReceived: 0
        }));
        

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body reader not available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          
          buffer += chunk;
          
          // 완전한 JSON 객체들을 찾기 위한 로직
          let startIndex = 0;
          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') {
                if (braceCount === 0) {
                  startIndex = i;
                }
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                
                if (braceCount === 0) {
                  // 완전한 JSON 객체 발견
                  const jsonString = buffer.substring(startIndex, i + 1);
                  
                  try {
                    const eventData = JSON.parse(jsonString);
                    
                    
                    // 연결 메시지와 실제 감사 데이터 구분
                    const isConnectionMessage = eventData.methodName === 'SSE_CONNECTION' || 
                                             eventData.operation === 'CONNECT' ||
                                             eventData.resourceName?.includes('certified') ||
                                             eventData.resourceType === 'SSE_STREAM';
                    
                    // 토픽별 실제 데이터 확인 - 연결 메시지가 아닌 경우에만
                    let isRealAuditData = false;
                    if (!isConnectionMessage) {
                      if (eventType === 'auth_system' || eventType === 'auth_resource') {
                        // AUTH_SYSTEM, AUTH_RESOURCE는 eventTimeKST, principal, methodName 등이 있어야 함
                        isRealAuditData = eventData.eventTimeKST && 
                                        eventData.principal && 
                                        eventData.methodName &&
                                        eventData.methodName !== 'SSE_CONNECTION';
                      } else if (eventType === 'auth_failure' || eventType === 'auth_suspicious') {
                        // AUTH_FAILURE, AUTH_SUSPICIOUS는 alertTimeKST, alertType, description이 있어야 함
                        isRealAuditData = eventData.alertTimeKST && 
                                        eventData.alertType && 
                                        eventData.description !== undefined;
                      }
                    }
                    
                    if (!isConnectionMessage && isRealAuditData) {
                      // 데이터를 pendingData에 저장 (즉시 화면 반영하지 않음)
                      setPendingData(prevPendingData => {
                        const newPendingData = { ...prevPendingData };
                        
                        switch (eventType) {
                          case 'auth_system':
                            newPendingData.authSystem = [...newPendingData.authSystem, eventData as AuthSystemEvent];
                            break;
                          case 'auth_resource':
                            newPendingData.authResource = [...newPendingData.authResource, eventData as AuthResourceEvent];
                            break;
                          case 'auth_failure':
                            newPendingData.authFailure = [...newPendingData.authFailure, eventData as AuthFailureEvent];
                            break;
                          case 'auth_suspicious':
                            newPendingData.authSuspicious = [...newPendingData.authSuspicious, eventData as AuthSuspiciousEvent];
                            break;
                        }
                        
                        // 연결 통계 업데이트
                        setConnectionStats(prev => ({
                          ...prev,
                          lastDataReceived: new Date(),
                          totalMessagesReceived: prev.totalMessagesReceived + 1
                        }));
                        
                        return newPendingData;
                      });
                    }
                  } catch {
                    // JSON 파싱 오류 무시
                  }
                  
                  // 처리된 JSON 제거
                  buffer = buffer.substring(i + 1);
                  i = -1; // 다시 처음부터 검색
                  startIndex = 0;
                }
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // 연결 중단 무시
        } else {
          setIsConnected(false);
          
          // 연결 오류 시 통계 리셋
          setConnectionStats(prev => ({
            ...prev,
            lastDataReceived: null
          }));
        }
      }
    };

    startSSEConnection();
    return abortController;
  }, [token]);

  // 모든 SSE 연결 시작
  const connectToSSE = useCallback(() => {
    // 기존 연결 정리
    Object.values(connectionsRef.current).forEach(controller => {
      if (controller) {
        controller.abort();
      }
    });

    // 4개 엔드포인트에 연결
    connectionsRef.current.authSystem = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_SYSTEM, 'auth_system');
    connectionsRef.current.authResource = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_RESOURCE, 'auth_resource');
    connectionsRef.current.authFailure = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_FAILURE, 'auth_failure');
    connectionsRef.current.authSuspicious = createSSEConnection(API_CONFIG.ENDPOINTS.AUTH_SUSPICIOUS, 'auth_suspicious');
  }, [createSSEConnection]);

  // 모든 SSE 연결 종료
  const disconnectSSE = useCallback(() => {
    // 배치 업데이트 타이머 중지
    stopBatchUpdateTimer();
    
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
  }, [stopBatchUpdateTimer]);

  // 페이지 접속 시 SSE 연결 시작
  useEffect(() => {
    connectToSSE();
    startBatchUpdateTimer();

    // 컴포넌트 언마운트 시 연결 정리
    return () => {
      disconnectSSE();
    };
  }, [connectToSSE, disconnectSSE, startBatchUpdateTimer, pollingInterval]);

  // 컴포넌트 언마운트 시 타이머 정리 (추가 안전장치)
  useEffect(() => {
    return () => {
      if (batchUpdateTimerRef.current) {
        window.clearInterval(batchUpdateTimerRef.current);
      }
    };
  }, []);

  // pendingData 상태 변경 모니터링
  useEffect(() => {
    // 상태 변경 모니터링
  }, [pendingData]);

  // 데이터 상태 변경 모니터링
  useEffect(() => {
    // 데이터 상태 변경 모니터링
  }, [data]);

  // 시간 포맷팅 함수
  const formatEventTime = (event: AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent) => {
    try {
      let timeValue: string;
      
      // 토픽별 시간 필드 확인
      if ('eventTimeKST' in event) {
        // AUTH_SYSTEM, AUTH_RESOURCE: eventTimeKST 사용
        timeValue = event.eventTimeKST;
      } else if ('alertTimeKST' in event) {
        // AUTH_FAILURE, AUTH_SUSPICIOUS: alertTimeKST 사용
        timeValue = event.alertTimeKST;
      } else {
        return '시간 정보 없음';
      }
      
      // ISO 형식의 시간 문자열을 Date 객체로 변환
      const date = new Date(timeValue);
      
      if (isNaN(date.getTime())) {
        return timeValue; // 파싱 실패 시 원본 반환
      }
      
      const formattedTime = date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      return formattedTime;
    } catch {
      return '시간 오류';
    }
  };

  const handleEventClick = (event: AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleLogout = () => {
    disconnectSSE();
    logout();
    navigate('/login');
  };

  // 탭 설정
  const tabs = [
    {
      id: 'system' as const,
      title: '시스템 레벨 접근 제어',
      description: '시스템 레벨 리소스 접근 모니터링 (eventTimeKST, principal, methodName, granted, resourceType, resourceName, operation)',
      icon: Activity,
      color: 'bg-red-500',
      data: data.authSystem,
      endpoint: '/api/auth/auth_system'
    },
    {
      id: 'resource' as const,
      title: '리소스 레벨 접근 제어',
      description: '리소스별 접근 권한 모니터링 (eventTimeKST, principal, methodName, granted, resourceType, resourceName, operation)',
      icon: Users,
      color: 'bg-orange-500',
      data: data.authResource,
      endpoint: '/api/auth/auth_resource'
    },
    {
      id: 'failure' as const,
      title: '인증 실패 모니터링',
      description: '인증 실패 감지 모니터링 (alertTimeKST, alertType, description, failureCount)',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      data: data.authFailure,
      endpoint: '/api/auth/auth_failure'
    },
    {
      id: 'suspicious' as const,
      title: '의심스러운 활동 감지',
      description: '의심스러운 활동 감지 모니터링 (alertTimeKST, alertType, description, failureCount)',
      icon: Eye,
      color: 'bg-purple-500',
      data: data.authSuspicious,
      endpoint: '/api/auth/auth_suspicious'
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);
  
  // 렌더링 시 현재 탭 데이터 확인
  useEffect(() => {
    if (activeTabData) {
      // 현재 탭 데이터 확인
    }
  }, [activeTab, activeTabData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                대시보드로 돌아가기
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                감사 모니터링
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* SSE 연결 상태 표시 */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isConnected ? '연결됨' : '연결 끊김'}
                </span>
              </div>

              {/* 마지막 업데이트 시간 표시 */}
              {lastUpdateTime && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    마지막 업데이트: {lastUpdateTime.toLocaleTimeString('ko-KR')}
                  </span>
                </div>
              )}

              {/* 대기 중인 데이터 수 표시 */}
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  대기: {pendingData.authSystem.length + pendingData.authResource.length + pendingData.authFailure.length + pendingData.authSuspicious.length}개
                </span>
              </div>

              {/* 연결 통계 표시 */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  수신: {connectionStats.totalMessagesReceived}개
                </span>
                {connectionStats.lastDataReceived && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    마지막: {connectionStats.lastDataReceived.toLocaleTimeString('ko-KR')}
                  </span>
                )}
              </div>
              
              {/* 재연결 버튼 */}
              <button
                onClick={() => {
                  connectToSSE();
                  startBatchUpdateTimer();
                }}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors duration-200"
              >
                재연결
              </button>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                    }}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      isActive
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.title}</span>
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      isActive ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {tab.data.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 활성 탭 내용 */}
        {activeTabData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeTabData.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {activeTabData.description}
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeTabData.data.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">이벤트가 없습니다.</p>
                </div>
              ) : (
                activeTabData.data.slice(0, 50).map((event, index) => (
                  <div
                    key={index}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className={`w-2 h-2 rounded-full ${activeTabData.color.replace('bg-', 'bg-')}`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatEventTime(event)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              IP: {event.clientIp}
                              {(activeTab === 'system' || activeTab === 'resource') && 'principal' in event && event.principal && 
                                ` • 사용자: ${event.principal}`
                              }
                              {(activeTab === 'system' || activeTab === 'resource') && 'operation' in event && event.operation && 
                                ` • 작업: ${event.operation}`
                              }
                              {(activeTab === 'failure' || activeTab === 'suspicious') && 'alertType' in event && event.alertType && 
                                ` • ${event.alertType}`
                              }
                              {(activeTab === 'failure' || activeTab === 'suspicious') && 'description' in event && event.description && 
                                ` • ${event.description}`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        {(activeTab === 'system' || activeTab === 'resource') && 'granted' in event && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.granted 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {event.granted ? '허용' : '거부'}
                          </span>
                        )}
                        
                        {(activeTab === 'failure' || activeTab === 'suspicious') && 'failureCount' in event && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            {event.failureCount}회
                          </span>
                        )}
                        
                        {/* 클릭 안내 */}
                        <span className="text-xs text-gray-400">클릭하여 상세보기</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 상세보기 모달 */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                이벤트 상세 정보
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* 기본 정보 */}
                {(() => {
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">시간</label>
                        <p className="text-sm text-gray-900 dark:text-white">{formatEventTime(selectedEvent)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">IP 주소</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.clientIp}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* 시스템/리소스 이벤트 정보 */}
                {(activeTab === 'system' || activeTab === 'resource') && selectedEvent && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">사용자</label>
                        <p className="text-sm text-gray-900 dark:text-white">{'principal' in selectedEvent ? selectedEvent.principal || 'N/A' : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">메서드</label>
                        <p className="text-sm text-gray-900 dark:text-white">{'methodName' in selectedEvent ? selectedEvent.methodName || 'N/A' : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">리소스 타입</label>
                        <p className="text-sm text-gray-900 dark:text-white">{'resourceType' in selectedEvent ? selectedEvent.resourceType || 'N/A' : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">리소스 이름</label>
                        <p className="text-sm text-gray-900 dark:text-white">{'resourceName' in selectedEvent ? selectedEvent.resourceName || 'N/A' : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">작업</label>
                        <p className="text-sm text-gray-900 dark:text-white">{'operation' in selectedEvent ? selectedEvent.operation || 'N/A' : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">허용 여부</label>
                        {'granted' in selectedEvent ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedEvent.granted 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {selectedEvent.granted ? '허용됨' : '거부됨'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 실패/의심 이벤트 정보 */}
                {(activeTab === 'failure' || activeTab === 'suspicious') && selectedEvent && (() => {
                  // 새로운 데이터 구조에 맞게 필드 접근
                  const eventData = selectedEvent as AuthFailureEvent | AuthSuspiciousEvent;
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">경고 타입</label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {eventData?.alertType || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">실패 횟수</label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {eventData?.failureCount || 0}회
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">설명</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {eventData?.description || 'N/A'}
                        </p>
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};