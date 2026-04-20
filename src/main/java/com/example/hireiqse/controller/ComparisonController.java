// controller/ComparisonController.java
// Member 04 - Comparison & Recommendation endpoints.
//
// GET  /api/comparison/candidates?jobId=1  - get scored candidates for selection
// POST /api/comparison/compare             - compare selected candidates
// POST /api/comparison/recommend           - generate AI recommendation (saves session)
// GET  /api/comparison/history?jobId=1     - get past comparison sessions

package com.example.hireiqse.controller;

import com.example.hireiqse.dto.ComparisonSessionDTO;
import com.example.hireiqse.dto.ScoreDTO;
import com.example.hireiqse.service.ComparisonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comparison")
public class ComparisonController {

    @Autowired private ComparisonService comparisonService;

    /**
     * Get all scored candidates for a job so HR can pick which to compare.
     * GET /api/comparison/candidates?jobId=1
     */
    @GetMapping("/candidates")
    public ResponseEntity<?> getScoredCandidates(@RequestParam Integer jobId) {
        try {
            List<ScoreDTO> candidates = comparisonService.getScoredCandidates(jobId);
            return ResponseEntity.ok(candidates);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Compare 2-3 candidates - returns trade-offs and saves a session.
     * POST /api/comparison/compare
     * Body: { "jobId": 1, "candidateIds": [1, 2] }
     */
    @PostMapping("/compare")
    public ResponseEntity<?> compare(@RequestBody Map<String, Object> body) {
        try {
            Integer jobId = (Integer) body.get("jobId");
            @SuppressWarnings("unchecked")
            List<Integer> candidateIds = (List<Integer>) body.get("candidateIds");

            if (jobId == null || candidateIds == null || candidateIds.size() < 2)
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "jobId and at least 2 candidateIds required"));

            Map<String, Object> result = comparisonService.compareCandidates(jobId, candidateIds);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Generate AI recommendation and save full session to DB.
     * POST /api/comparison/recommend
     * Body: {
     *   "jobId": 1,
     *   "candidateIds": [1, 2],
     *   "sessionId": 3,           (optional - from compare step)
     *   "roleType": "Senior",
     *   "companyCulture": "Startup",
     *   "topPriority": "Technical skills"
     * }
     */
    @PostMapping("/recommend")
    public ResponseEntity<?> recommend(@RequestBody Map<String, Object> body) {
        try {
            Integer jobId     = (Integer) body.get("jobId");
            Integer sessionId = (Integer) body.get("sessionId");  // optional
            @SuppressWarnings("unchecked")
            List<Integer> candidateIds = (List<Integer>) body.get("candidateIds");
            String roleType       = (String) body.getOrDefault("roleType",       "Mid-level");
            String companyCulture = (String) body.getOrDefault("companyCulture", "Corporate");
            String topPriority    = (String) body.getOrDefault("topPriority",    "Technical skills");

            if (jobId == null || candidateIds == null || candidateIds.size() < 2)
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "jobId and at least 2 candidateIds required"));

            Map<String, Object> result = comparisonService.generateRecommendation(
                    jobId, candidateIds, roleType, companyCulture, topPriority, sessionId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get past comparison sessions for a job.
     * GET /api/comparison/history?jobId=1
     */
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam Integer jobId) {
        try {
            List<ComparisonSessionDTO> sessions = comparisonService.getPastSessions(jobId);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}