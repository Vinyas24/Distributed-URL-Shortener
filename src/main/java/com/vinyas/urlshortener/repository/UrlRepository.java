package com.vinyas.urlshortener.repository;

import java.util.Optional;

import com.vinyas.urlshortener.entity.UrlEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UrlRepository extends JpaRepository<UrlEntity, Long> {

    Optional<UrlEntity> findByShortCode(String shortCode);
}
