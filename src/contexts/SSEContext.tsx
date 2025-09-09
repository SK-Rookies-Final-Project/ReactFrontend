import React, { createContext, useContext, ReactNode } from 'react';
import { useGlobalSSE } from '../hooks/useGlobalSSE';
import { LogWithMetadata, LogType, ConnectionStatus } from '../types/kafka';

interface SSEContextType {
  allLogs: LogWithMetadata[];
  getLogsByType: (logType: LogType) => LogWithMetadata[];
  getConnectionStatus: (endpoint: string) => ConnectionStatus;
  isConnecting: (endpoint: string) => boolean;
  clearLogs: () => void;
  connectToEndpoint: (endpoint: string, logType: LogType) => void;
  disconnectFromEndpoint: (endpoint: string) => void;
  getPendingLogsCount: () => number;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

interface SSEProviderProps {
  children: ReactNode;
}

export const SSEProvider: React.FC<SSEProviderProps> = ({ children }) => {
  const sseData = useGlobalSSE();

  return (
    <SSEContext.Provider value={sseData}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSEContext = (): SSEContextType => {
  const context = useContext(SSEContext);
  if (context === undefined) {
    throw new Error('useSSEContext must be used within a SSEProvider');
  }
  return context;
};
