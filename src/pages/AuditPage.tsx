import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthSystemEvent, AuthResourceEvent, AuthFailureEvent, AuthSuspiciousEvent } from '../types';
import { ArrowLeft, Activity, Users, AlertTriangle, Eye, Wifi, WifiOff } from 'lucide-react';
import { API_CONFIG } from '../config/api';

export const AuditPage: React.FC = () => {
  const { logout, token } = useAuth();
  const navigate = useNavigate();
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState<'system' | 'resource' | 'failure' | 'suspicious'>('failure');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // 실시간 데이터
  const [data, setData] = useState({
    authSystem: [] as AuthSystemEvent[],
    authResource: [] as AuthResourceEvent[],
    authFailure: [] as AuthFailureEvent[],
    authSuspicious: [] as AuthSuspiciousEvent[]
  });
  
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

  // fetch를 사용한 SSE 연결 생성 함수 (MIME 타입 문제 해결)
  const createSSEConnection = (endpoint: string, eventType: string) => {
    if (!token) {
      console.error('JWT 토큰이 필요합니다.');
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
            'Accept': 'text/event-stream, text/plain', // 두 MIME 타입 모두 허용
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✅ SSE 연결 성공: ${eventType}`);
        console.log(`🔍 응답 헤더:`, Object.fromEntries(response.headers.entries()));
        console.log(`🔍 응답 상태:`, response.status, response.statusText);
        setIsConnected(true);
        
        // 연결 후 10초 타이머로 메시지 수신 확인
        setTimeout(() => {
          console.log(`⏰ [${eventType}] 10초 경과 - 메시지 수신 여부 확인`);
        }, 10000);

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

          const chunk = decoder.decode(value, { stream: true });
          console.log(`🔍 [${eventType}] 수신된 raw chunk:`, JSON.stringify(chunk));
          
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
                  console.log(`🎯 [${eventType}] 완전한 JSON 발견:`, jsonString);
                  
                  try {
                    const eventData = JSON.parse(jsonString);
                    console.log(`🔍 파싱된 ${eventType} 데이터:`, eventData);
                    
                    // 연결 메시지는 건너뛰기
                    if (eventData.type === 'connection') {
                      console.log(`⏭️ 연결 메시지 건너뛰기:`, eventData.message);
                    } else {
                      // 데이터 상태 업데이트
                      setData(prevData => {
                        const newData = { ...prevData };
                        
                        console.log(`🔄 데이터 업데이트 전 상태:`, {
                          authSystem: prevData.authSystem.length,
                          authResource: prevData.authResource.length,
                          authFailure: prevData.authFailure.length,
                          authSuspicious: prevData.authSuspicious.length
                        });
                        
                        switch (eventType) {
                          case 'auth_system':
                            newData.authSystem = [...newData.authSystem, eventData as AuthSystemEvent].slice(-100);
                            console.log(`✅ auth_system 데이터 추가: 총 ${newData.authSystem.length}개`);
                            break;
                          case 'auth_resource':
                            newData.authResource = [...newData.authResource, eventData as AuthResourceEvent].slice(-100);
                            console.log(`✅ auth_resource 데이터 추가: 총 ${newData.authResource.length}개`);
                            break;
                          case 'auth_failure':
                            newData.authFailure = [...newData.authFailure, eventData as AuthFailureEvent].slice(-100);
                            console.log(`✅ auth_failure 데이터 추가: 총 ${newData.authFailure.length}개`);
                            break;
                          case 'auth_suspicious':
                            newData.authSuspicious = [...newData.authSuspicious, eventData as AuthSuspiciousEvent].slice(-100);
                            console.log(`✅ auth_suspicious 데이터 추가: 총 ${newData.authSuspicious.length}개`);
                            break;
                        }
                        
                        console.log(`🔄 데이터 업데이트 후 상태:`, {
                          authSystem: newData.authSystem.length,
                          authResource: newData.authResource.length,
                          authFailure: newData.authFailure.length,
                          authSuspicious: newData.authSuspicious.length
                        });
                        
                        return newData;
                      });
                      
                      console.log(`📊 ${eventType} 이벤트 추가 완료`);
                    }
                  } catch (parseError) {
                    console.error(`JSON 파싱 오류 (${eventType}):`, parseError, jsonString);
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
          console.log(`🔌 SSE 연결 중단: ${eventType}`);
        } else {
          console.error(`❌ SSE 연결 오류 (${eventType}):`, error);
          setIsConnected(false);
        }
      }
    };

    startSSEConnection();
    return abortController;
  };

  // 모든 SSE 연결 시작
  const connectToSSE = () => {
    console.log('🚀 SSE 연결 시작');
    
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
  };

  // 모든 SSE 연결 종료
  const disconnectSSE = () => {
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
  };

  // 페이지 접속 시 SSE 연결 시작
  useEffect(() => {
    console.log('🔗 감사 모니터링 페이지 접속');
    connectToSSE();

    // 컴포넌트 언마운트 시 연결 정리
    return () => {
      disconnectSSE();
    };
  }, [token]);

  // 데이터 상태 변경 모니터링
  useEffect(() => {
    console.log('📊 데이터 상태 변경 감지:', {
      authSystem: data.authSystem.length,
      authResource: data.authResource.length,
      authFailure: data.authFailure.length,
      authSuspicious: data.authSuspicious.length,
      총합: data.authSystem.length + data.authResource.length + data.authFailure.length + data.authSuspicious.length
    });
    
    // 최신 데이터 샘플 출력
    if (data.authFailure.length > 0) {
      console.log('📝 최신 auth_failure 데이터:', data.authFailure[data.authFailure.length - 1]);
    }
    if (data.authSuspicious.length > 0) {
      console.log('📝 최신 auth_suspicious 데이터:', data.authSuspicious[data.authSuspicious.length - 1]);
    }
    if (data.authSystem.length > 0) {
      console.log('📝 최신 auth_system 데이터:', data.authSystem[data.authSystem.length - 1]);
    }
    if (data.authResource.length > 0) {
      console.log('📝 최신 auth_resource 데이터:', data.authResource[data.authResource.length - 1]);
    }
  }, [data]);

  // 시간 포맷팅 함수
  const formatEventTime = (event: AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent) => {
    try {
      let timeValue: string;
      
      // AuthSystemEvent, AuthResourceEvent: eventTimeKST 사용
      if ('eventTimeKST' in event) {
        timeValue = event.eventTimeKST;
      }
      // AuthFailureEvent, AuthSuspiciousEvent: alertTimeKST 사용
      else if ('alertTimeKST' in event) {
        timeValue = event.alertTimeKST;
      } else {
        return '시간 정보 없음';
      }
      
      // KST 제거하고 간단한 형식으로 변환
      const cleanTime = timeValue.replace(' KST', '').trim();
      const date = new Date(cleanTime);
      
      if (isNaN(date.getTime())) {
        return timeValue; // 파싱 실패 시 원본 반환
      }
      
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('시간 포맷팅 오류:', error);
      return '시간 오류';
    }
  };

  const handleEventClick = (event: any) => {
    console.log('🔍 이벤트 클릭:', event);
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
      description: 'SecurityMetadata, 클러스터 설정 등 시스템 레벨 리소스 접근 모니터링',
      icon: Activity,
      color: 'bg-red-500',
      data: data.authSystem,
      endpoint: '/api/auth/auth_system'
    },
    {
      id: 'resource' as const,
      title: '리소스 레벨 접근 제어',
      description: 'Topic, ConsumerGroup 등 Kafka 리소스별 접근 권한 모니터링',
      icon: Users,
      color: 'bg-orange-500',
      data: data.authResource,
      endpoint: '/api/auth/auth_resource'
    },
    {
      id: 'failure' as const,
      title: '인증 실패 모니터링',
      description: 'FREQUENT_FAILURES: 10초 내 2회 이상 인증 실패 감지',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      data: data.authFailure,
      endpoint: '/api/auth/auth_failure'
    },
    {
      id: 'suspicious' as const,
      title: '의심스러운 활동 감지',
      description: 'INACTIVITY_AFTER_FAILURE: 인증 실패 후 10초간 비활성 상태 감지',
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
      console.log(`🎯 현재 활성 탭 (${activeTab}) 데이터:`, {
        개수: activeTabData.data.length,
        샘플: activeTabData.data.length > 0 ? activeTabData.data[0] : '데이터 없음'
      });
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
              
              {/* 재연결 버튼 */}
              <button
                onClick={connectToSSE}
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
                    onClick={() => setActiveTab(tab.id)}
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
                              {(activeTab === 'system' || activeTab === 'resource') && event.principal && 
                                ` • 사용자: ${event.principal}`
                              }
                              {(activeTab === 'failure' || activeTab === 'suspicious') && event.alertType && 
                                ` • ${event.alertType}`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        {(activeTab === 'system' || activeTab === 'resource') && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.granted 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {event.granted ? '허용' : '거부'}
                          </span>
                        )}
                        
                        {(activeTab === 'failure' || activeTab === 'suspicious') && (
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

                {/* 시스템/리소스 이벤트 정보 */}
                {(activeTab === 'system' || activeTab === 'resource') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">사용자</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.principal || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">메서드</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.methodName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">리소스 타입</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.resourceType || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">리소스 이름</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.resourceName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">작업</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.operation || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">허용 여부</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedEvent.granted 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {selectedEvent.granted ? '허용됨' : '거부됨'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* 실패/의심 이벤트 정보 */}
                {(activeTab === 'failure' || activeTab === 'suspicious') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">경고 타입</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.alertType || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">실패 횟수</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.failureCount || 0}회</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">설명</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedEvent.description || 'N/A'}</p>
                    </div>
                  </>
                )}

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