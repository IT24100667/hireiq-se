package com.example.hireiqse.service;

import com.example.hireiqse.dto.JobDTO;
import com.example.hireiqse.entity.Job;
import com.example.hireiqse.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class JobService {

    @Autowired
    private JobRepository jobRepository;

    /**
     * Create a new job posting.
     * Called when HR submits the job input form.
     */
    public JobDTO createJob(JobDTO jobDTO) {
        Job job = new Job();
        job.setTitle(jobDTO.getTitle());
        job.setDescription(jobDTO.getDescription());
        job.setDepartment(jobDTO.getDepartment());
        job.setStatus("open");
        job = jobRepository.save(job);
        return toDTO(job);
    }

    /**
     * Get all jobs, optionally filtered by status.
     * e.g. status = "open" returns only active jobs.
     */
    public List<JobDTO> getJobs(String status) {
        List<Job> jobs = (status != null)
                ? jobRepository.findByStatus(status)
                : jobRepository.findAll();

        return jobs.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get one job by ID.
     * Returns null if not found.
     */
    public JobDTO getJob(Integer jobId) {
        return jobRepository.findById(jobId)
                .map(this::toDTO)
                .orElse(null);
    }

    /**
     * Close a job so it no longer accepts candidates.
     */
    public JobDTO closeJob(Integer jobId) {
        return jobRepository.findById(jobId).map(job -> {
            job.setStatus("closed");
            return toDTO(jobRepository.save(job));
        }).orElse(null);
    }

    private JobDTO toDTO(Job job) {
        JobDTO dto = new JobDTO();
        dto.setJobId(job.getJobId());
        dto.setTitle(job.getTitle());
        dto.setDescription(job.getDescription());
        dto.setDepartment(job.getDepartment());
        dto.setStatus(job.getStatus());
        dto.setCreatedAt(job.getCreatedAt() != null ? job.getCreatedAt().toString() : null);
        return dto;
    }
}