package com.example.hireiqse.controller;

import com.example.hireiqse.dto.JdAnalysisDTO;
import com.example.hireiqse.service.JdService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jd")
public class JdController {

    @Autowired private JdService jdService;

    /**
     * Analyze and refine a job description.
     * POST /api/jd/analyze
     * Body: {
     *   "originalJd": "We are looking for a developer...",
     *   "jobId": 1   (optional)
     * }
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeJd(@RequestBody Map<String, Object> body) {

        String originalJd = (String) body.get("originalJd");
        Integer jobId     = toInteger(body.get("jobId"));

        if (originalJd == null || originalJd.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "originalJd is required"));
        }

        try {
            JdAnalysisDTO result = jdService.analyzeJd(originalJd.trim(), jobId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get past JD analyses for a job.
     * GET /api/jd/history?jobId=1
     */
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam Integer jobId) {
        try {
            List<JdAnalysisDTO> history = jdService.getAnalysesForJob(jobId);
            return ResponseEntity.ok(history);
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