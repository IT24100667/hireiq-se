// config/RestTemplateConfig.java
// Sets up RestTemplate - the tool Spring uses to make HTTP calls to Flask.
// By defining it here as a @Bean, Spring manages it and we can
// inject it anywhere with @Autowired.

package com.example.hireiqse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        // Configure timeouts so Flask calls don't fail when processing many resumes.
        // Each resume triggers AI extraction + embedding, which can take time.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(java.time.Duration.ofSeconds(30));   // 30s to establish connection
        factory.setReadTimeout(java.time.Duration.ofSeconds(120));     // 120s to wait for Flask response
        return new RestTemplate(factory);
    }
}