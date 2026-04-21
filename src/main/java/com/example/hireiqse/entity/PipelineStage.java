// PipelineStage.java
// Path: src/main/java/com/example/hireiqse/entity/PipelineStage.java
//
// One row = one candidate's current stage in a job's hiring pipeline.
// When a candidate moves stages, we UPDATE this row (not insert a new one).

package com.example.hireiqse.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pipeline_stages")
public class PipelineStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pipeline_id")
    private Integer pipelineId;

    @Column(name = "candidate_id", nullable = false)
    private Integer candidateId;

    @Column(name = "job_id", nullable = false)
    private Integer jobId;

    // Current stage: SCREENED, INTERVIEWED, OFFERED, HIRED, REJECTED
    @Column(name = "stage", nullable = false)
    private String stage;

    // Optional HR notes about this candidate at this stage
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // JPA calls these automatically before saving/updating
    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ── Getters ────────────────────────────────────────────
    public Integer getPipelineId()      { return pipelineId; }
    public Integer getCandidateId()     { return candidateId; }
    public Integer getJobId()           { return jobId; }
    public String  getStage()           { return stage; }
    public String  getNotes()           { return notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    // ── Setters ────────────────────────────────────────────
    public void setPipelineId(Integer pipelineId)     { this.pipelineId = pipelineId; }
    public void setCandidateId(Integer candidateId)   { this.candidateId = candidateId; }
    public void setJobId(Integer jobId)               { this.jobId = jobId; }
    public void setStage(String stage)                { this.stage = stage; }
    public void setNotes(String notes)                { this.notes = notes; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}