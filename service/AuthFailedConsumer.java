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
public class AuthFailedConsumer {

    private final SseService sseService;

    @KafkaListener(
            topics = "${KAFKA_TOPIC_AUTH_FAILED}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onAuthFailed(String message) {
        log.info("access-failed: {}", message);
        
        sendMessageToClients(sseService.getAuthFailedEmitters(), message, "auth_failed");
    }
    
    private void sendMessageToClients(
            Map<String, SseEmitter> emitters,
                                    String message, String eventName) {
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