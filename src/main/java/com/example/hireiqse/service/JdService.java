
//MaIN FEATURE :- Calls Flask via AIClientService, saves result to MySQL, returns DTO.

package com.example.hireiqse.service;

import com.example.hireiqse.dto.JdAnalysisDTO;
import com.example.hireiqse.entity.JdAnalysis;
import com.example.hireiqse.repository.JdAnalysisRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class JdService {

    @Autowired private JdAnalysisRepository jdAnalysisRepository;
    @Autowired private AIClientService      aiClientService;

    //Systemnn Sends JD to Flask for analysis, saves result to MySQL, returns to  DTO.
     
    public JdAnalysisDTO analyzeJd(String originalJd, Integer jobId) {

        // Step 1 - Send to Flask
        Map<String, Object> flaskResult = aiClientService.analyzeJobDescription(originalJd, jobId);

        if (flaskResult == null || !Boolean.TRUE.equals(flaskResult.get("success"))) {
            throw new RuntimeException("Flask JD analysis failed");
        }
        //system Saves to MYSQL
        JdAnalysis analysis = new JdAnalysis();
        analysis.setJobId(              jobId);
        analysis.setOriginalJd(         originalJd);
        analysis.setQualityScore(       toInt(flaskResult.get("quality_score")));
        analysis.setIssuesFound(        toJson(flaskResult.get("issues_found")));
        analysis.setRefinedJd(          (String) flaskResult.getOrDefault("refined_jd",           ""));
        analysis.setImprovementSummary( (String) flaskResult.getOrDefault("improvement_summary",  ""));

        jdAnalysisRepository.save(analysis);

        return toDTO(analysis);
    }

    public List<JdAnalysisDTO> getAnalysesForJob(Integer jobId) {
        return jdAnalysisRepository.findByJobIdOrderByCreatedAtDesc(jobId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }


    private Integer toInt(Object obj) {
        if (obj == null)            return 0;
        if (obj instanceof Integer) return (Integer) obj;
        if (obj instanceof Double)  return ((Double) obj).intValue();
        return 0;
    }

    private String toJson(Object obj) {
        if (obj == null)           return "[]";
        if (obj instanceof String) return (String) obj;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) { return "[]"; }
    }

    private JdAnalysisDTO toDTO(JdAnalysis a) {
        JdAnalysisDTO dto = new JdAnalysisDTO();
        dto.setAnalysisId(         a.getAnalysisId());
        dto.setJobId(              a.getJobId());
        dto.setOriginalJd(         a.getOriginalJd());
        dto.setQualityScore(       a.getQualityScore());
        dto.setIssuesFound(        a.getIssuesFound());
        dto.setRefinedJd(          a.getRefinedJd());
        dto.setImprovementSummary( a.getImprovementSummary());
        dto.setCreatedAt(a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
        return dto;
    }
}