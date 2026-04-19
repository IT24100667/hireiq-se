package com.example.hireiqse.service;

import com.example.hireiqse.entity.ChatHistory;
import com.example.hireiqse.repository.ChatHistoryRepository;
import com.example.hireiqse.repository.CandidateScoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ChatService {

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    @Autowired
    private CandidateScoreRepository candidateScoreRepository;

    @Autowired
    private AIClientService aiClientService;

    // Handle one message exchange
    public String handleMessage(String sessionId, String message, Integer jobId) {

        List<Map<String, Object>> candidateScores = fetchCandidateScores(jobId);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("message",          message);
        requestBody.put("session_id",       sessionId);
        requestBody.put("job_id",           jobId);
        requestBody.put("candidate_scores", candidateScores);

        Map<String, Object> flaskResponse = aiClientService.callFlaskPost(
                "/ai/chat/message", requestBody
        );

        String botResponse = "I'm sorry, I could not generate a response.";
        if (flaskResponse != null && Boolean.TRUE.equals(flaskResponse.get("success"))) {
            botResponse = (String) flaskResponse.get("response");
        } else if (flaskResponse != null && flaskResponse.get("error") != null) {
            botResponse = "Error from AI: " + flaskResponse.get("error");
        }

        ChatHistory record = new ChatHistory();
        record.setSessionId(sessionId);
        record.setUserMessage(message);
        record.setBotResponse(botResponse);
        record.setJobId(jobId);
        chatHistoryRepository.save(record);

        return botResponse;
    }

    // Get full conversation for a session
    public List<ChatHistory> getSessionHistory(String sessionId) {
        return chatHistoryRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    // Get all chats for a job 
    public List<ChatHistory> getJobHistory(Integer jobId) {
        return chatHistoryRepository.findByJobIdOrderByCreatedAtDesc(jobId);
    }

    // NEW: Get all sessions for the sidebar 
    public List<Map<String, Object>> getAllSessions() {
        List<ChatHistory> firstMessages = chatHistoryRepository.findFirstMessageOfEachSession();
        List<Map<String, Object>> sessions = new ArrayList<>();

        for (ChatHistory chat : firstMessages) {
            Map<String, Object> session = new HashMap<>();
            session.put("sessionId", chat.getSessionId());
            session.put("createdAt", chat.getCreatedAt());
            String msg = chat.getUserMessage();
            session.put("preview", msg.length() > 60 ? msg.substring(0, 60) + "..." : msg);
            sessions.add(session);
        }
        return sessions;
    }

    // NEW: Delete all messages in a session 
    public void deleteSession(String sessionId) {
        chatHistoryRepository.deleteBySessionId(sessionId);
    }

    // Fetch candidate scores for AI context 
    private List<Map<String, Object>> fetchCandidateScores(Integer jobId) {
        try {
            List<Object[]> rows;
            if (jobId != null) {
                rows = candidateScoreRepository.findScoresWithCandidateNameByJobId(jobId);
            } else {
                rows = candidateScoreRepository.findTopScoresWithCandidateName(20);
            }

            List<Map<String, Object>> result = new ArrayList<>();
            for (Object[] row : rows) {
                Map<String, Object> score = new HashMap<>();
                score.put("full_name",        row[0]);
                score.put("email",            row[1]);
                score.put("total_score",      row[2]);
                score.put("skills_score",     row[3]);
                score.put("experience_score", row[4]);
                score.put("education_score",  row[5]);
                score.put("ai_summary",       row[6]);
                score.put("matched_skills",   row[7]);
                result.add(score);
            }
            return result;

        } catch (Exception e) {
            System.out.println("[ChatService] Could not fetch scores: " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
