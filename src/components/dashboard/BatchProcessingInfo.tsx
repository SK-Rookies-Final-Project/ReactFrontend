import React from 'react';

interface BatchProcessingInfoProps {
  pendingLogsCount: number;
}

export const BatchProcessingInfo: React.FC<BatchProcessingInfoProps> = ({ pendingLogsCount }) => {
  const renderInterval = Math.round(parseInt(import.meta.env.VITE_RENDER_BATCH_INTERVAL || '5000', 10) / 1000);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">배치 처리 정보</h3>
      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
        <p>렌더링 주기: {renderInterval}초마다 업데이트</p>
        <p>성능 최적화: 활성화됨</p>
      </div>
    </div>
  );
};
