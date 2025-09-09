package com.finalproject.springbackend.controller;

import com.finalproject.springbackend.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/kafka")
@RequiredArgsConstructor
public class KafkaSecurityAuditLogController {

    private final SseService sseService;
    
    @Value("${CLUSTER_ID}")
    private String clusterId;

    // 1. 실시간 스트리밍 API: 정제 전 데이터
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getStreamLogs(
            @RequestParam(required = false) String topics,
            @RequestParam(required = false) String users,
            @RequestParam(required = false) String status
    ) {
        return sseService.createRawLogStream();
    }

    // 2. 인증된 접근 로그 스트리밍
    @GetMapping(value = "/auth", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getAuthorizedAccess() {
        return sseService.createAuthorizedStream();
    }

    // 3. 인증되지 않은 접근 로그 스트리밍
    @GetMapping(value = "/unauth", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getUnauthorizedAccess() {
        return sseService.createUnauthorizedStream();
    }

    // 4. 인증 실패 로그 스트리밍
    @GetMapping(value = "/auth_failed", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getAuthFailed() {
        return sseService.createAuthFailedStream();
    }
}