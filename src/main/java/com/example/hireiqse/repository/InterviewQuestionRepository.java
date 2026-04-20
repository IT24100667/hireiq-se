package com.example.hireiqse.repository;

import com.example.hireiqse.entity.InterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewQuestionRepository extends JpaRepository<InterviewQuestion, Integer> {

    // Get all questions for a candidate+job pair, grouped by category
    List<InterviewQuestion> findByCandidateIdAndJobIdOrderByCategory(
            Integer candidateId, Integer jobId);

    // Delete old questions before regenerating fresh ones
    void deleteByCandidateIdAndJobId(Integer candidateId, Integer jobId);
}