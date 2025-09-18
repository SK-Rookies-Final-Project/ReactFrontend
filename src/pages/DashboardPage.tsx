import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSSE } from '../contexts/SSEContext';
import { Shield, Activity, Settings, BarChart3, Database } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { generateDummyData, data, isConnected } = useSSE();
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log('🔌 대시보드에서 로그아웃 시작');
    
    // AuthContext의 logout 호출 (토큰 제거로 인해 SSEContext가 자동으로 연결 해제)
    logout();
    
    // 로그인 페이지로 이동
    navigate('/login');
    
    console.log('✅ 대시보드 로그아웃 완료');
  };

  const menuItems = [
    {
      id: 'audit',
      title: '감사 모니터링',
      description: '시스템 보안 감사 및 접근 제어 모니터링',
      icon: Shield,
      path: '/audit',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'history',
      title: '과거 데이터 이력',
      description: 'DB에 저장된 과거 감사 로그 데이터 조회 및 분석',
      icon: Database,
      path: '/history',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      id: 'prometheus',
      title: 'Kafka 시스템 모니터링',
      description: 'Prometheus를 통한 Kafka 시스템 메트릭 모니터링',
      icon: Activity,
      path: '/prometheus',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'settings',
      title: '시스템 설정',
      description: 'Kafka 시스템 설정 및 구성 관리',
      icon: Settings,
      path: '/settings',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Kafka 모니터링 시스템
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              환영합니다, {user?.username}님
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                console.log('🎭 더미데이터 생성 버튼 클릭');
                generateDummyData();
              }}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200"
            >
              더미데이터 생성
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${item.color} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <BarChart3 className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  
                  <div className="mt-4 flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                    접속하기
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Overview */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            시스템 상태 개요
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '연결됨' : '연결 끊김'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">SSE 연결 상태</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.authSystem.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">시스템 이벤트</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.authResource.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">리소스 이벤트</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.authFailure.length + data.authSuspicious.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">경고/의심 활동</div>
            </div>
          </div>
        </div>

        {/* 데이터 상세 정보 */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            실시간 데이터 현황
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">시스템 레벨 접근 제어</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">{data.authSystem.length}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                거부된 접근: {data.authSystem.filter(e => !e.granted).length}건
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-orange-900 dark:text-orange-100">리소스 레벨 접근 제어</h3>
              <p className="text-2xl font-bold text-orange-600 mt-2">{data.authResource.length}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                거부된 접근: {data.authResource.filter(e => !e.granted).length}건
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900 dark:text-yellow-100">인증 실패</h3>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{data.authFailure.length}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                총 실패 횟수: {data.authFailure.reduce((sum, e) => sum + e.failure_count, 0)}회
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900 dark:text-purple-100">의심스러운 활동</h3>
              <p className="text-2xl font-bold text-purple-600 mt-2">{data.authSuspicious.length}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                감지된 활동: {data.authSuspicious.length}건
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
