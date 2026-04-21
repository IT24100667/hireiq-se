// PipelineController.java
// Path: src/main/java/com/example/hireiqse/controller/PipelineController.java
//
// Handles all HTTP requests related to the hiring pipeline.
// No logic here — just receives requests and calls PipelineService.
// Frontend (kanban.html) calls these endpoints via fetch().

package com.example.hireiqse.controller;

import com.example.hireiqse.entity.PipelineStage;
import com.example.hireiqse.service.PipelineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/pipeline")
public class PipelineController {

    @Autowired
    private PipelineService pipelineService;

    // ── GET /api/pipeline/board/{jobId} ───────────────────────────────────
    // Returns all 4 Kanban columns for a job.
    // Response shape: { "SCREENED": [...], "INTERVIEWED": [...], ... }
    @GetMapping("/board/{jobId}")
    public ResponseEntity<Map<String, List<PipelineStage>>> getBoard(
            @PathVariable Integer jobId) {
        return ResponseEntity.ok(pipelineService.getKanbanBoard(jobId));
    }

    // ── POST /api/pipeline/add ────────────────────────────────────────────
    // Adds a candidate to the pipeline at SCREENED stage.
    // Body: { "candidateId": 1, "jobId": 1 }
    @PostMapping("/add")
    public ResponseEntity<PipelineStage> addToPipeline(
            @RequestBody Map<String, Integer> body) {
        Integer candidateId = body.get("candidateId");
        Integer jobId       = body.get("jobId");
        return ResponseEntity.ok(pipelineService.addToPipeline(candidateId, jobId));
    }

    // ── POST /api/pipeline/next ───────────────────────────────────────────
    // Moves candidate forward one stage (▶ button on card).
    // Body: { "candidateId": 1, "jobId": 1 }
    @PostMapping("/next")
    public ResponseEntity<PipelineStage> moveNext(
            @RequestBody Map<String, Integer> body) {
        Integer candidateId = body.get("candidateId");
        Integer jobId       = body.get("jobId");
        return ResponseEntity.ok(pipelineService.moveToNextStage(candidateId, jobId));
    }

    // ── POST /api/pipeline/prev ───────────────────────────────────────────
    // Moves candidate back one stage (◀ button on card).
    // Body: { "candidateId": 1, "jobId": 1 }
    @PostMapping("/prev")
    public ResponseEntity<PipelineStage> movePrev(
            @RequestBody Map<String, Integer> body) {
        Integer candidateId = body.get("candidateId");
        Integer jobId       = body.get("jobId");
        return ResponseEntity.ok(pipelineService.moveToPrevStage(candidateId, jobId));
    }

    // ── POST /api/pipeline/set-stage ─────────────────────────────────────
    // Sets a specific stage directly (used for REJECTED or direct jumps).
    // Body: { "candidateId": "1", "jobId": "1", "stage": "REJECTED" }
    // Note: values come as Strings from JSON when mixed with "stage" field
    @PostMapping("/set-stage")
    public ResponseEntity<PipelineStage> setStage(
            @RequestBody Map<String, String> body) {
        Integer candidateId = Integer.parseInt(body.get("candidateId"));
        Integer jobId       = Integer.parseInt(body.get("jobId"));
        String  stage       = body.get("stage");
        return ResponseEntity.ok(pipelineService.setStage(candidateId, jobId, stage));
    }

    // ── GET /api/pipeline/history?candidateId=1&jobId=1 ──────────────────
    // Returns the full stage history for a candidate (oldest first).
    @GetMapping("/history")
    public ResponseEntity<List<PipelineStage>> getHistory(
            @RequestParam Integer candidateId,
            @RequestParam Integer jobId) {
        return ResponseEntity.ok(pipelineService.getHistory(candidateId, jobId));
    }

    // ── GET /api/pipeline/current?candidateId=1&jobId=1 ──────────────────
    // Returns the current stage of a candidate. 404 if not in pipeline yet.
    @GetMapping("/current")
    public ResponseEntity<?> getCurrent(
            @RequestParam Integer candidateId,
            @RequestParam Integer jobId) {
        Optional<PipelineStage> stage = pipelineService.getCurrentStage(candidateId, jobId);
        if (stage.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(stage.get());
    }

    // ── DELETE /api/pipeline/remove ───────────────────────────────────────
    // Removes a candidate from the pipeline entirely.
    // Body: { "candidateId": 1, "jobId": 1 }
    @DeleteMapping("/remove")
    public ResponseEntity<Void> removeFromPipeline(
            @RequestBody Map<String, Integer> body) {
        Integer candidateId = body.get("candidateId");
        Integer jobId       = body.get("jobId");
        pipelineService.removeFromPipeline(candidateId, jobId);
        return ResponseEntity.ok().build();
    }
}