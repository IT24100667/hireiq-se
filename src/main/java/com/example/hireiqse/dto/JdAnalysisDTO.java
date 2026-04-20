

package com.example.hireiqse.dto;

import lombok.Data;

@Data
public class JdAnalysisDTO {

    private Integer analysisId;
    private Integer jobId;
    private String  originalJd;
    private Integer qualityScore;
    private String  issuesFound;     
    private String  refinedJd;
    private String  improvementSummary;
    private String  createdAt;
}