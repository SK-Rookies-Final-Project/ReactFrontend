// 네트워크 상태 확인 유틸리티


export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return '요청이 시간 초과되었습니다.';
    }
    if (error.message.includes('Failed to fetch')) {
      return '네트워크 연결을 확인해주세요.';
    }
    if (error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
      return '시스템 리소스가 부족합니다. 브라우저를 재시작해주세요.';
    }
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
};


