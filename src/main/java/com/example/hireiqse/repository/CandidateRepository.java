package com.example.hireiqse.repository;

import com.example.hireiqse.entity.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidateRepository extends JpaRepository<Candidate, Integer> {

    List<Candidate> findByJobId(Integer jobId);

    List<Candidate> findByJobIdAndStatus(Integer jobId, String status);

    // ADDED - used by CandidateService to detect duplicate uploads.
    // If a candidate with the same filename already exists for this job,
    // we return it instead of creating a new row.
    Optional<Candidate> findByJobIdAndOriginalFilename(Integer jobId, String originalFilename);
}