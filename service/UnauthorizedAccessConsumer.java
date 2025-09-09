package com.finalproject.springbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UnauthorizedAccessConsumer {

    private final SseService sseService;

    // Spring Boot 애플리케이션이 시작할 때
    @KafkaListener(
            topics = "${KAFKA_TOPIC_UNAUTHORIZED_ACCESS}", //해당 토픽을 구독하고
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onUnauthorized(String message) {
        log.info("unauthorized-access: {}", message);
        
        sendMessageToClients(
                sseService.getUnauthorizedEmitters(),
                message,
                "unauth"
        );
    }
    
    private void sendMessageToClients(
            Map<String, SseEmitter> emitters,
            String message,
            String eventName
    ) {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(message, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                log.error("SSE 전송 중 오류 발생: {}", e.getMessage());
                emitters.remove(clientId);
            }
        });
    }
}