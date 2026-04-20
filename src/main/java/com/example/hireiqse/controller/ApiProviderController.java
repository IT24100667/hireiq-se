// controller/ApiProviderController.java
// Exposes REST endpoints for managing API providers and token usage.
// Only ADMIN role can access these endpoints.

package com.example.hireiqse.controller;

import com.example.hireiqse.entity.ApiProvider;
import com.example.hireiqse.entity.TokenUsageLog;
import com.example.hireiqse.service.ApiProviderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/providers")
public class ApiProviderController {

    @Autowired
    private ApiProviderService apiProviderService;

    // ── Provider CRUD ────────────────────────────────────────────────────────

    // GET /api/providers
    // Returns all providers — admin sees this in the management table
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ApiProvider>> getAllProviders() {
        return ResponseEntity.ok(apiProviderService.getAllProviders());
    }

    // GET /api/providers/active
    // Returns the active provider's config (key + model)
    // Flask calls this through Spring to know which key to use
    @GetMapping("/active")
    public ResponseEntity<?> getActiveProvider() {
        Optional<ApiProvider> active = apiProviderService.getActiveProvider();
        if (active.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "No active provider configured"));
        }
        return ResponseEntity.ok(active.get());
    }

    // POST /api/providers
    // Adds a new provider — admin fills the form and submits
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiProvider> createProvider(@RequestBody ApiProvider provider) {
        return ResponseEntity.ok(apiProviderService.createProvider(provider));
    }

    // PUT /api/providers/{id}
    // Updates name, key, or model of an existing provider
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiProvider> updateProvider(
            @PathVariable Integer id,
            @RequestBody ApiProvider updated) {
        return ResponseEntity.ok(apiProviderService.updateProvider(id, updated));
    }

    // PUT /api/providers/{id}/activate
    // Sets this provider as the active one — deactivates all others
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiProvider> activateProvider(@PathVariable Integer id) {
        return ResponseEntity.ok(apiProviderService.setActiveProvider(id));
    }

    // DELETE /api/providers/{id}
    // Removes a provider — blocked if it's currently active
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteProvider(@PathVariable Integer id) {
        try {
            apiProviderService.deleteProvider(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Provider deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Token Usage ──────────────────────────────────────────────────────────

    // POST /api/providers/token-usage
    // Flask calls this after every AI call to log token consumption
    @PostMapping("/token-usage")
    public ResponseEntity<TokenUsageLog> logTokenUsage(@RequestBody TokenUsageLog log) {
        return ResponseEntity.ok(apiProviderService.logTokenUsage(log));
    }

    // GET /api/providers/{id}/token-usage
    // Returns all token logs for one provider (admin detail view)
    @GetMapping("/{id}/token-usage")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TokenUsageLog>> getTokenUsage(@PathVariable Integer id) {
        return ResponseEntity.ok(apiProviderService.getLogsForProvider(id));
    }

    // GET /api/providers/{id}/token-total
    // Returns total token count for one provider (summary card)
    @GetMapping("/{id}/token-total")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> getTokenTotal(@PathVariable Integer id) {
        Long total = apiProviderService.getTotalTokensForProvider(id);
        return ResponseEntity.ok(Map.of("total_tokens", total));
    }
}