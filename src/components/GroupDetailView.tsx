import React from 'react';
import { X } from 'lucide-react';
import type { GroupDetail } from '../lib/kafkaAdmin';

// 컴포넌트가 받을 props 타입 정의
interface Props {
  group: GroupDetail;
  onClose: () => void;
}

export const GroupDetailView: React.FC<Props> = ({ group, onClose }) => {
  return (
    // 전체 컨테이너
    <div className="mt-6 p-4 border-t border-gray-200 dark:border-gray-700">
      {/* 헤더: 그룹 이름과 닫기 버튼 */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            그룹 상세: <span className="text-blue-600 dark:text-blue-400">{group.groupId}</span>
          </h3>
          <p className="text-sm text-gray-500">
            State: {group.state} · Coordinator: {group.coordinator ?? 'N/A'} · Total Lag: {group.totalLag}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-label="상세 정보 닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 멤버 목록 */}
      {group.members.length === 0 ? (
        <div className="text-gray-500 text-center p-4">이 그룹에 활성 멤버가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {group.members.map(member => (
            <div key={member.consumerId} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              {/* 멤버 정보 */}
              <div className="font-medium text-gray-800 dark:text-gray-100">{member.consumerId}</div>
              <div className="text-xs text-gray-500 mb-2">
                Client ID: {member.clientId} · Host: {member.host}
              </div>
              
              {/* 할당된 파티션 정보 테이블 */}
              {member.assignedPartitions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-2">Topic</th>
                        <th className="px-4 py-2">Partition</th>
                        <th className="px-4 py-2 text-right">Committed</th>
                        <th className="px-4 py-2 text-right">Latest</th>
                        <th className="px-4 py-2 text-right">Lag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {member.assignedPartitions.map(p => (
                        <tr key={`${p.topic}-${p.partition}`} className="border-b dark:border-gray-600 last:border-b-0">
                          <td className="px-4 py-2 font-medium">{p.topic}</td>
                          <td className="px-4 py-2 text-center">{p.partition}</td>
                          <td className="px-4 py-2 text-right">{p.committedOffset}</td>
                          <td className="px-4 py-2 text-right">{p.latestOffset}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${p.lag > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {p.lag}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};