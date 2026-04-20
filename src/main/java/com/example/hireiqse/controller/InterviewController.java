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
    @DeleteMapping("/questions/{id}")
    public ResponseEntity<?> deleteQuestion(@PathVariable Integer id) {
        try {
            interviewService.deleteQuestion(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", e.getMessage()));
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