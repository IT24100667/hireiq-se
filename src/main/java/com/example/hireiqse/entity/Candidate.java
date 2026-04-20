
package com.example.hireiqse.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "candidates")
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "candidate_id")
    private Integer candidateId;

    // Which job this candidate applied for
    @Column(name = "job_id")
    private Integer jobId;

    // Contact info extracted by Flask
    @Column(name = "full_name")
    private String fullName;

    @Column(name = "email")
    private String email;

    @Column(name = "phone")
    private String phone;

    // File info
    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    // Absolute/relative path of saved original upload (for later download)
    @Column(name = "stored_file_path")
    private String storedFilePath;

    // Full cleaned resume text returned by Flask
    @Column(name = "raw_text", columnDefinition = "LONGTEXT")
    private String rawText;

    // How many chunks Flask created from this resume
    @Column(name = "chunk_count")
    private Integer chunkCount;

    // Current state: processing / ready / failed
    @Column(name = "status")
    private String status;

    // Filled in if status = "failed"
    @Column(name = "error_message")
    private String errorMessage;

    // Recruiter notes for this candidate (editable in candidate detail page)
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    // Runs automatically before a new row is inserted
    @PrePersist
    public void prePersist() {
        this.uploadedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "processing";
        }
    }
}