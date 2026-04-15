package com.example.hireiqse.service;

import com.example.hireiqse.dto.ScoreDTO;
import com.example.hireiqse.entity.CandidateScore;
import com.example.hireiqse.repository.CandidateScoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RankingService {

    @Autowired private CandidateScoreRepository scoreRepository;


    public List<ScoreDTO> getRankings(Integer jobId) {
        return scoreRepository.findByJobIdOrderByTotalScoreDesc(jobId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public ScoreDTO getCandidateScore(Integer candidateId, Integer jobId) {
        return scoreRepository.findByCandidateIdAndJobId(candidateId, jobId)
                .map(this::toDTO).orElse(null);
    }


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
        // Member 04 fields
        dto.setCompanyType(  s.getCompanyType());
        dto.setHasLeadership(s.getHasLeadership());
        dto.setIndustry(     s.getIndustry());
        dto.setNoticePeriod( s.getNoticePeriod());
        // Look up candidate name/email/phone
        candidateRepository.findById(s.getCandidateId()).ifPresent(c -> {
            dto.setFullName(c.getFullName());
            dto.setEmail(   c.getEmail());
            dto.setPhone(   c.getPhone());
        });
        return dto;
    }
}