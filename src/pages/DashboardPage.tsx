import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Activity, Settings, BarChart3 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
          >
            로그아웃
          </button>
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
              <div className="text-2xl font-bold text-green-600">정상</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">감사 모니터링</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">정상</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Kafka 시스템</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">대기중</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">설정 관리</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">0</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">활성 경고</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
