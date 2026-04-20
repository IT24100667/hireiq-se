package com.example.hireiqse.service;

import com.example.hireiqse.entity.Role;
import com.example.hireiqse.entity.UserAccount;
import com.example.hireiqse.repository.UserAccountRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class UserAccountService implements UserDetailsService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAccountService(UserAccountRepository userAccountRepository,
                              PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + account.getRole().name());
        return User.withUsername(account.getUsername())
                .password(account.getPassword())
                .authorities(authority)
                .disabled(!account.isEnabled())
                .build();
    }

    public List<Map<String, Object>> getAllUsers() {
        return userAccountRepository.findAll().stream()
                .sorted(Comparator.comparing(UserAccount::getCreatedAt).reversed())
                .map(this::toSafeMap)
                .toList();
    }

    public Map<String, Object> createUser(String username, String rawPassword, Role role) {
        String normalized = username == null ? "" : username.trim().toLowerCase();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (rawPassword == null || rawPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        if (userAccountRepository.existsByUsername(normalized)) {
            throw new IllegalArgumentException("Username already exists");
        }

        UserAccount account = new UserAccount();
        account.setUsername(normalized);
        account.setPassword(passwordEncoder.encode(rawPassword));
        account.setRole(role);
        account.setEnabled(true);

        return toSafeMap(userAccountRepository.save(account));
    }

    public Map<String, Object> setEnabled(Long id, boolean enabled) {
        UserAccount account = userAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        account.setEnabled(enabled);
        return toSafeMap(userAccountRepository.save(account));
    }

    public void ensureDefaultUsers() {
        ensureUser("admin", "admin123", Role.ADMIN);
        ensureUser("hr", "hr12345", Role.HR);
        ensureUser("user", "user12345", Role.USER);
    }

    private void ensureUser(String username, String rawPassword, Role role) {
        if (userAccountRepository.existsByUsername(username)) {
            return;
        }
        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPassword(passwordEncoder.encode(rawPassword));
        account.setRole(role);
        account.setEnabled(true);
        userAccountRepository.save(account);
    }

    private Map<String, Object> toSafeMap(UserAccount account) {
        return Map.of(
                "id", account.getId(),
                "username", account.getUsername(),
                "role", account.getRole().name(),
                "enabled", account.isEnabled(),
                "createdAt", account.getCreatedAt().toString()
        );
    }
}

