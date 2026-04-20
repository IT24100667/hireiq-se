// controller/JobController.java
// Handles HTTP requests for job postings.
// Frontend calls these to create and list jobs.
//
// Endpoints:
//   POST /api/jobs          - create a new job
//   GET  /api/jobs          - list all jobs (optional: ?status=open)
//   GET  /api/jobs/{id}     - get one job
//   PUT  /api/jobs/{id}/close - close a job

package com.example.hireiqse.controller;

import com.example.hireiqse.dto.JobDTO;
import com.example.hireiqse.service.JobService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    @Autowired
    private JobService jobService;

    /**
     * Create a new job posting.
     * Frontend sends: { title, description, department }
     */
    @PostMapping
    public ResponseEntity<JobDTO> createJob(@RequestBody JobDTO jobDTO) {
        JobDTO created = jobService.createJob(jobDTO);
        return ResponseEntity.ok(created);
    }

    /**
     * Get all jobs.
     * Optional filter: GET /api/jobs?status=open
     */
    @GetMapping
    public ResponseEntity<List<JobDTO>> getJobs(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(jobService.getJobs(status));
    }

    /**
     * Get one job by ID.
     * Example: GET /api/jobs/1
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobDTO> getJob(@PathVariable Integer id) {
        JobDTO job = jobService.getJob(id);
        if (job == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(job);
    }

    /**
     * Close a job posting.
     * Example: PUT /api/jobs/1/close
     */
    @PutMapping("/{id}/close")
    public ResponseEntity<JobDTO> closeJob(@PathVariable Integer id) {
        JobDTO job = jobService.closeJob(id);
        if (job == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(job);
    }
}