// entity/TokenUsageLog.java
// Maps to the 'token_usage_log' table in MySQL.
// Every AI call Flask makes gets recorded here.

package com.example.hireiqse.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "token_usage_log")
public class TokenUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Which provider was used for this call
    @Column(name = "provider_id", nullable = false)
    private Integer providerId;

    // Which feature triggered this call: "scoring", "chat", "jd_analysis", etc.
    @Column(nullable = false, length = 100)
    private String feature;

    @Column(name = "input_tokens", nullable = false)
    private Integer inputTokens = 0;

    @Column(name = "output_tokens", nullable = false)
    private Integer outputTokens = 0;

    @Column(name = "total_tokens", nullable = false)
    private Integer totalTokens = 0;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @PrePersist
    public void prePersist() {
        this.usedAt = LocalDateTime.now();
    }
}