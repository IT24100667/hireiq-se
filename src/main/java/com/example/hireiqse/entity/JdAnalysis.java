package com.example.hireiqse.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "jd_analyses")
public class JdAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_id")
    private Integer analysisId;

    @Column(name = "job_id")
    private Integer jobId;

    @Column(name = "original_jd", columnDefinition = "LONGTEXT", nullable = false)
    private String originalJd;

    @Column(name = "quality_score")
    private Integer qualityScore;

    @Column(name = "issues_found", columnDefinition = "LONGTEXT")
    private String issuesFound;

    @Column(name = "refined_jd", columnDefinition = "LONGTEXT")
    private String refinedJd;

    @Column(name = "improvement_summary", columnDefinition = "TEXT")
    private String improvementSummary;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}