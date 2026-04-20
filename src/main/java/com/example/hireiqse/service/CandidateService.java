
//  duplicate check -> save placeholder -> Flask extract -> update DB -> Flask embed -> return

package com.example.hireiqse.service;

import com.example.hireiqse.dto.CandidateDTO;
import com.example.hireiqse.entity.Candidate;
import com.example.hireiqse.repository.CandidateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CandidateService {

    @Autowired private CandidateRepository candidateRepository;
    @Autowired private AIClientService     aiClientService;

    @Value("${resume.storage.path:uploads/resumes}")
    private String resumeStoragePath;

    @SuppressWarnings("unchecked")
    public CandidateDTO uploadResume(MultipartFile file, Integer jobId) {

        String originalFilename = file.getOriginalFilename();
        String fileType = originalFilename != null
                ? originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase()
                : "unknown";

        // ADDED - duplicate upload guard.
        // If a candidate with the same filename already exists for this job,
        // return the existing record immediately without re-processing.
        // This prevents duplicate rows in MySQL and duplicate chunks in ChromaDB.
        Optional<Candidate> existing = candidateRepository
                .findByJobIdAndOriginalFilename(jobId, originalFilename);
        if (existing.isPresent()) {
            System.out.println("[CandidateService] Duplicate upload detected for '"
                    + originalFilename + "' on job " + jobId + ". Returning existing record.");
            return toDTO(existing.get());
        }

        // Step 1: Save placeholder row - we need candidate_id before calling Flask
        Candidate candidate = new Candidate();
        candidate.setJobId(jobId);
        candidate.setOriginalFilename(originalFilename);
        candidate.setFileType(fileType);
        candidate.setStatus("processing");
        candidate = candidateRepository.save(candidate);
        Integer candidateId = candidate.getCandidateId();

        // Save a local copy of uploaded file for future recruiter download.
        try {
            String storedPath = storeResumeFile(file, candidateId, originalFilename);
            candidate.setStoredFilePath(storedPath);
            candidate = candidateRepository.save(candidate);
        } catch (Exception e) {
            candidate.setStatus("failed");
            candidate.setErrorMessage("Failed to store uploaded file: " + e.getMessage());
            candidateRepository.save(candidate);
            return toDTO(candidate);
        }

        // Step 2: Send file to Flask for text extraction + chunking
        Map<String, Object> flaskResult;
        try {
            flaskResult = aiClientService.processResume(file, candidateId, jobId);
        } catch (Exception e) {
            candidate.setStatus("failed");
            candidate.setErrorMessage("Flask processing failed: " + e.getMessage());
            candidateRepository.save(candidate);
            return toDTO(candidate);
        }

        // Step 3: Update candidate with extracted metadata
        Boolean success = (Boolean) flaskResult.get("success");
        List<String> chunks = null;

        if (Boolean.TRUE.equals(success)) {
            Map<String, Object> metadata = (Map<String, Object>) flaskResult.get("metadata");
            candidate.setFullName(  (String)  metadata.get("full_name"));
            candidate.setEmail(     (String)  metadata.get("email"));
            candidate.setPhone(     (String)  metadata.get("phone"));
            candidate.setChunkCount((Integer) flaskResult.get("chunk_count"));
            candidate.setStatus("ready");

            List<Map<String, Object>> documents = (List<Map<String, Object>>) flaskResult.get("documents");
            if (documents != null) {
                chunks = documents.stream()
                        .map(d -> (String) d.get("text"))
                        .collect(Collectors.toList());
            }
        } else {
            candidate.setStatus("failed");
            candidate.setErrorMessage((String) flaskResult.get("error"));
        }

        candidate = candidateRepository.save(candidate);

        // Step 4: Embed chunks in ChromaDB (non-blocking - failure won't fail the upload)
        if (chunks != null && !chunks.isEmpty()) {
            aiClientService.embedChunks(
                    candidateId, jobId,
                    candidate.getFullName(),
                    candidate.getEmail(),
                    candidate.getPhone(),
                    chunks
            );
        }

        return toDTO(candidate);
    }

    public List<CandidateDTO> getCandidates(Integer jobId) {
        List<Candidate> candidates = (jobId != null)
                ? candidateRepository.findByJobId(jobId)
                : candidateRepository.findAll();
        return candidates.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public CandidateDTO getCandidate(Integer candidateId) {
        return candidateRepository.findById(candidateId).map(this::toDTO).orElse(null);
    }

    public CandidateDTO updateNotes(Integer candidateId, String notes) {
        Optional<Candidate> optional = candidateRepository.findById(candidateId);
        if (optional.isEmpty()) {
            return null;
        }

        Candidate candidate = optional.get();
        String normalizedNotes = notes == null ? "" : notes.trim();
        candidate.setNotes(normalizedNotes);
        return toDTO(candidateRepository.save(candidate));
    }

    public DownloadCandidateFile getCandidateDocument(Integer candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        if (candidate.getStoredFilePath() == null || candidate.getStoredFilePath().isBlank()) {
            throw new IllegalStateException("Document not available for this candidate");
        }

        Path filePath = Paths.get(candidate.getStoredFilePath()).normalize();
        if (!Files.exists(filePath)) {
            throw new IllegalStateException("Stored document file is missing");
        }

        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) {
                throw new IllegalStateException("Stored document file is missing");
            }
            return new DownloadCandidateFile(resource, candidate.getOriginalFilename(), candidate.getFileType());
        } catch (MalformedURLException e) {
            throw new IllegalStateException("Invalid stored document path");
        }
    }

    public record DownloadCandidateFile(Resource resource, String originalFilename, String fileType) {}

    private CandidateDTO toDTO(Candidate c) {
        CandidateDTO dto = new CandidateDTO();
        dto.setCandidateId(     c.getCandidateId());
        dto.setJobId(           c.getJobId());
        dto.setFullName(        c.getFullName());
        dto.setEmail(           c.getEmail());
        dto.setPhone(           c.getPhone());
        dto.setOriginalFilename(c.getOriginalFilename());
        dto.setFileType(        c.getFileType());
        dto.setChunkCount(      c.getChunkCount());
        dto.setStatus(          c.getStatus());
        dto.setNotes(           c.getNotes());
        dto.setHasDocument(c.getStoredFilePath() != null && !c.getStoredFilePath().isBlank());
        dto.setUploadedAt(c.getUploadedAt() != null ? c.getUploadedAt().toString() : null);
        return dto;
    }

    private String storeResumeFile(MultipartFile file, Integer candidateId, String originalFilename) throws IOException {
        String safeName = sanitizeFilename(originalFilename == null ? "resume" : originalFilename);
        String storedName = candidateId + "_" + System.currentTimeMillis() + "_" + safeName;

        Path storageDir = Paths.get(resumeStoragePath).toAbsolutePath().normalize();
        Files.createDirectories(storageDir);

        Path destination = storageDir.resolve(storedName).normalize();
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        return destination.toString();
    }

    private String sanitizeFilename(String filename) {
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}