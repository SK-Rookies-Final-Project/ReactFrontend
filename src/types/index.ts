// api/auth/auth_system
export interface AuthSystemEvent {
  id: string;
  eventTimeKST: string; // KST 형식 문자열 (camelCase)
  processingTimeKST: string; // KST 형식 문자열 (camelCase)
  principal: string;
  clientIp: string; // camelCase
  methodName: string; // camelCase
  granted: boolean;
  resourceType: string; // camelCase
  resourceName: string; // camelCase
  operation: string;
}

// api/auth/auth_resource
export interface AuthResourceEvent {
  id: string;
  eventTimeKST: string; // KST 형식 문자열 (camelCase)
  processingTimeKST: string; // KST 형식 문자열 (camelCase)
  principal: string;
  clientIp: string; // camelCase
  methodName: string; // camelCase
  granted: boolean;
  resourceType: string; // camelCase
  resourceName: string; // camelCase
  operation: string;
}

// api/auth/auth_failure
export interface AuthFailureEvent {
  id: string;
  clientIp: string; // camelCase
  alertTimeKST: string; // camelCase
  alertType: string; // camelCase
  description: string;
  failureCount: number; // camelCase
}

// api/auth/auth_suspicious
export interface AuthSuspiciousEvent {
  id: string;
  clientIp: string; // camelCase
  alertTimeKST: string; // camelCase
  alertType: string; // camelCase
  description: string;
  failureCount: number; // camelCase
}

// 모든 이벤트 타입들
export type AuditEvent = AuthSystemEvent | AuthResourceEvent | AuthFailureEvent | AuthSuspiciousEvent;


// 사용자 타입
export interface User {
  id: string;
  username: string;
  email?: string;
}
