
package com.example.hireiqse.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "jobs")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "job_id")
    private Integer jobId;

    // e.g. "Senior Software Engineer"
    @Column(name = "title", nullable = false)
    private String title;

    // Full job description - used by Member 01 for AI scoring
    @Column(name = "description", columnDefinition = "LONGTEXT")
    private String description;

    // e.g. "Engineering", "Marketing"
    @Column(name = "department")
    private String department;

    // "open" or "closed"
    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "open";
        }
    }
}