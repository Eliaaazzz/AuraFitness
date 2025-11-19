package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.ShoppingList;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for shopping list management
 */
public interface ShoppingListRepository extends JpaRepository<ShoppingList, UUID> {

    /**
     * Find all shopping lists for a user, ordered by most recent
     */
    List<ShoppingList> findByUserIdOrderByCreatedDateDesc(UUID userId);

    /**
     * Find shopping lists for a user within a date range
     */
    List<ShoppingList> findByUserIdAndCreatedDateBetween(
            UUID userId, LocalDate startDate, LocalDate endDate);

    /**
     * Find incomplete shopping lists for a user
     */
    @Query("SELECT sl FROM ShoppingList sl WHERE sl.userId = :userId AND sl.isCompleted = false ORDER BY sl.createdDate DESC")
    List<ShoppingList> findIncompleteByUserId(@Param("userId") UUID userId);

    /**
     * Find shopping list with items loaded (avoid N+1)
     */
    @EntityGraph(attributePaths = {"items"})
    @Query("SELECT sl FROM ShoppingList sl WHERE sl.id = :id")
    Optional<ShoppingList> findByIdWithItems(@Param("id") UUID id);

    /**
     * Count shopping lists for a user
     */
    long countByUserId(UUID userId);

    /**
     * Delete old completed shopping lists
     */
    @Query("DELETE FROM ShoppingList sl WHERE sl.userId = :userId AND sl.isCompleted = true AND sl.createdDate < :beforeDate")
    int deleteOldCompletedLists(@Param("userId") UUID userId, @Param("beforeDate") LocalDate beforeDate);
}
