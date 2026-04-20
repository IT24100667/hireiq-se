// repository/ChatHistoryRepository.java
// Member 02 - Chat History Repository

package com.example.hireiqse.repository;

import com.example.hireiqse.entity.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Integer> {

    // Get all messages for a session, oldest first
    List<ChatHistory> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    // Get all messages for a specific job, newest first
    List<ChatHistory> findByJobIdOrderByCreatedAtDesc(Integer jobId);

    // ── NEW: Get the first message of each session (for sidebar preview) ──
    // Groups by session_id, picks the row with the earliest createdAt
    @Query("SELECT ch FROM ChatHistory ch WHERE ch.createdAt = " +
            "(SELECT MIN(c.createdAt) FROM ChatHistory c WHERE c.sessionId = ch.sessionId) " +
            "ORDER BY ch.createdAt DESC")
    List<ChatHistory> findFirstMessageOfEachSession();

    // ── NEW: Delete all messages in a session ──
    @Transactional
    void deleteBySessionId(String sessionId);
}
