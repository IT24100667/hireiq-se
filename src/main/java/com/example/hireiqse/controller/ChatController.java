package com.example.hireiqse.controller;

import com.example.hireiqse.entity.ChatHistory;
import com.example.hireiqse.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    // POST /api/chat/message 
    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, Object> body) {

        String  message   = (String)  body.get("message");
        String  sessionId = (String)  body.get("sessionId");
        Integer jobId     = body.get("jobId") != null
                ? Integer.valueOf(body.get("jobId").toString()) : null;

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false, "error", "Message cannot be empty"));
        }

        if (sessionId == null || sessionId.trim().isEmpty()) {
            sessionId = "session_" + UUID.randomUUID().toString().substring(0, 8);
        }

        try {
            String botResponse = chatService.handleMessage(sessionId, message.trim(), jobId);
            Map<String, Object> response = new HashMap<>();
            response.put("success",   true);
            response.put("response",  botResponse);
            response.put("sessionId", sessionId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false, "error", "Chat failed: " + e.getMessage()));
        }
    }

    // GET /api/chat/sessions 
    // Returns all past sessions for the sidebar (one entry per session)
    @GetMapping("/sessions")
    public ResponseEntity<List<Map<String, Object>>> getAllSessions() {
        return ResponseEntity.ok(chatService.getAllSessions());
    }

    // GET /api/chat/history/{sessionId} 
    // Returns full conversation to reload when HR clicks a session
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<List<ChatHistory>> getSessionHistory(@PathVariable("sessionId") String sessionId) {
        return ResponseEntity.ok(chatService.getSessionHistory(sessionId));
    }

    // DELETE /api/chat/session/{sessionId} 
    // Deletes all messages belonging to a session
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Map<String, String>> deleteSession(@PathVariable("sessionId") String sessionId) {
        chatService.deleteSession(sessionId);
        return ResponseEntity.ok(Map.of("message", "Session deleted successfully"));
    }

    // GET /api/chat/job/{jobId}
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<ChatHistory>> getJobHistory(@PathVariable("jobId") Integer jobId) {
        return ResponseEntity.ok(chatService.getJobHistory(jobId));
    }
}
