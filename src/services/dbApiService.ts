import { apiClient } from '../utils/apiClient';

// 쿼리 파라미터 타입 정의
export interface QueryParams {
  start?: string; // ISO-8601 datetime (YYYY-MM-DDTHH:mm:ssZ 형식)
  end?: string; // ISO-8601 datetime (YYYY-MM-DDTHH:mm:ssZ 형식)
  clientIp?: string;
  alertType?: string;
  principal?: string;
  resourceName?: string;
  operation?: string;
}

// 응답 데이터 타입 정의
export interface Certified2TimeRecord {
  id: string;
  clientIp: string;
  alertTimeKST: string;
  alertType: string;
  description: string;
  failureCount: number;
}

export interface CertifiedNotMoveRecord {
  id: string;
  clientIp: string;
  alertTimeKST: string;
  alertType: string;
  description: string;
  failureCount: number;
}

export interface ResourceLevelFalseRecord {
  id: string;
  clientIp: string;
  eventTimeKST: string;
  granted: boolean;
  method_name: string;
  operation: string;
  principal: string;
  processingTimeKST: string;
  resourceName: string;
  resourceType: string;
}

export interface SystemLevelFalseRecord {
  id: string;
  clientIp: string;
  eventTimeKST: string;
  granted: boolean;
  method_name: string;
  operation: string;
  principal: string;
  processingTimeKST: string;
  resourceName: string;
  resourceType: string;
}

export interface GroupCountResult {
  clientIp?: string;
  alertType?: string;
  count: number;
}

// 쿼리 파라미터를 URL 쿼리 스트링으로 변환
const buildQueryString = (params: QueryParams): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

// DB API 서비스 클래스
export class DbApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async makeRequest<T>(endpoint: string, params: QueryParams = {}): Promise<T> {
    if (!this.token) {
      throw new Error('JWT 토큰이 없습니다.');
    }

    const queryString = buildQueryString(params);
    const url = `${endpoint}${queryString}`;
    
    const response = await apiClient.authenticatedRequest('GET', url, undefined, this.token);
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  // 1. certified_2_time 레코드 조회
  async getCertified2TimeRecords(params: QueryParams = {}): Promise<Certified2TimeRecord[]> {
    return this.makeRequest<Certified2TimeRecord[]>('/api/db/certified_2_time', params);
  }

  // 2. certified_2_time 레코드 수 조회
  async getCertified2TimeCount(params: QueryParams = {}): Promise<number> {
    return this.makeRequest<number>('/api/db/certified_2_time/count', params);
  }

  // 3. certified_2_time client_ip별 집계
  async getCertified2TimeGroupByClientIp(params: QueryParams = {}): Promise<GroupCountResult[]> {
    return this.makeRequest<GroupCountResult[]>('/api/db/certified_2_time/count/group/client_ip', params);
  }

  // 4. certified_2_time alert_type별 집계
  async getCertified2TimeGroupByAlertType(params: QueryParams = {}): Promise<GroupCountResult[]> {
    return this.makeRequest<GroupCountResult[]>('/api/db/certified_2_time/count/group/alert_type', params);
  }

  // 5. certified_not_move 레코드 조회
  async getCertifiedNotMoveRecords(params: QueryParams = {}): Promise<CertifiedNotMoveRecord[]> {
    return this.makeRequest<CertifiedNotMoveRecord[]>('/api/db/certified_not_move', params);
  }

  // 6. certified_not_move 레코드 수 조회
  async getCertifiedNotMoveCount(params: QueryParams = {}): Promise<number> {
    return this.makeRequest<number>('/api/db/certified_not_move/count', params);
  }

  // 7. certified_not_move client_ip별 집계
  async getCertifiedNotMoveGroupByClientIp(params: QueryParams = {}): Promise<GroupCountResult[]> {
    return this.makeRequest<GroupCountResult[]>('/api/db/certified_not_move/count/group/client_ip', params);
  }

  // 8. certified_not_move alert_type별 집계
  async getCertifiedNotMoveGroupByAlertType(params: QueryParams = {}): Promise<GroupCountResult[]> {
    return this.makeRequest<GroupCountResult[]>('/api/db/certified_not_move/count/group/alert_type', params);
  }

  // 9. resource_level_false 레코드 조회
  async getResourceLevelFalseRecords(params: QueryParams = {}): Promise<ResourceLevelFalseRecord[]> {
    return this.makeRequest<ResourceLevelFalseRecord[]>('/api/db/resource_level_false', params);
  }

  // 10. resource_level_false 레코드 수 조회
  async getResourceLevelFalseCount(params: QueryParams = {}): Promise<number> {
    return this.makeRequest<number>('/api/db/resource_level_false/count', params);
  }

  // 11. system_level_false 레코드 조회
  async getSystemLevelFalseRecords(params: QueryParams = {}): Promise<SystemLevelFalseRecord[]> {
    return this.makeRequest<SystemLevelFalseRecord[]>('/api/db/system_level_false', params);
  }

  // 12. system_level_false 레코드 수 조회
  async getSystemLevelFalseCount(params: QueryParams = {}): Promise<number> {
    return this.makeRequest<number>('/api/db/system_level_false/count', params);
  }
}

// 싱글톤 인스턴스
export const dbApiService = new DbApiService();
