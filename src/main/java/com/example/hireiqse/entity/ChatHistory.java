package com.example.hireiqse.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_history")
public class ChatHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_id")
    private Integer chatId;

    // Groups messages into one conversation session
    @Column(name = "session_id", nullable = false, length = 100)
    private String sessionId;

    // What HR typed
    @Column(name = "user_message", nullable = false, columnDefinition = "TEXT")
    private String userMessage;

    // What the AI replied
    @Column(name = "bot_response", nullable = false, columnDefinition = "LONGTEXT")
    private String botResponse;

    // Optional - null means global chat, set means job-specific chat
    @Column(name = "job_id")
    private Integer jobId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Automatically sets the timestamp before saving
    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters 
    // (We are not using Lombok to keep things visible and simple)

    public Integer getChatId()              { return chatId; }
    public void setChatId(Integer chatId)   { this.chatId = chatId; }

    public String getSessionId()                { return sessionId; }
    public void setSessionId(String sessionId)  { this.sessionId = sessionId; }

    public String getUserMessage()                  { return userMessage; }
    public void setUserMessage(String userMessage)  { this.userMessage = userMessage; }

    public String getBotResponse()                  { return botResponse; }
    public void setBotResponse(String botResponse)  { this.botResponse = botResponse; }

    public Integer getJobId()             { return jobId; }
    public void setJobId(Integer jobId)   { this.jobId = jobId; }

    public LocalDateTime getCreatedAt()                     { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)       { this.createdAt = createdAt; }
}