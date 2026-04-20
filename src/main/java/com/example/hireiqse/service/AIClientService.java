// service/AIClientService.java
// Spring's connection to Flask.
// ALL HTTP calls to Flask go through this file only.

package com.example.hireiqse.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AIClientService {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${flask.base-url}")
    private String flaskBaseUrl;

    /**
     * Sends a resume file to Flask for text extraction and chunking.
     */
    public Map<String, Object> processResume(MultipartFile file, Integer candidateId, Integer jobId) {
        String url = flaskBaseUrl + "/ai/upload/process";
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        try {
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override public String getFilename() { return file.getOriginalFilename(); }
            };
            body.add("file",         fileResource);
            body.add("candidate_id", candidateId.toString());
            body.add("job_id",       jobId.toString());
        } catch (Exception e) {
            throw new RuntimeException("Failed to prepare file for Flask: " + e.getMessage());
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        return response.getBody();
    }

    /**
     * Sends chunks to Flask to be stored in ChromaDB.
     * Called after successful resume processing.
     * Returns true if successful, false if failed (non-blocking).
     */
    public boolean embedChunks(Integer candidateId, Integer jobId,
                               String fullName, String email, String phone,
                               List<String> chunks) {
        try {
            String url = flaskBaseUrl + "/ai/scoring/embed";
            Map<String, Object> body = new HashMap<>();
            body.put("candidate_id", candidateId);
            body.put("job_id",       jobId);
            body.put("full_name",    fullName);
            body.put("email",        email);
            body.put("phone",        phone);
            body.put("chunks",       chunks);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
            Map<String, Object> result = response.getBody();
            return result != null && Boolean.TRUE.equals(result.get("success"));
        } catch (Exception e) {
            System.out.println("[AIClientService] Embed failed for candidate " + candidateId + ": " + e.getMessage());
            return false;
        }
    }

    /**
     * Sends candidates to Flask for AI scoring.
     * Returns the ranked score list from Flask.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> scoreCandidates(
            String jobDescription, List<Map<String, Object>> candidates,
            Integer jobId, int skillsWeight, int experienceWeight,
            int educationWeight, int extrasWeight) {

        String url = flaskBaseUrl + "/ai/scoring/score";
        Map<String, Object> body = new HashMap<>();
        body.put("job_id",            jobId);
        body.put("job_description",   jobDescription);
        body.put("candidates",        candidates);
        body.put("skills_weight",     skillsWeight);
        body.put("experience_weight", experienceWeight);
        body.put("education_weight",  educationWeight);
        body.put("extras_weight",     extrasWeight);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        Map<String, Object> result = response.getBody();
        if (result == null || !Boolean.TRUE.equals(result.get("success"))) {
            throw new RuntimeException("Flask scoring failed");
        }
        return (List<Map<String, Object>>) result.get("rankings");
    }

    /**
     * Natural language search - passes query to Flask ChromaDB search.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> searchCandidates(String query, Integer jobId, int topK) {
        String url = flaskBaseUrl + "/ai/scoring/search";
        Map<String, Object> body = new HashMap<>();
        body.put("query",  query);
        body.put("job_id", jobId);
        body.put("top_k",  topK);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        return response.getBody();
    }

    /**
     * Health check - confirms Flask is running.
     */
    public boolean isFlaskHealthy() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(flaskBaseUrl + "/health", Map.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Generic POST to Flask - used by ComparisonService (Member 04).
     * Takes any endpoint path and request body, returns Flask response as Map.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> callFlaskPost(String path, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> response = restTemplate.exchange(
                flaskBaseUrl + path, HttpMethod.POST,
                new HttpEntity<>(body, headers), Map.class);
        return response.getBody();
    }

    /**
     * Member 06 - Sends a raw JD to Flask for analysis and refinement.
     * Returns quality score, issues, and refined JD.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> analyzeJobDescription(String originalJd, Integer jobId) {
        String url = flaskBaseUrl + "/ai/jd/analyze";
        Map<String, Object> body = new HashMap<>();
        body.put("original_jd", originalJd);
        body.put("job_id",      jobId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        return response.getBody();
    }

    /**
     * Email Generation - Calls Flask to generate a stage-based HR email for a candidate.
     * Returns a map with 'subject' and 'body' keys inside 'email'.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> generateEmail(
            Integer candidateId, String candidateName,
            String jobTitle, String stage) {
        String url = flaskBaseUrl + "/ai/email/generate";
        Map<String, Object> body = new HashMap<>();
        body.put("candidate_id",   candidateId);
        body.put("candidate_name", candidateName);
        body.put("job_title",      jobTitle);
        body.put("stage",          stage);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        return response.getBody();
    }

    /**
     * Member 06 - Sends candidate score data to Flask to generate interview questions.
     * Returns questions grouped by category.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> generateInterviewQuestions(
            Integer candidateId, Integer jobId,
            String candidateName, String jobDescription,
            String matchedSkills, String missingSkills,
            String aiSummary) {
        String url = flaskBaseUrl + "/ai/interview/generate";
        Map<String, Object> body = new HashMap<>();
        body.put("candidate_id",    candidateId);
        body.put("job_id",          jobId);
        body.put("candidate_name",  candidateName);
        body.put("job_description", jobDescription);
        body.put("matched_skills",  matchedSkills);
        body.put("missing_skills",  missingSkills);
        body.put("ai_summary",      aiSummary);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        return response.getBody();
    }
}