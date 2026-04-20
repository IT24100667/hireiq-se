// dto/CandidateDTO.java
// Data Transfer Object for Candidate.
//
// Why do we need this when we already have Candidate.java (the entity)?
// The entity maps directly to the database table - it may contain
// fields we don't want to expose to the frontend (like raw_text which
// is a huge block of text). The DTO lets us control exactly what
// gets sent back in API responses.
//
// Rule: Controllers receive and return DTOs, not entities.
//       Services convert between DTOs and entities.

package com.example.hireiqse.dto;

import lombok.Data;

@Data
public class CandidateDTO {

    private Integer candidateId;
    private Integer jobId;
    private String  fullName;
    private String  email;
    private String  phone;
    private String  originalFilename;
    private String  fileType;
    private Integer chunkCount;
    private String  status;
    private String  uploadedAt;
    private String  notes;
    private boolean hasDocument;

    // Note: rawText is intentionally excluded.
    // It's a large field used internally - no need to send it to the frontend.
}