// controller/CandidateController.java
// Receives HTTP requests from the frontend related to candidates.
// Passes work to CandidateService - NO business logic here.
//
// Endpoints:
//   POST /api/candidates/upload    - upload one or more resumes
//   GET  /api/candidates           - list all candidates (optional: ?jobId=1)
//   GET  /api/candidates/{id}      - get one candidate

package com.example.hireiqse.controller;

import com.example.hireiqse.dto.CandidateDTO;
import com.example.hireiqse.service.CandidateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    @Autowired
    private CandidateService candidateService;

    /**
     * Upload one or more resume files.
     * Frontend sends: multipart form with files[] and jobId
     *
     * Example frontend call:
     *   POST /api/candidates/upload
     *   FormData: { files: [resume1.pdf, resume2.pdf], jobId: 1 }
     */
    @PostMapping("/upload")
    public ResponseEntity<List<CandidateDTO>> uploadResumes(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("jobId") Integer jobId) {

        List<CandidateDTO> results = new ArrayList<>();

        // Process each file one at a time
        for (MultipartFile file : files) {
            CandidateDTO result = candidateService.uploadResume(file, jobId);
            results.add(result);
        }

        return ResponseEntity.ok(results);
    }

    /**
     * Get all candidates.
     * Optional query param: ?jobId=1 to filter by job.
     *
     * Example: GET /api/candidates?jobId=1
     */
    @GetMapping
    public ResponseEntity<List<CandidateDTO>> getCandidates(
            @RequestParam(required = false) Integer jobId) {

        List<CandidateDTO> candidates = candidateService.getCandidates(jobId);
        return ResponseEntity.ok(candidates);
    }

    /**
     * Get one candidate by their ID.
     * Example: GET /api/candidates/5
     */
    @GetMapping("/{id}")
    public ResponseEntity<CandidateDTO> getCandidate(@PathVariable Integer id) {
        CandidateDTO candidate = candidateService.getCandidate(id);

        if (candidate == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(candidate);
    }

    /**
     * Download the originally uploaded resume document for a candidate.
     * Example: GET /api/candidates/5/download
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadCandidateDocument(@PathVariable Integer id) {
        try {
            CandidateService.DownloadCandidateFile file = candidateService.getCandidateDocument(id);
            MediaType mediaType = MediaTypeFactory
                    .getMediaType(file.originalFilename())
                    .orElse(MediaType.APPLICATION_OCTET_STREAM);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + file.originalFilename() + "\"")
                    .body(file.resource());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * Update recruiter notes for a candidate.
     * Example: PUT /api/candidates/5/notes
     * Body: { "notes": "Strong communication. Check availability." }
     */
    @PutMapping("/{id}/notes")
    public ResponseEntity<?> updateCandidateNotes(@PathVariable Integer id,
                                                  @RequestBody Map<String, String> body) {
        String notes = body.getOrDefault("notes", "");
        CandidateDTO updated = candidateService.updateNotes(id, notes);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }
}