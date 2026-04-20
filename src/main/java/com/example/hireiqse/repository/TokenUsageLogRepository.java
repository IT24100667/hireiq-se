// repository/TokenUsageLogRepository.java
// Handles all database queries for the token_usage_log table.

package com.example.hireiqse.repository;

import com.example.hireiqse.entity.TokenUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TokenUsageLogRepository extends JpaRepository<TokenUsageLog, Integer> {

    // Gets all logs for one provider (for the admin detail view)
    List<TokenUsageLog> findByProviderIdOrderByUsedAtDesc(Integer providerId);

    // Sums total tokens used across all calls for one provider
    // Returns 0 if no logs exist yet
    @Query("SELECT COALESCE(SUM(t.totalTokens), 0) FROM TokenUsageLog t WHERE t.providerId = :providerId")
    Long sumTotalTokensByProviderId(Integer providerId);
}