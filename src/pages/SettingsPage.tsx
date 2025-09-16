import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Settings, Database, Server, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const settingsCategories = [
    {
      id: 'kafka',
      title: 'Kafka 설정',
      description: 'Kafka 브로커 및 클러스터 설정 관리',
      icon: Database,
      status: '구현 예정',
      color: 'bg-blue-500'
    },
    {
      id: 'security',
      title: '보안 설정',
      description: '인증 및 권한 관리 설정',
      icon: Shield,
      status: '구현 예정',
      color: 'bg-green-500'
    },
    {
      id: 'monitoring',
      title: '모니터링 설정',
      description: '알림 및 임계값 설정',
      icon: Server,
      status: '구현 예정',
      color: 'bg-purple-500'
    },
    {
      id: 'system',
      title: '시스템 설정',
      description: '일반적인 시스템 구성 관리',
      icon: Settings,
      status: '구현 예정',
      color: 'bg-orange-500'
    }
  ];

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
                시스템 설정
              </h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-8 text-white">
          <div className="flex items-center">
            <Settings className="h-8 w-8 mr-4" />
            <div>
              <h2 className="text-xl font-bold">설정 관리 기능</h2>
              <p className="text-blue-100 mt-1">
                Kafka 시스템 설정 및 구성 관리 기능이 곧 출시됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${category.color} text-white mr-4`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category.title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      {category.status}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {category.description}
                </p>
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed"
                >
                  곧 출시됩니다
                </button>
              </div>
            );
          })}
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            시스템 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                애플리케이션 버전
              </h4>
              <p className="text-gray-900 dark:text-white">v1.0.0</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                빌드 날짜
              </h4>
              <p className="text-gray-900 dark:text-white">
                {new Date().toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                환경
              </h4>
              <p className="text-gray-900 dark:text-white">Development</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API 서버
              </h4>
              <p className="text-gray-900 dark:text-white">localhost:8080</p>
            </div>
          </div>
        </div>

        {/* Feature Roadmap */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            개발 예정 기능
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">Kafka 브로커 연결 설정</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">토픽 및 파티션 관리</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">사용자 권한 관리</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">알림 임계값 설정</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">백업 및 복원 설정</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
