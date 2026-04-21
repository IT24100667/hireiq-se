// PipelineService.java
// Path: src/main/java/com/example/hireiqse/service/PipelineService.java
//
// Handles all pipeline stage logic.
// No AI calls here — this is pure database workflow logic.
// Called by: PipelineController.java

package com.example.hireiqse.service;

import com.example.hireiqse.entity.PipelineStage;
import com.example.hireiqse.repository.PipelineStageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class PipelineService {

    @Autowired
    private PipelineStageRepository pipelineStageRepository;

    // The 4 forward-progress stages in order.
    // REJECTED is a side-exit and handled separately via setStage().
    private static final List<String> STAGE_ORDER =
            Arrays.asList("SCREENED", "INTERVIEWED", "OFFERED", "HIRED");

    // ── Get Kanban board data for a job ───────────────────────────────────
    // Returns a map: { "SCREENED": [...], "INTERVIEWED": [...], ... }
    // Each list contains PipelineStage rows for that column.
    public Map<String, List<PipelineStage>> getKanbanBoard(Integer jobId) {
        // LinkedHashMap preserves insertion order so columns appear in correct order
        Map<String, List<PipelineStage>> board = new LinkedHashMap<>();
        for (String stage : STAGE_ORDER) {
            board.put(stage, pipelineStageRepository.findByJobIdAndStage(jobId, stage));
        }
        return board;
    }

    // ── Add a candidate to the pipeline ──────────────────────────────────
    // Entry point is always SCREENED.
    // If candidate is already in the pipeline, return existing record (no duplicate).
    public PipelineStage addToPipeline(Integer candidateId, Integer jobId) {
        Optional<PipelineStage> existing =
                pipelineStageRepository.findTopByCandidateIdAndJobIdOrderByUpdatedAtDesc(
                        candidateId, jobId);

        // Already in pipeline — return as-is, don't overwrite their progress
        if (existing.isPresent()) return existing.get();

        PipelineStage ps = new PipelineStage();
        ps.setCandidateId(candidateId);
        ps.setJobId(jobId);
        ps.setStage("SCREENED");
        return pipelineStageRepository.save(ps);
    }

    // ── Move candidate forward one stage ─────────────────────────────────
    // SCREENED → INTERVIEWED → OFFERED → HIRED
    public PipelineStage moveToNextStage(Integer candidateId, Integer jobId) {
        Optional<PipelineStage> existing =
                pipelineStageRepository.findTopByCandidateIdAndJobIdOrderByUpdatedAtDesc(
                        candidateId, jobId);

        String currentStage = existing.map(PipelineStage::getStage).orElse("SCREENED");
        int currentIndex    = STAGE_ORDER.indexOf(currentStage);

        // Already at HIRED — can't go further
        if (currentIndex >= STAGE_ORDER.size() - 1) {
            return existing.orElseThrow();
        }

        String nextStage = STAGE_ORDER.get(currentIndex + 1);
        return saveStageChange(candidateId, jobId, nextStage, existing.orElse(null));
    }

    // ── Move candidate backward one stage ────────────────────────────────
    // Useful if HR made a mistake
    public PipelineStage moveToPrevStage(Integer candidateId, Integer jobId) {
        Optional<PipelineStage> existing =
                pipelineStageRepository.findTopByCandidateIdAndJobIdOrderByUpdatedAtDesc(
                        candidateId, jobId);

        String currentStage = existing.map(PipelineStage::getStage).orElse("SCREENED");
        int currentIndex    = STAGE_ORDER.indexOf(currentStage);

        // Already at SCREENED — can't go back further
        if (currentIndex <= 0) {
            return existing.orElseThrow();
        }

        String prevStage = STAGE_ORDER.get(currentIndex - 1);
        return saveStageChange(candidateId, jobId, prevStage, existing.orElse(null));
    }

    // ── Set a specific stage directly ─────────────────────────────────────
    // Used for REJECTED (side-exit) or jumping to a specific stage
    public PipelineStage setStage(Integer candidateId, Integer jobId, String stage) {
        Optional<PipelineStage> existing =
                pipelineStageRepository.findTopByCandidateIdAndJobIdOrderByUpdatedAtDesc(
                        candidateId, jobId);
        return saveStageChange(candidateId, jobId, stage.toUpperCase(), existing.orElse(null));
    }

    // ── Get stage change history for a candidate ──────────────────────────
    public List<PipelineStage> getHistory(Integer candidateId, Integer jobId) {
        return pipelineStageRepository
                .findByCandidateIdAndJobIdOrderByUpdatedAtAsc(candidateId, jobId);
    }

    // ── Get current stage of a candidate ──────────────────────────────────
    public Optional<PipelineStage> getCurrentStage(Integer candidateId, Integer jobId) {
        return pipelineStageRepository
                .findTopByCandidateIdAndJobIdOrderByUpdatedAtDesc(candidateId, jobId);
    }

    // ── Remove a candidate from the pipeline entirely ───────────────────
    @Transactional
    public void removeFromPipeline(Integer candidateId, Integer jobId) {
        pipelineStageRepository.deleteAllByCandidateIdAndJobId(candidateId, jobId);
    }

    // ── Internal helper: update existing row or create new one ────────────
    private PipelineStage saveStageChange(Integer candidateId, Integer jobId,
                                          String newStage, PipelineStage existing) {
        // Reuse the existing row so we don't create duplicate records per candidate
        PipelineStage ps = (existing != null) ? existing : new PipelineStage();
        ps.setCandidateId(candidateId);
        ps.setJobId(jobId);
        ps.setStage(newStage);
        return pipelineStageRepository.save(ps);
    }
}