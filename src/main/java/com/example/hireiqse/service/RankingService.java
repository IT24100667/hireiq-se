// service/RankingService.java
// Orchestrates scoring and retrieves rankings.
// Member 04 addition: saves and returns company_type, has_leadership, industry, notice_period

package com.example.hireiqse.service;

import com.example.hireiqse.dto.ScoreDTO;
import com.example.hireiqse.entity.Candidate;
import com.example.hireiqse.entity.CandidateScore;
import com.example.hireiqse.entity.Job;
import com.example.hireiqse.repository.CandidateRepository;
import com.example.hireiqse.repository.CandidateScoreRepository;
import com.example.hireiqse.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RankingService {

    @Autowired private CandidateScoreRepository scoreRepository;
    @Autowired private CandidateRepository      candidateRepository;
    @Autowired private JobRepository            jobRepository;
    @Autowired private AIClientService          aiClientService;

    public List<ScoreDTO> scoreAllCandidates(
            Integer jobId,
            int skillsWeight, int experienceWeight,
            int educationWeight, int extrasWeight) {

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        List<Candidate> allReady = candidateRepository.findByJobIdAndStatus(jobId, "ready");
        if (allReady.isEmpty())
            throw new RuntimeException("No ready candidates found for job " + jobId);

        // ADDED - filter out candidates that already have a score for this job.
        // This prevents re-scoring on every button click and wastes API quota.
        // Only genuinely new candidates (no existing score record) are sent to Flask.
        List<Candidate> candidates = allReady.stream()
                .filter(c -> scoreRepository.findByCandidateIdAndJobId(
                        c.getCandidateId(), jobId).isEmpty())
                .collect(Collectors.toList());

        // ADDED - if every ready candidate is already scored, return existing rankings.
        if (candidates.isEmpty()) {
            System.out.println("[RankingService] All candidates already scored for job " + jobId + ". Returning existing rankings.");
            return getRankings(jobId);
        }

        System.out.println("[RankingService] Scoring " + candidates.size() + " new candidate(s) out of " + allReady.size() + " ready.");

        List<Map<String, Object>> candidateList = candidates.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("candidate_id", c.getCandidateId());
            map.put("full_name",    c.getFullName());
            map.put("email",        c.getEmail());
            map.put("phone",        c.getPhone());
            return map;
        }).collect(Collectors.toList());

        List<Map<String, Object>> flaskScores = aiClientService.scoreCandidates(
                job.getDescription(), candidateList, jobId,
                skillsWeight, experienceWeight, educationWeight, extrasWeight);

        List<ScoreDTO> results = new ArrayList<>();
        for (Map<String, Object> s : flaskScores) {
            Integer candidateId = toInt(s.get("candidate_id"));

            CandidateScore score = scoreRepository
                    .findByCandidateIdAndJobId(candidateId, jobId)
                    .orElse(new CandidateScore());

            score.setCandidateId(    candidateId);
            score.setJobId(          jobId);
            score.setTotalScore(     toInt(s.getOrDefault("total_score",      0)));
            score.setSkillsScore(    toInt(s.getOrDefault("skills_score",     0)));
            score.setExperienceScore(toInt(s.getOrDefault("experience_score", 0)));
            score.setEducationScore( toInt(s.getOrDefault("education_score",  0)));
            score.setExtrasScore(    toInt(s.getOrDefault("extras_score",     0)));
            score.setSkillsWeight(     skillsWeight);
            score.setExperienceWeight( experienceWeight);
            score.setEducationWeight(  educationWeight);
            score.setExtrasWeight(     extrasWeight);
            score.setMatchedSkills(        toJson(s.get("matched_skills")));
            score.setMissingSkills(        toJson(s.get("missing_skills")));
            score.setRequirementChecklist( toJson(s.get("requirement_checklist")));
            score.setAiSummary(      (String) s.getOrDefault("ai_summary", ""));
            score.setExperienceEvidence(   toJson(s.get("experience_evidence")));
            score.setConfidenceScore(toFloat(s.get("confidence_score")));
            score.setStatus("scored");
            score.setCompanyType(  (String)  s.getOrDefault("company_type",   "unknown"));
            score.setHasLeadership((Boolean) s.getOrDefault("has_leadership", false));
            score.setIndustry(     (String)  s.getOrDefault("industry",       "other"));
            score.setNoticePeriod( (String)  s.getOrDefault("notice_period",  "not mentioned"));

            scoreRepository.save(score);
            results.add(toDTO(score));
        }

        results.sort(Comparator.comparingInt(ScoreDTO::getTotalScore).reversed());
        return results;
    }

    public List<ScoreDTO> getRankings(Integer jobId) {
        return scoreRepository.findByJobIdOrderByTotalScoreDesc(jobId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public ScoreDTO getCandidateScore(Integer candidateId, Integer jobId) {
        return scoreRepository.findByCandidateIdAndJobId(candidateId, jobId)
                .map(this::toDTO).orElse(null);
    }

    // ── Helpers ────────────────────────────────────────────

    private Integer toInt(Object obj) {
        if (obj == null)            return 0;
        if (obj instanceof Integer) return (Integer) obj;
        if (obj instanceof Double)  return ((Double) obj).intValue();
        if (obj instanceof Long)    return ((Long) obj).intValue();
        return 0;
    }

    private Float toFloat(Object obj) {
        if (obj == null)           return 0.0f;
        if (obj instanceof Double) return ((Double) obj).floatValue();
        if (obj instanceof Float)  return (Float) obj;
        return 0.0f;
    }

    private String toJson(Object obj) {
        if (obj == null)           return "[]";
        if (obj instanceof String) return (String) obj;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) { return "[]"; }
    }

    private ScoreDTO toDTO(CandidateScore s) {
        ScoreDTO dto = new ScoreDTO();
        dto.setScoreId(         s.getScoreId());
        dto.setCandidateId(     s.getCandidateId());
        dto.setJobId(           s.getJobId());
        dto.setTotalScore(      s.getTotalScore());
        dto.setSkillsScore(     s.getSkillsScore());
        dto.setExperienceScore( s.getExperienceScore());
        dto.setEducationScore(  s.getEducationScore());
        dto.setExtrasScore(     s.getExtrasScore());
        dto.setSkillsWeight(    s.getSkillsWeight());
        dto.setExperienceWeight(s.getExperienceWeight());
        dto.setEducationWeight( s.getEducationWeight());
        dto.setExtrasWeight(    s.getExtrasWeight());
        dto.setMatchedSkills(        s.getMatchedSkills());
        dto.setMissingSkills(        s.getMissingSkills());
        dto.setRequirementChecklist( s.getRequirementChecklist());
        dto.setAiSummary(            s.getAiSummary());
        dto.setConfidenceScore( s.getConfidenceScore());
        dto.setStatus(          s.getStatus());
        dto.setScoredAt(s.getScoredAt() != null ? s.getScoredAt().toString() : null);
        dto.setCompanyType(  s.getCompanyType());
        dto.setHasLeadership(s.getHasLeadership());
        dto.setIndustry(     s.getIndustry());
        dto.setNoticePeriod( s.getNoticePeriod());
        candidateRepository.findById(s.getCandidateId()).ifPresent(c -> {
            dto.setFullName(c.getFullName());
            dto.setEmail(   c.getEmail());
            dto.setPhone(   c.getPhone());
        });
        return dto;
    }
}