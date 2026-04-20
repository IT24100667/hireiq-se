
// Handles all database queries for the jobs table.

package com.example.hireiqse.repository;

import com.example.hireiqse.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, Integer> {

    // Find all jobs with a specific status (e.g. "open", "closed")
    List<Job> findByStatus(String status);

    // Find jobs in a specific department
    List<Job> findByDepartment(String department);
}