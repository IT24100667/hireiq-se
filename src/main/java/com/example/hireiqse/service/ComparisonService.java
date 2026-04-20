// service/ComparisonService.java
// Member 04 - Fetches candidate scores, calls Flask, saves sessions to DB.

package com.example.hireiqse.service;

import com.example.hireiqse.dto.ComparisonSessionDTO;
import com.example.hireiqse.dto.ScoreDTO;
import com.example.hireiqse.entity.ComparisonSession;
import com.example.hireiqse.entity.Job;
import com.example.hireiqse.repository.ComparisonSessionRepository;
import com.example.hireiqse.repository.JobRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ComparisonService {

    @Autowired private ComparisonSessionRepository sessionRepository;
    @Autowired private JobRepository               jobRepository;
    @Autowired private RankingService              rankingService;
    @Autowired private AIClientService             aiClientService;

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Fetches scores for selected candidates and sends to Flask for trade-off analysis.
     * Saves a session record so HR can revisit this comparison later.
     */
    public Map<String, Object> compareCandidates(Integer jobId, List<Integer> candidateIds) {

        List<Map<String, Object>> candidateMaps = fetchCandidateMaps(jobId, candidateIds);

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        Map<String, Object> body = new HashMap<>();
        body.put("job_description", job.getDescription());
        body.put("candidates",      candidateMaps);

        Map<String, Object> result = aiClientService.callFlaskPost("/ai/comparison/compare", body);

        // Save a session record (no recommendation yet - that comes in next step)
        ComparisonSession session = new ComparisonSession();
        session.setJobId(        jobId);
        session.setCandidateIds( candidateIds.stream()
                .map(String::valueOf).collect(Collectors.joining(",")));
        sessionRepository.save(session);

        // Return session_id so the frontend can pass it to the recommend step
        result.put("session_id", session.getSessionId());
        return result;
    }

    /**
     * Generates AI recommendation and updates the session record with the result.
     * If session_id is provided, updates that session instead of creating a new one.
     */
    public Map<String, Object> generateRecommendation(
            Integer jobId, List<Integer> candidateIds,
            String roleType, String companyCulture, String topPriority,
            Integer sessionId) {

        List<Map<String, Object>> candidateMaps = fetchCandidateMaps(jobId, candidateIds);

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        Map<String, Object> body = new HashMap<>();
        body.put("job_description",  job.getDescription());
        body.put("candidates",       candidateMaps);
        body.put("role_type",        roleType);
        body.put("company_culture",  companyCulture);
        body.put("top_priority",     topPriority);

        Map<String, Object> result = aiClientService.callFlaskPost("/ai/comparison/recommend", body);

        // Update session with recommendation and context
        ComparisonSession session = (sessionId != null)
                ? sessionRepository.findById(sessionId).orElse(new ComparisonSession())
                : new ComparisonSession();

        session.setJobId(          jobId);
        session.setCandidateIds(   candidateIds.stream()
                .map(String::valueOf).collect(Collectors.joining(",")));
        session.setRoleType(       roleType);
        session.setCompanyCulture( companyCulture);
        session.setTopPriority(    topPriority);
        session.setRecommendation( (String) result.getOrDefault("recommendation", ""));
        sessionRepository.save(session);

        return result;
    }

    /**
     * Gets all past comparison sessions for a job so HR can revisit them.
     */
    public List<ComparisonSessionDTO> getPastSessions(Integer jobId) {
        return sessionRepository.findByJobIdOrderByCreatedAtDesc(jobId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Gets all scored candidates for a job - used to populate the selection list.
     */
    public List<ScoreDTO> getScoredCandidates(Integer jobId) {
        return rankingService.getRankings(jobId);
    }

    // ── Helpers ────────────────────────────────────────────

    private List<Map<String, Object>> fetchCandidateMaps(Integer jobId, List<Integer> candidateIds) {
        List<Map<String, Object>> maps = candidateIds.stream()
                .map(id -> rankingService.getCandidateScore(id, jobId))
                .filter(Objects::nonNull)
                .map(this::scoreDtoToMap)
                .collect(Collectors.toList());

        if (maps.size() < 2)
            throw new RuntimeException("Could not find scores for at least 2 candidates");
        return maps;
    }

    private Map<String, Object> scoreDtoToMap(ScoreDTO s) {
        Map<String, Object> map = new HashMap<>();
        map.put("candidate_id",      s.getCandidateId());
        map.put("full_name",         s.getFullName());
        map.put("email",             s.getEmail());
        map.put("total_score",       s.getTotalScore());
        map.put("skills_score",      s.getSkillsScore());
        map.put("experience_score",  s.getExperienceScore());
        map.put("education_score",   s.getEducationScore());
        map.put("extras_score",      s.getExtrasScore());
        map.put("skills_weight",     s.getSkillsWeight());
        map.put("experience_weight", s.getExperienceWeight());
        map.put("education_weight",  s.getEducationWeight());
        map.put("extras_weight",     s.getExtrasWeight());
        map.put("ai_summary",        s.getAiSummary());
        map.put("company_type",      s.getCompanyType());
        map.put("has_leadership",    s.getHasLeadership());
        map.put("industry",          s.getIndustry());
        map.put("notice_period",     s.getNoticePeriod());
        map.put("matched_skills",    parseJson(s.getMatchedSkills()));
        map.put("missing_skills",    parseJson(s.getMissingSkills()));
        return map;
    }

    private Object parseJson(String json) {
        if (json == null) return List.of();
        try { return mapper.readValue(json, List.class); }
        catch (Exception e) { return List.of(); }
    }

    private ComparisonSessionDTO toDTO(ComparisonSession s) {
        ComparisonSessionDTO dto = new ComparisonSessionDTO();
        dto.setSessionId(      s.getSessionId());
        dto.setJobId(          s.getJobId());
        dto.setCandidateIds(   s.getCandidateIds());
        dto.setRoleType(       s.getRoleType());
        dto.setCompanyCulture( s.getCompanyCulture());
        dto.setTopPriority(    s.getTopPriority());
        dto.setRecommendation( s.getRecommendation());
        dto.setCreatedAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        return dto;
    }
}