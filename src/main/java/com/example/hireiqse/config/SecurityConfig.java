package com.example.hireiqse.config;

import com.example.hireiqse.service.UserAccountService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   LoginSuccessHandler loginSuccessHandler,
                                                   UserAccountService userAccountService) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .userDetailsService(userAccountService)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/login", "/components/login.html", "/components/index.html", "/css/**", "/js/**","/images/**", "/error").permitAll()
                        .requestMatchers("/admin/**", "/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/user-dashboard").hasRole("USER")
                        .requestMatchers(
                                "/home", "/dashboard", "/upload", "/job-input", "/rankings", "/candidate", "/comparison",
                                "/chat", "/interview", "/jd-analyzer", "/kanban"
                        ).hasAnyRole("ADMIN", "HR")
                        .requestMatchers("/api/auth/me").authenticated()
                        // Flask internal calls — no browser session, must be open
                        .requestMatchers("/api/providers/active").permitAll()
                        .requestMatchers("/api/providers/token-usage").permitAll()
                        .requestMatchers("/api/**").hasAnyRole("ADMIN", "HR")
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form
                        .loginPage("/login")
                        .successHandler(loginSuccessHandler)
                        .permitAll()
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout")
                        .permitAll()
                )
                .exceptionHandling(ex -> ex.accessDeniedPage("/access-denied"));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

