// controller/EmailController.java
// Email Generation Endpoint — Spring Boot side.
// Receives request from frontend, forwards to Flask AI, returns generated email.

package com.example.hireiqse.controller;

import com.example.hireiqse.service.AIClientService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    @Autowired
    private AIClientService aiClientService;

    /**
     * POST /api/email/generate
     *
     * Frontend sends:
     * {
     *   "candidateId":   1,
     *   "candidateName": "John Smith",
     *   "jobTitle":      "Software Engineer",
     *   "stage":         "interview",
     *   "venue":         "Main Office, 3rd Floor",   (optional)
     *   "time":          "Friday 25 April at 10:00 AM", (optional)
     *   "extraInfo":     "Bring portfolio"            (optional)
     * }
     */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateEmail(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            Integer candidateId   = (Integer) request.get("candidateId");
            String  candidateName = (String)  request.get("candidateName");
            String  jobTitle      = (String)  request.get("jobTitle");
            String  stage         = (String)  request.get("stage");
            String  venue         = request.get("venue")     != null ? (String) request.get("venue")     : "";
            String  time          = request.get("time")      != null ? (String) request.get("time")      : "";
            String  extraInfo     = request.get("extraInfo") != null ? (String) request.get("extraInfo") : "";

            if (candidateId == null || stage == null || stage.isBlank()) {
                response.put("success", false);
                response.put("error", "candidateId and stage are required");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> result = aiClientService.generateEmail(
                    candidateId,
                    candidateName != null ? candidateName : "Candidate",
                    jobTitle      != null ? jobTitle      : "the position",
                    stage,
                    venue,
                    time,
                    extraInfo
            );

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Email generation failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}