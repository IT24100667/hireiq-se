// service/ApiProviderService.java
// Business logic for managing API providers and token usage.
// Controllers call this — this calls the repositories.

package com.example.hireiqse.service;

import com.example.hireiqse.entity.ApiProvider;
import com.example.hireiqse.entity.TokenUsageLog;
import com.example.hireiqse.repository.ApiProviderRepository;
import com.example.hireiqse.repository.TokenUsageLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ApiProviderService {

    @Autowired
    private ApiProviderRepository apiProviderRepository;

    @Autowired
    private TokenUsageLogRepository tokenUsageLogRepository;

    // ── Provider Management ──────────────────────────────────────────────────

    // Returns all providers (for the admin list view)
    public List<ApiProvider> getAllProviders() {
        return apiProviderRepository.findAll();
    }

    // Returns one provider by id
    public Optional<ApiProvider> getProviderById(Integer id) {
        return apiProviderRepository.findById(id);
    }

    // Returns the currently active provider
    // Flask calls this (via Spring) to get the key it should use
    public Optional<ApiProvider> getActiveProvider() {
        return apiProviderRepository.findByIsActiveTrue();
    }

    // Saves a new provider to the database
    public ApiProvider createProvider(ApiProvider provider) {
        // New providers are inactive by default — admin must explicitly activate
        provider.setIsActive(false);
        return apiProviderRepository.save(provider);
    }

    // Updates an existing provider's name, key, or model
    public ApiProvider updateProvider(Integer id, ApiProvider updated) {
        ApiProvider existing = apiProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + id));

        existing.setName(updated.getName());
        existing.setApiKey(updated.getApiKey());
        existing.setModelName(updated.getModelName());

        return apiProviderRepository.save(existing);
    }

    // Sets one provider as active, deactivates all others
    // This ensures only one provider is active at a time
    public ApiProvider setActiveProvider(Integer id) {
        // First deactivate everyone
        List<ApiProvider> all = apiProviderRepository.findAll();
        for (ApiProvider p : all) {
            p.setIsActive(false);
        }
        apiProviderRepository.saveAll(all);

        // Now activate the chosen one
        ApiProvider chosen = apiProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + id));
        chosen.setIsActive(true);
        return apiProviderRepository.save(chosen);
    }

    // Deletes a provider — cannot delete the active one
    public void deleteProvider(Integer id) {
        ApiProvider provider = apiProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + id));

        if (Boolean.TRUE.equals(provider.getIsActive())) {
            throw new RuntimeException("Cannot delete the active provider. Switch to another first.");
        }

        apiProviderRepository.deleteById(id);
    }

    // ── Token Usage ──────────────────────────────────────────────────────────

    // Saves a token usage record sent by Flask
    public TokenUsageLog logTokenUsage(TokenUsageLog log) {
        return tokenUsageLogRepository.save(log);
    }

    // Returns all logs for one provider
    public List<TokenUsageLog> getLogsForProvider(Integer providerId) {
        return tokenUsageLogRepository.findByProviderIdOrderByUsedAtDesc(providerId);
    }

    // Returns total tokens used by one provider (for the summary card)
    public Long getTotalTokensForProvider(Integer providerId) {
        return tokenUsageLogRepository.sumTotalTokensByProviderId(providerId);
    }
}