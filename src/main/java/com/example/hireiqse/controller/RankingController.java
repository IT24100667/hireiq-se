// controller/RankingController.java
// Handles scoring and rankings endpoints.
//
// Endpoints:
//   POST /api/rankings/score          - trigger scoring for all candidates
//   GET  /api/rankings                - get saved rankings for a job (?jobId=1)
//   GET  /api/rankings/candidate      - get one candidate's score detail
//   POST /api/rankings/search         - natural language search

package com.example.hireiqse.controller;

import com.example.hireiqse.dto.ScoreDTO;
import com.example.hireiqse.service.AIClientService;
import com.example.hireiqse.service.RankingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rankings")
public class RankingController {

    @Autowired private RankingService   rankingService;
    @Autowired private AIClientService  aiClientService;

    /**
     * Trigger AI scoring for all ready candidates for a job.
     * HR can also pass custom weights (must sum to 100).
     *
     * POST /api/rankings/score
     * Body: {
     *   "jobId": 1,
     *   "skillsWeight": 40,
     *   "experienceWeight": 30,
     *   "educationWeight": 20,
     *   "extrasWeight": 10
     * }
     */
    @PostMapping("/score")
    public ResponseEntity<?> scoreAll(@RequestBody Map<String, Object> body) {

        Integer jobId             = (Integer) body.get("jobId");
        int skillsWeight          = body.containsKey("skillsWeight")     ? (int) body.get("skillsWeight")     : 40;
        int experienceWeight      = body.containsKey("experienceWeight") ? (int) body.get("experienceWeight") : 30;
        int educationWeight       = body.containsKey("educationWeight")  ? (int) body.get("educationWeight")  : 20;
        int extrasWeight          = body.containsKey("extrasWeight")     ? (int) body.get("extrasWeight")     : 10;

        if (jobId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "jobId is required"));
        }

        // Validate weights
        int total = skillsWeight + experienceWeight + educationWeight + extrasWeight;
        if (total != 100) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Weights must add up to 100. Currently: " + total));
        }

        try {
            List<ScoreDTO> rankings = rankingService.scoreAllCandidates(
                    jobId, skillsWeight, experienceWeight, educationWeight, extrasWeight);
            return ResponseEntity.ok(rankings);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get saved rankings for a job from MySQL.
     * GET /api/rankings?jobId=1
     */
    @GetMapping
    public ResponseEntity<?> getRankings(@RequestParam Integer jobId) {
        if (jobId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "jobId is required"));
        }
        List<ScoreDTO> rankings = rankingService.getRankings(jobId);
        return ResponseEntity.ok(rankings);
    }

    /**
     * Get one candidate's full score breakdown.
     * GET /api/rankings/candidate?candidateId=1&jobId=1
     */
    @GetMapping("/candidate")
    public ResponseEntity<?> getCandidateScore(
            @RequestParam Integer candidateId,
            @RequestParam Integer jobId) {

        ScoreDTO score = rankingService.getCandidateScore(candidateId, jobId);
        if (score == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(score);
    }

    /**
     * Natural language search across all candidates.
     * POST /api/rankings/search
     * Body: { "query": "who has AWS experience?", "jobId": 1, "topK": 10 }
     */
    @PostMapping("/search")
    public ResponseEntity<?> search(@RequestBody Map<String, Object> body) {
        String  query  = (String)  body.getOrDefault("query",  "");
        Integer jobId  = (Integer) body.get("jobId");
        int     topK   = body.containsKey("topK") ? (int) body.get("topK") : 10;

        if (query.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "query is required"));
        }

        try {
            Map<String, Object> results = aiClientService.searchCandidates(query, jobId, topK);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}