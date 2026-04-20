package com.example.hireiqse.config;

import com.example.hireiqse.service.UserAccountService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuthDataInitializer {

    @Bean
    CommandLineRunner seedDefaultUsers(UserAccountService userAccountService) {
        return args -> userAccountService.ensureDefaultUsers();
    }
}

