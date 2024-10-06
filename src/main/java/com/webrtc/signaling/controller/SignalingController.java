package com.webrtc.signaling.controller;

import com.webrtc.signaling.dto.SignalingMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
public class SignalingController {

    // 클라이언트로부터 WebRTC 연결을 위한 오퍼를 수신하고,
    // 해당 방(roomId)과 카메라 ID(camId)에 맞춰 모든 클라이언트에게 오퍼를 전달합니다.
    @MessageMapping("/simple-peer/offer/{camId}/{roomId}")
    @SendTo("/topic/simple-peer/answer/{camId}/{roomId}")
    public String simplePeerHandleOffer(@Payload String offer,
                                        @DestinationVariable(value = "roomId") String roomId,
                                        @DestinationVariable(value = "camId") String camId) {
        // 수신한 오퍼를 그대로 반환하여, 연결을 설정하려는 다른 클라이언트에게 전달
        return offer;
    }

    // ICE 후보를 수신하여 해당 방(roomId)에 있는 모든 클라이언트에게 전달합니다.
    // ICE 후보는 WebRTC 연결을 위한 네트워크 정보를 담고 있습니다.
    @MessageMapping("/simple-peer/iceCandidate/{roomId}")
    @SendTo("/topic/simple-peer/iceCandidate/{roomId}")
    public String SimplePeerHandleIceCandidate(@Payload String candidate, @DestinationVariable String roomId) {
        // 수신한 ICE 후보를 그대로 반환
        return candidate;
    }

    // 클라이언트로부터 카메라 ID를 요청받고, 해당 방(roomId)에 있는 모든 클라이언트에게 전달합니다.
    // 이 메서드는 카메라 ID를 요청하는 메시지를 처리합니다.
    @MessageMapping("/simple-peer/cam/getCamId/{roomId}")
    @SendTo("/topic/simple-peer/cam/getCamId/{roomId}")
    public String SimplePeerCamGetCamId(@Payload String body, @DestinationVariable String roomId) {
        // 수신한 메시지를 그대로 반환
        return body;
    }

    // 스트림 카메라 ID를 요청받고, 해당 방(roomId)에 있는 모든 클라이언트에게 전달합니다.
    // 이 메서드는 스트리밍에 필요한 카메라 ID를 처리합니다.
    @MessageMapping("/simple-peer/stream/getCamId/{roomId}")
    @SendTo("/topic/simple-peer/stream/getCamId/{roomId}")
    public String SimplePeerStreamGetCamId(@Payload String body, @DestinationVariable String roomId) {
        // 수신한 메시지를 그대로 반환
        return body;
    }

    // 피어로부터 WebRTC 연결을 위한 오퍼를 수신하고,
    // 해당 방(roomId)과 카메라 키(camKey)에 맞춰 모든 클라이언트에게 오퍼를 전달합니다.
    @MessageMapping("/peer/offer/{camKey}/{roomId}")
    @SendTo("/topic/peer/offer/{camKey}/{roomId}")
    public String PeerHandleOffer(@Payload String offer, @DestinationVariable(value = "roomId") String roomId,
                                  @DestinationVariable(value = "camKey") String camKey) {
        // 수신한 오퍼를 로그에 기록하고,
        // 이를 반환하여 다른 클라이언트에게 전달
        log.info("[OFFER] {} : {}", camKey, offer);
        return offer;
    }

    // 피어로부터 ICE 후보를 수신하고, 해당 방(roomId)과 카메라 키(camKey)에 맞춰 모든 클라이언트에게 전달합니다.
    @MessageMapping("/peer/iceCandidate/{camKey}/{roomId}")
    @SendTo("/topic/peer/iceCandidate/{camKey}/{roomId}")
    public String PeerHandleIceCandidate(@Payload String candidate, @DestinationVariable(value = "roomId") String roomId,
                                         @DestinationVariable(value = "camKey") String camKey) {
        // 수신한 ICE 후보를 로그에 기록하고,
        // 이를 반환하여 다른 클라이언트에게 전달
        log.info("[ICECANDIDATE] {} : {}", camKey, candidate);
        return candidate;
    }

    // 피어로부터 응답을 수신하고, 해당 방(roomId)과 카메라 키(camKey)에 맞춰 모든 클라이언트에게 전달합니다.
    @MessageMapping("/peer/answer/{camKey}/{roomId}")
    @SendTo("/topic/peer/answer/{camKey}/{roomId}")
    public String PeerHandleAnswer(@Payload String answer, @DestinationVariable(value = "roomId") String roomId,
                                   @DestinationVariable(value = "camKey") String camKey) {
        // 수신한 응답을 로그에 기록하고,
        // 이를 반환하여 다른 클라이언트에게 전달
        log.info("[ANSWER] {} : {}", camKey, answer);
        return answer;
    }

    // 호출 키를 수신하고 이를 모든 클라이언트에게 전달합니다.
    // 이 메서드는 특정 호출 이벤트를 처리합니다.
    @MessageMapping("/call/key")
    @SendTo("/topic/call/key")
    public String callKey(@Payload String message) {
        // 수신한 키 메시지를 로그에 기록하고, 이를 반환
        log.info("[Key] : {}", message);
        return message;
    }

    // 전송 키를 수신하고 이를 모든 클라이언트에게 전달합니다.
    // 이 메서드는 클라이언트 간의 키 전송 이벤트를 처리합니다.
    @MessageMapping("/send/key")
    @SendTo("/topic/send/key")
    public String sendKey(@Payload String message) {
        // 수신한 메시지를 그대로 반환
        return message;
    }

    // 피어 스트림 시작 메시지를 수신하고 이를 모든 클라이언트에게 전달합니다.
    // 이 메서드는 스트리밍 시작 이벤트를 처리합니다.
    @MessageMapping("/peer/start/steam")
    @SendTo("/topic/peer/start/steam")
    public String peerStartSteam(@Payload String message) {
        // 수신한 메시지를 그대로 반환
        return message;
    }
}
