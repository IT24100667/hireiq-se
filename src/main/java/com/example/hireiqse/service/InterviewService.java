// Reads candidate score data from MySQL, calls Flask, saves questions, returns DTOs.

package com.example.hireiqse.service;

import com.example.hireiqse.dto.InterviewQuestionDTO;
import com.example.hireiqse.entity.InterviewQuestion;
import com.example.hireiqse.repository.CandidateScoreRepository;
import com.example.hireiqse.repository.InterviewQuestionRepository;
import com.example.hireiqse.repository.JobRepository;
import com.example.hireiqse.repository.CandidateRepository;
import com.example.hireiqse.entity.CandidateScore;
import com.example.hireiqse.entity.Job;
import com.example.hireiqse.entity.Candidate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class InterviewService {

    @Autowired private InterviewQuestionRepository questionRepository;
    @Autowired private CandidateScoreRepository    scoreRepository;
    @Autowired private CandidateRepository         candidateRepository;
    @Autowired private JobRepository               jobRepository;
    @Autowired private AIClientService             aiClientService;

   
    @Transactional
    public List<InterviewQuestionDTO> generateQuestions(Integer candidateId, Integer jobId) {

            //Load candidate Score, finfing by name 
        CandidateScore score = scoreRepository
                .findByCandidateIdAndJobId(candidateId, jobId)
                .orElseThrow(() -> new RuntimeException(
                        "No score found for candidate " + candidateId +
                                " and job " + jobId + ". Please score candidates first."));

        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + candidateId));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        //Send to Flask
        Map<String, Object> flaskResult = aiClientService.generateInterviewQuestions(
                candidateId,
                jobId,
                candidate.getFullName(),
                job.getDescription(),
                score.getMatchedSkills(),
                score.getMissingSkills(),
                score.getAiSummary()
        );

        if (flaskResult == null || !Boolean.TRUE.equals(flaskResult.get("success"))) {
            throw new RuntimeException("Flask interview generation failed");
        }

        //Delete old questions for this candidate+job before saving new ones
        questionRepository.deleteByCandidateIdAndJobId(candidateId, jobId);

        // Save new Generated  questions to MySQL
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawQuestions =
                (List<Map<String, Object>>) flaskResult.getOrDefault("questions", new ArrayList<>());

        List<InterviewQuestion> saved = new ArrayList<>();
        for (Map<String, Object> q : rawQuestions) {
            InterviewQuestion question = new InterviewQuestion();
            question.setCandidateId(  candidateId);
            question.setJobId(        jobId);
            question.setCategory(     (String) q.getOrDefault("category",      "MISSING_SKILLS"));
            question.setQuestionText( (String) q.getOrDefault("question_text", ""));
            question.setReason(       (String) q.getOrDefault("reason",        ""));
            saved.add(questionRepository.save(question));
        }

        return saved.stream().map(this::toDTO).collect(Collectors.toList());
    }
        //REcall the previous questions
    public List<InterviewQuestionDTO> getQuestions(Integer candidateId, Integer jobId) {
        return questionRepository
                .findByCandidateIdAndJobIdOrderByCategory(candidateId, jobId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }
    //deletes the interview questions single by single if not suits
    @Transactional
    public void deleteQuestion(Integer id) {
        if (!questionRepository.existsById(id)) {
            throw new IllegalArgumentException("Question not found with id: " + id);
        }
        questionRepository.deleteById(id);
    }

    private InterviewQuestionDTO toDTO(InterviewQuestion q) {
        InterviewQuestionDTO dto = new InterviewQuestionDTO();
        dto.setQuestionId(  q.getQuestionId());
        dto.setCandidateId( q.getCandidateId());
        dto.setJobId(       q.getJobId());
        dto.setCategory(    q.getCategory());
        dto.setQuestionText(q.getQuestionText());
        dto.setReason(      q.getReason());
        dto.setCreatedAt(q.getCreatedAt() != null ? q.getCreatedAt().toString() : null);
        return dto;
    }
}