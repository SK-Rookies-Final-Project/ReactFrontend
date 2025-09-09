// Authentication Log Types
export interface AuthLog {
  '@timestamp': number;
  remote_addr: string;
  user: string;
  method: string;
  uri: string;
  http_version: string;
  status: string;
  body_bytes_sent: string;
  user_agent: string;
  file: string;
}

// Authorization Failure Log
export interface UnauthorizedLog {
  granted: boolean;
  eventTime: string;
  principal: string;
  clientIp: string;
  methodName: string;
  resourceType: string;
  dataResourceName: string;
  authResourceName: string;
  processingTime: number;
}

// General Kafka Audit Log
export interface KafkaAuditLog {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  subject: string;
  time: string;
  route: string;
  data: {
    serviceName: string;
    methodName: string;
    resourceName: string;
    authenticationInfo: {
      principal: string;
      principalResourceId: string;
      identity: string;
    };
    authorizationInfo: {
      granted: boolean;
      operation: string;
      resourceType: string;
      resourceName: string;
      patternType: string;
      superUserAuthorization: boolean;
      assignedPrincipals: any[];
    };
    request: {
      correlation_id: string;
      client_id: string;
    };
    requestMetadata: {
      request_id: string;
      connection_id: string;
    };
    clientAddress: Array<{
      ip: string;
      port: number;
      internal: boolean;
    }>;
  };
}

export type LogEntry = AuthLog | UnauthorizedLog | KafkaAuditLog;

export interface LogWithMetadata extends LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  level: LogLevel;
}

export enum LogType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILED = 'auth_failed',
  UNAUTHORIZED = 'unauthorized',
  GENERAL = 'general'
}

export enum LogLevel {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export interface ApiEndpoint {
  name: string;
  path: string;
  description: string;
  type: LogType;
}