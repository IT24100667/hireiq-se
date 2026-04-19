// repository/ComparisonSessionRepository.java
// Member 04 - DB access for comparison_sessions table.

package com.example.hireiqse.repository;

import com.example.hireiqse.entity.ComparisonSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComparisonSessionRepository extends JpaRepository<ComparisonSession, Integer> {

    // Get all past comparisons for a job, newest first
    List<ComparisonSession> findByJobIdOrderByCreatedAtDesc(Integer jobId);
}