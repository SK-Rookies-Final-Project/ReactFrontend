import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Shield, ShieldAlert, ShieldX, Database } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  {
    path: '/stream',
    label: '전체 로그',
    icon: <Database className="h-5 w-5" />,
    description: '모든 감사 로그 스트림'
  },
  {
    path: '/auth',
    label: '로그인 성공',
    icon: <Shield className="h-5 w-5" />,
    description: '인증 성공 로그'
  },
  {
    path: '/auth-failed',
    label: '로그인 실패',
    icon: <ShieldX className="h-5 w-5" />,
    description: '인증 실패 로그'
  },
  {
    path: '/unauth',
    label: '인가 실패',
    icon: <ShieldAlert className="h-5 w-5" />,
    description: '권한 부족 로그'
  }
];

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {item.icon}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};