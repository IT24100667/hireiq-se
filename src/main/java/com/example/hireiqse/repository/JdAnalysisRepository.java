package com.example.hireiqse.repository;

import com.example.hireiqse.entity.JdAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JdAnalysisRepository extends JpaRepository<JdAnalysis, Integer> {

    // Get all analyses for a specific job, newest first
    List<JdAnalysis> findByJobIdOrderByCreatedAtDesc(Integer jobId);
}