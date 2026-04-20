// dto/ComparisonSessionDTO.java
// Member 04 - Shape of comparison session data sent to frontend.

package com.example.hireiqse.dto;

import lombok.Data;

@Data
public class ComparisonSessionDTO {
    private Integer sessionId;
    private Integer jobId;
    private String  candidateIds;
    private String  roleType;
    private String  companyCulture;
    private String  topPriority;
    private String  recommendation;
    private String  createdAt;
}