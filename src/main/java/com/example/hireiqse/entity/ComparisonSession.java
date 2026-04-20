// entity/ComparisonSession.java
// Member 04 - Stores each comparison HR runs.
// Lets HR revisit past comparisons without re-running Gemini.

package com.example.hireiqse.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "comparison_sessions")
public class ComparisonSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Integer sessionId;

    @Column(name = "job_id", nullable = false)
    private Integer jobId;

    // Stored as comma-separated IDs e.g. "1,2,3"
    @Column(name = "candidate_ids", nullable = false)
    private String candidateIds;

    // Context HR selected for recommendation
    @Column(name = "role_type")
    private String roleType;

    @Column(name = "company_culture")
    private String companyCulture;

    @Column(name = "top_priority")
    private String topPriority;

    // AI recommendation text saved so we don't re-call Gemini
    @Column(name = "recommendation", columnDefinition = "LONGTEXT")
    private String recommendation;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}