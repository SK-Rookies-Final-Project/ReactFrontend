import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSSE } from '../contexts/SSEContext';
import { AuthSystemEvent, AuthResourceEvent, AuthFailureEvent, AuthSuspiciousEvent } from '../types';
import { ArrowLeft, Activity, Users, AlertTriangle, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AuditPage: React.FC = () => {
  const { logout } = useAuth();
  const { isConnected, data, chartData, connect, forceDisconnect, generateDummyData } = useSSE();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'system' | 'resource' | 'failure' | 'suspicious'>('system');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const mountedRef = useRef(true);
  const connectionAttemptedRef = useRef(false);

  // 감사 모니터링 페이지 접속 시 SSE 연결 시작 (1회만)
  useEffect(() => {
    console.log('🔗 감사 모니터링 페이지 접속');
    mountedRef.current = true;
    
    if (connectionAttemptedRef.current || isConnected) {
      console.log('🔄 SSE 연결이 이미 시도되었거나 연결되어 있습니다');
      return;
    }
    
    connectionAttemptedRef.current = true;
    
    const connectTimer = setTimeout(() => {
      if (mountedRef.current) {
        console.log('🚀 SSE 연결 시도 시작');
        connect();
      }
    }, 200);

    return () => {
      console.log('🔌 AuditPage useEffect cleanup');
      clearTimeout(connectTimer);
    };
  }, []);

  // 연결 상태 모니터링
  useEffect(() => {
    console.log('📊 SSE 연결 상태:', {
      isConnected,
      dataLengths: {
        authSystem: data.authSystem.length,
        authResource: data.authResource.length,
        authFailure: data.authFailure.length,
        authSuspicious: data.authSuspicious.length
      }
    });
  }, [isConnected, data]);

  const tabs = [
    {
      id: 'system' as const,
      title: '시스템 레벨 접근 제어',
      description: 'SecurityMetadata, 클러스터 설정 등 시스템 레벨 리소스 접근 모니터링',
      icon: Activity,
      color: 'bg-red-500',
      data: data.authSystem,
      chartData: chartData.authSystem,
      endpoint: '/api/kafka/auth_system'
    },
    {
      id: 'resource' as const,
      title: '리소스 레벨 접근 제어',
      description: 'Topic, ConsumerGroup 등 Kafka 리소스별 접근 권한 모니터링',
      icon: Users,
      color: 'bg-orange-500',
      data: data.authResource,
      chartData: chartData.authResource,
      endpoint: '/api/kafka/auth_resource'
    },
    {
      id: 'failure' as const,
      title: '인증 실패 모니터링',
      description: 'FREQUENT_FAILURES: 10초 내 2회 이상 인증 실패 감지',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      data: data.authFailure,
      chartData: chartData.authFailure,
      endpoint: '/api/kafka/auth_failure'
    },
    {
      id: 'suspicious' as const,
      title: '의심스러운 활동 감지',
      description: 'INACTIVITY_AFTER_FAILURE: 인증 실패 후 10초간 비활성 상태 감지',
      icon: Eye,
      color: 'bg-purple-500',
      data: data.authSuspicious,
      chartData: chartData.authSuspicious,
      endpoint: '/api/kafka/auth_suspicious'
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  const handleLogout = () => {
    mountedRef.current = false;
    connectionAttemptedRef.current = false;
    forceDisconnect();
    logout();
    navigate('/login');
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const formatEventTime = (event: AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent) => {
    try {
      // 이벤트 발생 시간만 표시 (처리 시간 제외)
      let timeValue: string;
      
      // AuthSystemEvent, AuthResourceEvent의 경우: event_time_kst가 이벤트 발생 시간
      if ('event_time_kst' in event) {
        timeValue = event.event_time_kst;
      }
      // AuthFailureEvent, AuthSuspiciousEvent의 경우: alert_time_kst가 이벤트 발생 시간
      else if ('alert_time_kst' in event) {
        timeValue = event.alert_time_kst;
      } else {
        return '시간 정보 없음';
      }
      
      if (typeof timeValue !== 'string') {
        return String(timeValue);
      }
      
      // KST 제거
      let cleanTimeStr = timeValue.replace(' KST', '').trim();
      
      // 1. 한국어 시간 형식 파싱: "2025. 9. 17. 오후 7:11:59"
      let match = cleanTimeStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})/);
      
      if (match) {
        const [, year, month, day, ampm, hour, minute, second] = match;
        let hour24 = parseInt(hour, 10);
        
        // 오후 시간 처리 (12시는 그대로, 나머지는 +12)
        if (ampm === '오후' && hour24 !== 12) {
          hour24 += 12;
        }
        // 오전 12시는 0시로 변환
        if (ampm === '오전' && hour24 === 12) {
          hour24 = 0;
        }
        
        const date = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1, // 월은 0부터 시작
          parseInt(day, 10),
          hour24,
          parseInt(minute, 10),
          parseInt(second, 10)
        );
        
        return date.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      // 2. ISO 형식 파싱: "2025-09-17T15:11:52.428" 또는 "2025-09-17 15:11:52.428"
      match = cleanTimeStr.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/);
      if (match) {
        const [, year, month, day, hour, minute, second, millisecond] = match;
        const date = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          parseInt(second, 10),
          millisecond ? parseInt(millisecond, 10) : 0
        );
        
        return date.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      // 3. 일반적인 한국어 형식: "2025. 9. 17. 15:11:52"
      match = cleanTimeStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        const date = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          parseInt(second, 10)
        );
        
        return date.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      // 4. 기본 파싱 시도
      const parsed = new Date(cleanTimeStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      console.warn('지원하지 않는 시간 형식:', timeValue);
      return 'Invalid Date';
    } catch (error) {
      console.error('시간 파싱 오류:', error, event);
      return '시간 파싱 오류';
    }
  };

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
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isConnected ? '연결됨' : '연결 끊김'}
                </span>
              </div>
              
              {/* 재연결 및 더미데이터 버튼 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    console.log('🔄 재연결 버튼 클릭');
                    forceDisconnect();
                    setTimeout(() => {
                      connect();
                    }, 100);
                  }}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors duration-200"
                >
                  재연결
                </button>
                <button
                  onClick={() => {
                    console.log('🎭 더미데이터 생성 버튼 클릭');
                    generateDummyData();
                  }}
                  className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded transition-colors duration-200"
                >
                  더미데이터 생성
                </button>
              </div>
              
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
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      isActive
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span>{tab.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTabData && (
          <div className="space-y-6">
            {/* Stats Cards - 엔드포인트별 맞춤형 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 총 이벤트 수 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${activeTabData.color} text-white`}>
                    <Activity className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 이벤트</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {activeTabData.data.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* 엔드포인트별 특화 통계 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-500 text-white">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {activeTab === 'system' ? '거부된 시스템 접근' : 
                       activeTab === 'resource' ? '거부된 리소스 접근' :
                       activeTab === 'failure' ? '총 인증 실패 횟수' : '의심 활동 수'}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {activeTab === 'system' || activeTab === 'resource' 
                        ? activeTabData.data.filter((event: any) => event.granted === false).length
                        : activeTab === 'failure'
                        ? activeTabData.data.reduce((sum: number, event: any) => sum + (event.failure_count || 0), 0)
                        : activeTabData.data.length
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* 최근 1시간 활동 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-500 text-white">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">최근 1시간</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {activeTabData.chartData.reduce((sum: number, point: any) => sum + point.count, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {activeTabData.title} - 시간별 통계 (최근 1시간)
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeTabData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value) => `시간: ${value}`}
                      formatter={(value: number) => [value, '이벤트 수']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Event List - 간단한 목록 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  최근 이벤트 목록
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeTabData.data.slice(0, 10).map((event: any, index: number) => (
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
                              IP: {event.client_ip}
                              {(activeTab === 'system' || activeTab === 'resource') && event.principal && 
                                ` • 사용자: ${event.principal}`
                              }
                              {(activeTab === 'failure' || activeTab === 'suspicious') && event.alert_type && 
                                ` • ${event.alert_type}`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        {/* 상태 표시 */}
                        {(activeTab === 'system' || activeTab === 'resource') && ('granted' in event) && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.granted 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {event.granted ? '허용됨' : '거부됨'}
                          </span>
                        )}
                        
                        {(activeTab === 'failure' || activeTab === 'suspicious') && ('alert_type' in event) && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            activeTab === 'failure' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}>
                            {event.alert_type}
                          </span>
                        )}
                        
                        {/* 클릭 안내 */}
                        <span className="text-xs text-gray-400">클릭하여 상세보기</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activeTabData.data.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">이벤트가 없습니다.</p>
                  </div>
                )}
              </div>
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
                    <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.client_ip}</p>
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
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.method_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">리소스 타입</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.resource_type || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">리소스 이름</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.resource_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">작업</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.operation || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">접근 허용</label>
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
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.alert_type || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">실패 횟수</label>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedEvent.failure_count || 0}회</p>
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
