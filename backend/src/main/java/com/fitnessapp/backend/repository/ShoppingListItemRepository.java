package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.ShoppingListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository for shopping list item management
 */
public interface ShoppingListItemRepository extends JpaRepository<ShoppingListItem, UUID> {

    /**
     * Find all items for a shopping list
     */
    List<ShoppingListItem> findByShoppingListId(UUID shoppingListId);

    /**
     * Find items by category
     */
    List<ShoppingListItem> findByShoppingListIdAndCategory(UUID shoppingListId, String category);

    /**
     * Find unchecked items
     */
    @Query("SELECT sli FROM ShoppingListItem sli WHERE sli.shoppingList.id = :listId AND sli.isChecked = false")
    List<ShoppingListItem> findUncheckedItems(@Param("listId") UUID listId);

    /**
     * Count items by status
     */
    long countByShoppingListIdAndIsChecked(UUID shoppingListId, Boolean isChecked);

    /**
     * Toggle item checked status
     */
    @Modifying
    @Query("UPDATE ShoppingListItem sli SET sli.isChecked = :checked WHERE sli.id = :itemId")
    int updateCheckedStatus(@Param("itemId") UUID itemId, @Param("checked") Boolean checked);

    /**
     * Mark all items as checked
     */
    @Modifying
    @Query("UPDATE ShoppingListItem sli SET sli.isChecked = true WHERE sli.shoppingList.id = :listId")
    int checkAllItems(@Param("listId") UUID listId);

    /**
     * Uncheck all items
     */
    @Modifying
    @Query("UPDATE ShoppingListItem sli SET sli.isChecked = false WHERE sli.shoppingList.id = :listId")
    int uncheckAllItems(@Param("listId") UUID listId);
}
