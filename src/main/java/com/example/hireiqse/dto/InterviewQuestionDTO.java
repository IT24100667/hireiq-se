

package com.example.hireiqse.dto;

import lombok.Data;

@Data
public class InterviewQuestionDTO {

    private Integer questionId;
    private Integer candidateId;
    private Integer jobId;
    private String  category;       // MISSING_SKILLS, WEAK_EXPERIENCE, RED_FLAGS
    private String  questionText;
    private String  reason;
    private String  createdAt;
}