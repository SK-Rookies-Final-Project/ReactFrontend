// system-level-false
export interface AuthSystemEvent {
  id: string;
  event_time_kst: number;
  processing_time_kst: number;
  principal: string;
  client_ip: string;
  method_name: string;
  granted: boolean;
  resource_type: string;
  resource_name: string;
  operation: string;
}

// resource-level-false
export interface AuthResourceEvent {
  id: string;
  event_time_kst: number;
  processing_time_kst: number;
  principal: string;
  client_ip: string;
  method_name: string;
  granted: boolean;
  resource_type: string;
  resource_name: string;
  operation: string;
}

// certified-2time
export interface AuthFailureEvent {
  id: string;
  client_ip: string;
  alert_time_kst: string;
  alert_type: string;
  description: string;
  failure_count: number;
}

// certified-notMove
export interface AuthSuspiciousEvent {
  id: string;
  client_ip: string;
  alert_time_kst: string;
  alert_type: string;
  description: string;
  failure_count: number;
}

export type AuditEvent = AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent;

// 차트 데이터 타입
export interface ChartDataPoint {
  time: string;
  count: number;
  timestamp: number;
}

export interface ChartData {
  [key: string]: ChartDataPoint[];
}

// 사용자 타입
export interface User {
  id: string;
  username: string;
  email?: string;
}
