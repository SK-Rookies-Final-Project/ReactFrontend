import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSSE } from '../contexts/SSEContext';
import { ArrowLeft, Activity, Users, AlertTriangle, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AuditPage: React.FC = () => {
  const { logout } = useAuth();
  const { isConnected, data, chartData, connect, disconnect } = useSSE();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'system' | 'resource' | 'failure' | 'suspicious'>('system');

  // 감사 모니터링 페이지 접속 시 SSE 연결 시작 (한 번만)
  useEffect(() => {
    if (!isConnected) {
      console.log('감사 모니터링 페이지 접속, SSE 연결 시작');
      connect();
    }

    return () => {
      console.log('감사 모니터링 페이지 이탈, SSE 연결 해제');
      disconnect();
    };
  }, []); // 의존성 배열을 빈 배열로 변경하여 한 번만 실행

  const tabs = [
    {
      id: 'system' as const,
      title: '시스템 레벨 비인가 접근',
      description: '시스템 전체에 대한 비인가 접근 모니터링',
      icon: Activity,
      color: 'bg-red-500',
      data: data.authSystem,
      chartData: chartData.authSystem
    },
    {
      id: 'resource' as const,
      title: '유저/리소스 레벨 비인가 접근',
      description: '사용자 및 리소스별 비인가 접근 모니터링',
      icon: Users,
      color: 'bg-orange-500',
      data: data.authResource,
      chartData: chartData.authResource
    },
    {
      id: 'failure' as const,
      title: '반복적인 로그인 시도',
      description: '잦은 로그인 실패 시도 모니터링',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      data: data.authFailure,
      chartData: chartData.authFailure
    },
    {
      id: 'suspicious' as const,
      title: '의심스러운 로그인 시도',
      description: '비정상적인 로그인 패턴 모니터링',
      icon: Eye,
      color: 'bg-purple-500',
      data: data.authSuspicious,
      chartData: chartData.authSuspicious
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/login');
  };

  const formatEventTime = (event: any) => {
    try {
      // AuthSystemEvent, AuthResourceEvent의 경우
      if ('event_time_kst' in event) {
        const timeValue = event.event_time_kst;
        if (typeof timeValue === 'number') {
          return new Date(timeValue).toLocaleString('ko-KR');
        }
        return timeValue.toString();
      }
      
      // AuthFailureEvent, AuthSuspiciousEvent의 경우
      if ('alert_time_kst' in event) {
        const timeValue = event.alert_time_kst;
        if (typeof timeValue === 'string') {
          // ISO 형식이 아닌 경우 (예: "2025-09-13 21:24:47.840")
          if (timeValue.includes(' ') && !timeValue.includes('T')) {
            // 공백을 T로 바꾸고 Z를 추가하여 ISO 형식으로 변환
            const isoString = timeValue.replace(' ', 'T') + '+09:00';
            return new Date(isoString).toLocaleString('ko-KR');
          }
          return new Date(timeValue).toLocaleString('ko-KR');
        }
        return timeValue.toString();
      }
      
      return '시간 정보 없음';
    } catch (error) {
      console.error('시간 파싱 오류:', error);
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-500 text-white">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">최근 1시간</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {activeTabData.chartData.reduce((sum, point) => sum + point.count, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-500 text-white">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">평균/5분</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {activeTabData.chartData.length > 0 
                        ? Math.round(activeTabData.chartData.reduce((sum, point) => sum + point.count, 0) / activeTabData.chartData.length)
                        : 0
                      }
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

            {/* Event List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  최근 이벤트 목록
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeTabData.data.slice(0, 10).map((event, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className={`w-2 h-2 rounded-full ${activeTabData.color.replace('bg-', 'bg-')}`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatEventTime(event)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {'principal' in event ? `사용자: ${event.principal}` : `IP: ${event.client_ip}`}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {('method_name' in event && event.method_name) ? 
                              `메서드: ${event.method_name}` : 
                              ('description' in event ? event.description : '')
                            }
                          </p>
                          {('resource_name' in event && event.resource_name) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              리소스: {event.resource_name}
                            </p>
                          )}
                          {('operation' in event && event.operation) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              작업: {event.operation}
                            </p>
                          )}
                          {('resource_type' in event && event.resource_type) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              리소스 타입: {event.resource_type}
                            </p>
                          )}
                          {('alert_type' in event && event.alert_type) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              경고 타입: {event.alert_type}
                            </p>
                          )}
                          {('failure_count' in event && event.failure_count) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              실패 횟수: {event.failure_count}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {('granted' in event) ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.granted 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {event.granted ? '허용됨' : '거부됨'}
                          </span>
                        ) : ('alert_type' in event) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            {event.alert_type}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                            알 수 없음
                          </span>
                        )}
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
    </div>
  );
};
