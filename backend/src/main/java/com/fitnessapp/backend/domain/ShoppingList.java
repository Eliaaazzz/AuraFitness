package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Shopping list entity for meal planning
 * Aggregates ingredients from multiple recipes
 */
@Entity
@Table(name = "shopping_list")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShoppingList {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "created_date")
    private LocalDate createdDate;

    @OneToMany(mappedBy = "shoppingList", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ShoppingListItem> items = new ArrayList<>();

    @Column(name = "estimated_cost")
    private Double estimatedCost;

    @Column(name = "is_completed")
    @Builder.Default
    private Boolean isCompleted = false;

    /**
     * Add item to shopping list
     */
    public void addItem(ShoppingListItem item) {
        items.add(item);
        item.setShoppingList(this);
    }

    /**
     * Calculate completion percentage
     */
    public int getCompletionPercentage() {
        if (items.isEmpty()) {
            return 0;
        }
        long checkedItems = items.stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsChecked()))
                .count();
        return (int) ((checkedItems * 100) / items.size());
    }

    /**
     * Check if all items are checked
     */
    public boolean isFullyCompleted() {
        return !items.isEmpty() && items.stream()
                .allMatch(item -> Boolean.TRUE.equals(item.getIsChecked()));
    }
}
