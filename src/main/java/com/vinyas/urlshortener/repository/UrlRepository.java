package com.vinyas.urlshortener.repository;

import java.util.List;
import java.util.Optional;

import com.vinyas.urlshortener.entity.UrlEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UrlRepository extends JpaRepository<UrlEntity, Long> {

    Optional<UrlEntity> findByShortCode(String shortCode);

    Page<UrlEntity> findByOwnerId(String ownerId, Pageable pageable);

    List<UrlEntity> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

    void deleteByShortCode(String shortCode);
}
