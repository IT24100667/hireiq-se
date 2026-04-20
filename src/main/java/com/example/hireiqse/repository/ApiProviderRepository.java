// repository/ApiProviderRepository.java
// Handles all database queries for the api_providers table.
// Spring auto-implements these methods — no SQL needed.

package com.example.hireiqse.repository;

import com.example.hireiqse.entity.ApiProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ApiProviderRepository extends JpaRepository<ApiProvider, Integer> {

    // Finds the currently active provider
    // Returns Optional because there might be no active provider yet
    Optional<ApiProvider> findByIsActiveTrue();
}