package com.finalproject.springbackend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {
    
    // SSE Emitter 저장소들
    private final Map<String, SseEmitter> rawLogEmitters = new ConcurrentHashMap<>();
    private final Map<String, SseEmitter> authorizedEmitters = new ConcurrentHashMap<>();
    private final Map<String, SseEmitter> unauthorizedEmitters = new ConcurrentHashMap<>();
    private final Map<String, SseEmitter> authFailedEmitters = new ConcurrentHashMap<>();
    
    // Raw 로그 스트림 생성
    public SseEmitter createRawLogStream() {
        return createSseConnection(rawLogEmitters);
    }
    
    // 인증된 접근 스트림 생성
    public SseEmitter createAuthorizedStream() {
        return createSseConnection(authorizedEmitters);
    }
    
    // 인증되지 않은 접근 스트림 생성
    public SseEmitter createUnauthorizedStream() {
        return createSseConnection(unauthorizedEmitters);
    }
    
    // 인증 실패 스트림 생성
    public SseEmitter createAuthFailedStream() {
        return createSseConnection(authFailedEmitters);
    }
    
    // 공통 SSE 연결 생성 로직
    private SseEmitter createSseConnection(Map<String, SseEmitter> emitterMap) {
        // clientId를 랜덤값으로 정하겠다
        String clientId = java.util.UUID.randomUUID().toString();

        // Long 타입의 최대값을 열어둘 시간으로 지정하고 데이터의 통로를 열어두겠다
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // clientId와 emitter를 연결하겠다
        emitterMap.put(clientId, emitter);
        
        // 연결 종료 시 정리
        emitter.onCompletion(() -> emitterMap.remove(clientId));
        emitter.onTimeout(() -> emitterMap.remove(clientId));
        emitter.onError((throwable) -> emitterMap.remove(clientId));
        
        return emitter;
    }
    
    // Getter 메소드들 - Consumer에서 접근하기 위함
    public Map<String, SseEmitter> getRawLogEmitters() {
        return rawLogEmitters;
    }
    
    public Map<String, SseEmitter> getAuthorizedEmitters() {
        return authorizedEmitters;
    }
    
    public Map<String, SseEmitter> getUnauthorizedEmitters() {
        return unauthorizedEmitters;
    }
    
    public Map<String, SseEmitter> getAuthFailedEmitters() {
        return authFailedEmitters;
    }
}