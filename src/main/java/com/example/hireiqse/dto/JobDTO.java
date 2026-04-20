// dto/JobDTO.java
// Data shape for sending Job data to/from the frontend.
// Controllers use this, not the Job entity directly.

package com.example.hireiqse.dto;

import lombok.Data;

@Data
public class JobDTO {
    private Integer jobId;
    private String  title;
    private String  description;
    private String  department;
    private String  status;
    private String  createdAt;
}