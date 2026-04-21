// PipelineStageRepository.java
// Path: src/main/java/com/example/hireiqse/repository/PipelineStageRepository.java

package com.example.hireiqse.repository;

import com.example.hireiqse.entity.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PipelineStageRepository extends JpaRepository<PipelineStage, Integer> {

    // Get all candidates in a specific stage for a job
    // Used to build each column of the Kanban board
    List<PipelineStage> findByJobIdAndStage(Integer jobId, String stage);

    // Get all pipeline records for a job (all stages combined)
    List<PipelineStage> findByJobId(Integer jobId);

    // Get the most recent stage record for a specific candidate in a job
    // "TopBy...OrderByUpdatedAtDesc" = most recently updated row
    Optional<PipelineStage> findTopByCandidateIdAndJobIdOrderByUpdatedAtDesc(
            Integer candidateId, Integer jobId);

    // Get full stage history for a candidate in a job, oldest first
    List<PipelineStage> findByCandidateIdAndJobIdOrderByUpdatedAtAsc(
            Integer candidateId, Integer jobId);

    // Delete all pipeline records for a candidate in a specific job
    void deleteAllByCandidateIdAndJobId(Integer candidateId, Integer jobId);
}