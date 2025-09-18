/**
 * 백엔드 API와의 시간 형식 호환성을 위한 유틸리티 함수들
 * 백엔드는 Java의 OffsetDateTime을 사용하며 YYYY-MM-DDTHH:mm:ssZ 형식을 기대합니다.
 */

/**
 * Date 객체를 백엔드가 기대하는 ISO-8601 형식으로 변환 (UTC 기준)
 * @param date Date 객체
 * @returns YYYY-MM-DDTHH:mm:ssZ 형식의 문자열 (UTC 시간)
 */
export const formatToBackendDateTime = (date: Date): string => {
  // UTC 시간으로 변환하여 정확한 시간 전송
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
};

/**
 * datetime-local input 값을 백엔드 형식으로 변환
 * 한국 시간(KST)을 UTC로 변환하여 전송
 * @param datetimeLocal "YYYY-MM-DDTHH:mm" 형식의 문자열
 * @returns YYYY-MM-DDTHH:mm:ssZ 형식의 문자열 (UTC 시간)
 */
export const convertDateTimeLocalToBackend = (datetimeLocal: string): string => {
  if (!datetimeLocal) return '';
  
  // datetime-local 값을 한국 시간으로 해석하여 Date 객체 생성
  const koreanTime = new Date(datetimeLocal);
  
  // 한국 시간을 UTC로 변환하여 ISO 문자열로 반환
  return koreanTime.toISOString();
};

/**
 * 백엔드 형식의 시간을 datetime-local input에서 사용할 수 있는 형식으로 변환
 * UTC 시간을 한국 시간으로 변환
 * @param backendDateTime YYYY-MM-DDTHH:mm:ssZ 형식의 문자열
 * @returns YYYY-MM-DDTHH:mm 형식의 문자열 (한국 시간)
 */
export const convertBackendToDateTimeLocal = (backendDateTime?: string): string => {
  if (!backendDateTime) return '';
  
  // UTC 시간을 Date 객체로 파싱
  const utcDate = new Date(backendDateTime);
  
  // 한국 시간으로 변환하여 datetime-local 형식으로 반환
  const year = utcDate.getFullYear();
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getDate()).padStart(2, '0');
  const hours = String(utcDate.getHours()).padStart(2, '0');
  const minutes = String(utcDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * 현재 시간부터 지정된 시간만큼 이전 시간까지의 범위를 생성
 * @param hours 몇 시간 전까지의 범위를 생성할지
 * @returns {start: string, end: string} 백엔드 형식의 시간 범위
 */
export const createTimeRange = (hours: number): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  return {
    start: formatToBackendDateTime(start),
    end: formatToBackendDateTime(now)
  };
};

/**
 * 시간 형식이 백엔드가 기대하는 형식인지 검증
 * @param dateTimeString 검증할 시간 문자열
 * @returns 유효한 형식이면 true, 그렇지 않으면 false
 */
export const isValidBackendDateTime = (dateTimeString: string): boolean => {
  // YYYY-MM-DDTHH:mm:ssZ 형식 검증
  const backendDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  return backendDateTimeRegex.test(dateTimeString);
};
