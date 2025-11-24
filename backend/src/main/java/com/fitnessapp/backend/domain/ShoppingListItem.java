package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Individual item in a shopping list
 * Represents an aggregated ingredient from one or more recipes
 */
@Entity
@Table(name = "shopping_list_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShoppingListItem {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shopping_list_id", nullable = false)
    private ShoppingList shoppingList;

    @Column(name = "ingredient_name", nullable = false)
    private String ingredientName;

    @Column(name = "quantity")
    private Double quantity;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "category", nullable = false, length = 50)
    private String category; // "produce", "meat", "dairy", "pantry", "frozen", "bakery", "beverages", "other"

    @Column(name = "is_checked")
    @Builder.Default
    private Boolean isChecked = false;

    @Column(name = "from_recipes", columnDefinition = "TEXT")
    private String fromRecipes; // Comma-separated recipe titles

    /**
     * Format quantity for display
     */
    public String getFormattedQuantity() {
        if (quantity == null) {
            return "";
        }

        // Handle fractions nicely
        if (quantity == 0.25) return "1/4";
        if (quantity == 0.33 || quantity == 0.34) return "1/3";
        if (quantity == 0.5) return "1/2";
        if (quantity == 0.66 || quantity == 0.67) return "2/3";
        if (quantity == 0.75) return "3/4";

        // Whole numbers
        if (quantity == Math.floor(quantity)) {
            return String.valueOf(quantity.intValue());
        }

        // Decimals
        return String.format("%.1f", quantity);
    }

    /**
     * Get full display text
     */
    public String getDisplayText() {
        StringBuilder sb = new StringBuilder();

        String formattedQty = getFormattedQuantity();
        if (!formattedQty.isEmpty()) {
            sb.append(formattedQty);
            if (unit != null && !unit.isEmpty()) {
                sb.append(" ").append(unit);
            }
            sb.append(" ");
        }

        sb.append(ingredientName);
        return sb.toString();
    }
}
