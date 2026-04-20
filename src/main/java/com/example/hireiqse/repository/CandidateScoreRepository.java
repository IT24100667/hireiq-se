package com.example.hireiqse.repository;

import com.example.hireiqse.entity.CandidateScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CandidateScoreRepository extends JpaRepository<CandidateScore, Integer> {

    List<CandidateScore> findByJobIdOrderByTotalScoreDesc(Integer jobId);


    Optional<CandidateScore> findByCandidateIdAndJobId(Integer candidateId, Integer jobId);


    List<CandidateScore> findByCandidateId(Integer candidateId);

    @Query(value = """
            SELECT c.full_name, c.email,
                   cs.total_score, cs.skills_score,
                   cs.experience_score, cs.education_score,
                   cs.ai_summary, cs.matched_skills
            FROM candidate_scores cs
            JOIN candidates c ON cs.candidate_id = c.candidate_id
            WHERE cs.job_id = :jobId
            ORDER BY cs.total_score DESC
            """, nativeQuery = true)
    List<Object[]> findScoresWithCandidateNameByJobId(@Param("jobId") Integer jobId);


    @Query(value = """
            SELECT c.full_name, c.email,
                   cs.total_score, cs.skills_score,
                   cs.experience_score, cs.education_score,
                   cs.ai_summary, cs.matched_skills
            FROM candidate_scores cs
            JOIN candidates c ON cs.candidate_id = c.candidate_id
            ORDER BY cs.total_score DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findTopScoresWithCandidateName(@Param("limit") int limit);
}