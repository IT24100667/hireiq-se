package com.example.hireiqse.controller;

import com.example.hireiqse.entity.Role;
import com.example.hireiqse.service.UserAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserAccountService userAccountService;

    public AdminUserController(UserAccountService userAccountService) {
        this.userAccountService = userAccountService;
    }

    @GetMapping
    public ResponseEntity<?> getUsers() {
        return ResponseEntity.ok(userAccountService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        try {
            String username = body.get("username");
            String password = body.get("password");
            String roleText = body.getOrDefault("role", "HR");
            Role role = Role.valueOf(roleText.trim().toUpperCase());

            if (role == Role.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("error", "Use database setup for additional admins"));
            }

            return ResponseEntity.ok(userAccountService.createUser(username, password, role));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        try {
            boolean enabled = body.getOrDefault("enabled", true);
            return ResponseEntity.ok(userAccountService.setEnabled(id, enabled));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}

