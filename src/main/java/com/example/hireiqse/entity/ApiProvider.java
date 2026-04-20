// entity/ApiProvider.java
// Maps to the 'api_providers' table in MySQL.
// Represents one API provider config (e.g. Gemini, OpenAI).

package com.example.hireiqse.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "api_providers")
public class ApiProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Human-readable name, e.g. "Gemini", "OpenAI"
    @Column(nullable = false, length = 100)
    private String name;

    // The actual API key - stored in DB, managed by admin
    @Column(name = "api_key", nullable = false, length = 500)
    private String apiKey;

    // Model name to use, e.g. "gemini-2.5-flash-lite"
    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    // Only one provider should be active at a time
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}