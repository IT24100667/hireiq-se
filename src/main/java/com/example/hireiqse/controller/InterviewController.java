// controller/InterviewController.java
// Member 06 - Handles interview question generation endpoints.
//
// Endpoints:
//   POST /api/interview/generate   - generate questions for a candidate
//   GET  /api/interview/questions  - get saved questions (?candidateId=1&jobId=1)

package com.example.hireiqse.controller;

import com.example.hireiqse.dto.InterviewQuestionDTO;
import com.example.hireiqse.service.InterviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interview")
public class InterviewController {

    @Autowired private InterviewService interviewService;

    /**
     * Generate interview questions for a candidate.
     * POST /api/interview/generate
     * Body: {
     *   "candidateId": 1,
     *   "jobId": 1
     * }
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateQuestions(@RequestBody Map<String, Object> body) {

        Integer candidateId = toInteger(body.get("candidateId"));
        Integer jobId       = toInteger(body.get("jobId"));

        if (candidateId == null || jobId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "candidateId and jobId are required"));
        }

        try {
            List<InterviewQuestionDTO> questions =
                    interviewService.generateQuestions(candidateId, jobId);
            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get previously saved questions for a candidate.
     * GET /api/interview/questions?candidateId=1&jobId=1
     */
    @GetMapping("/questions")
    public ResponseEntity<?> getQuestions(
            @RequestParam Integer candidateId,
            @RequestParam Integer jobId) {
        try {
            List<InterviewQuestionDTO> questions =
                    interviewService.getQuestions(candidateId, jobId);
            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.intValue();
        try {
            return Integer.parseInt(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}