package com.finalproject.springbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.Arrays;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogConsumer {

    private final SseService sseService;

    @Value("${KAFKA_TOPIC_AUDIT_LOG}")
    private String topics;

    public String[] getTopics() {
        String raw = topics.trim();

        // 앞뒤 따옴표 제거
        if ((raw.startsWith("'") && raw.endsWith("'")) ||
            (raw.startsWith("\"") && raw.endsWith("\""))) {
            raw = raw.substring(1, raw.length() - 1);
        }

        // 여러 개 토픽을 배열로 반환
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    @KafkaListener(
            topics = "#{__listener.getTopics()}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void consume(String message) {
//        log.info("confluent-audit-log-events: {}", message);

        // SSE Service를 통해 메시지 전송
        sendMessageToClients(
                sseService.getRawLogEmitters(),
                message,
                "streams");
    }

    private void sendMessageToClients(
            java.util.Map<String, SseEmitter> emitters,
            String message,
            String eventName
    ) {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(message, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                System.err.println("SSE 전송 중 오류 발생: " + e.getMessage());
                e.printStackTrace();
                // 오류 발생한 연결 제거
                emitters.remove(clientId);
            }
        });
    }
}