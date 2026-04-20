package com.example.hireiqse.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "candidate_scores")
public class CandidateScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "score_id")
    private Integer scoreId;

    @Column(name = "candidate_id", nullable = false)
    private Integer candidateId;

    @Column(name = "job_id", nullable = false)
    private Integer jobId;

    @Column(name = "total_score")      private Integer totalScore;
    @Column(name = "skills_score")     private Integer skillsScore;
    @Column(name = "experience_score") private Integer experienceScore;
    @Column(name = "education_score")  private Integer educationScore;
    @Column(name = "extras_score")     private Integer extrasScore;

    @Column(name = "skills_weight")     private Integer skillsWeight;
    @Column(name = "experience_weight") private Integer experienceWeight;
    @Column(name = "education_weight")  private Integer educationWeight;
    @Column(name = "extras_weight")     private Integer extrasWeight;

    @Column(name = "matched_skills",        columnDefinition = "TEXT")    private String matchedSkills;
    @Column(name = "missing_skills",        columnDefinition = "TEXT")    private String missingSkills;
    @Column(name = "requirement_checklist", columnDefinition = "LONGTEXT") private String requirementChecklist;
    @Column(name = "ai_summary",            columnDefinition = "TEXT")    private String aiSummary;
    @Column(name = "experience_evidence",   columnDefinition = "TEXT")    private String experienceEvidence;

    @Column(name = "confidence_score") private Float  confidenceScore;
    @Column(name = "status")           private String status;
    @Column(name = "scored_at")        private LocalDateTime scoredAt;


    @Column(name = "company_type")   private String  companyType;
    @Column(name = "has_leadership") private Boolean hasLeadership;
    @Column(name = "industry")       private String  industry;
    @Column(name = "notice_period")  private String  noticePeriod;

    @PrePersist
    public void prePersist() {
        if (this.scoredAt        == null) this.scoredAt        = LocalDateTime.now();
        if (this.status          == null) this.status          = "pending";
        if (this.skillsWeight    == null) this.skillsWeight    = 40;
        if (this.experienceWeight== null) this.experienceWeight= 30;
        if (this.educationWeight == null) this.educationWeight = 20;
        if (this.extrasWeight    == null) this.extrasWeight    = 10;
        if (this.companyType     == null) this.companyType     = "unknown";
        if (this.hasLeadership   == null) this.hasLeadership   = false;
        if (this.industry        == null) this.industry        = "other";
        if (this.noticePeriod    == null) this.noticePeriod    = "not mentioned";
    }
}