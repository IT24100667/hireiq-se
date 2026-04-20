package com.example.hireiqse.dto;

import lombok.Data;

@Data
public class ScoreDTO {
    private Integer scoreId;
    private Integer candidateId;
    private Integer jobId;

    // candidate info
    private String  fullName;
    private String  email;
    private String  phone;

    // Scores
    private Integer totalScore;
    private Integer skillsScore;
    private Integer experienceScore;
    private Integer educationScore;
    private Integer extrasScore;

    // weights
    private Integer skillsWeight;
    private Integer experienceWeight;
    private Integer educationWeight;
    private Integer extrasWeight;

    // AI Output
    private String matchedSkills;
    private String missingSkills;
    private String requirementChecklist;
    private String aiSummary;

    // Status
    private Float  confidenceScore;
    private String status;
    private String scoredAt;

    // Member 04 fields
    private String  companyType;
    private Boolean hasLeadership;
    private String  industry;
    private String  noticePeriod;
}