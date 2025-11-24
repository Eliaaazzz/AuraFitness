package com.fitnessapp.backend.controller;

import com.fitnessapp.backend.domain.ShoppingList;
import com.fitnessapp.backend.domain.ShoppingListItem;
import com.fitnessapp.backend.service.ShoppingListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST API for shopping list management
 */
@RestController
@RequestMapping("/api/v1/shopping-lists")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Shopping Lists", description = "Smart shopping list generation from recipes")
public class ShoppingListController {

    private final ShoppingListService shoppingListService;

    /**
     * Generate shopping list from multiple recipes
     */
    @PostMapping("/generate")
    @Operation(summary = "Generate shopping list from recipes",
               description = "Aggregates ingredients from multiple recipes into a smart shopping list with category organization")
    public ResponseEntity<ShoppingListResponse> generateShoppingList(
            @Valid @RequestBody GenerateShoppingListRequest request) {

        log.info("Generating shopping list for user {} from {} recipes",
                request.userId(), request.recipeIds().size());

        ShoppingList shoppingList = shoppingListService.generateFromRecipes(
                request.userId(),
                request.listName(),
                request.recipeIds()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(shoppingList));
    }

    /**
     * Get shopping list by ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get shopping list by ID",
               description = "Retrieve a shopping list with all items")
    public ResponseEntity<ShoppingListResponse> getShoppingList(
            @Parameter(description = "Shopping list ID") @PathVariable UUID id) {

        return shoppingListService.getShoppingListById(id)
                .map(list -> ResponseEntity.ok(toResponse(list)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all shopping lists for user
     */
    @GetMapping
    @Operation(summary = "Get user's shopping lists",
               description = "Retrieve all shopping lists for a user, ordered by creation date")
    public ResponseEntity<List<ShoppingListSummary>> getUserShoppingLists(
            @Parameter(description = "User ID") @RequestParam UUID userId) {

        List<ShoppingList> lists = shoppingListService.getUserShoppingLists(userId);
        List<ShoppingListSummary> summaries = lists.stream()
                .map(this::toSummary)
                .toList();

        return ResponseEntity.ok(summaries);
    }

    /**
     * Get incomplete shopping lists
     */
    @GetMapping("/incomplete")
    @Operation(summary = "Get incomplete shopping lists",
               description = "Retrieve all incomplete shopping lists for a user")
    public ResponseEntity<List<ShoppingListSummary>> getIncompleteShoppingLists(
            @Parameter(description = "User ID") @RequestParam UUID userId) {

        List<ShoppingList> lists = shoppingListService.getIncompleteShoppingLists(userId);
        List<ShoppingListSummary> summaries = lists.stream()
                .map(this::toSummary)
                .toList();

        return ResponseEntity.ok(summaries);
    }

    /**
     * Toggle item checked status
     */
    @PatchMapping("/items/{itemId}/toggle")
    @Operation(summary = "Toggle item checked status",
               description = "Mark item as checked/unchecked")
    public ResponseEntity<Void> toggleItemChecked(
            @Parameter(description = "Item ID") @PathVariable UUID itemId) {

        shoppingListService.toggleItemChecked(itemId);
        return ResponseEntity.ok().build();
    }

    /**
     * Check all items in list
     */
    @PostMapping("/{listId}/check-all")
    @Operation(summary = "Check all items",
               description = "Mark all items in the shopping list as checked")
    public ResponseEntity<Void> checkAllItems(
            @Parameter(description = "Shopping list ID") @PathVariable UUID listId) {

        shoppingListService.checkAllItems(listId);
        return ResponseEntity.ok().build();
    }

    /**
     * Uncheck all items in list
     */
    @PostMapping("/{listId}/uncheck-all")
    @Operation(summary = "Uncheck all items",
               description = "Mark all items in the shopping list as unchecked")
    public ResponseEntity<Void> uncheckAllItems(
            @Parameter(description = "Shopping list ID") @PathVariable UUID listId) {

        shoppingListService.uncheckAllItems(listId);
        return ResponseEntity.ok().build();
    }

    /**
     * Add manual item to shopping list
     */
    @PostMapping("/{listId}/items")
    @Operation(summary = "Add manual item",
               description = "Add a custom item to the shopping list")
    public ResponseEntity<ShoppingListItemResponse> addManualItem(
            @Parameter(description = "Shopping list ID") @PathVariable UUID listId,
            @Valid @RequestBody AddItemRequest request) {

        ShoppingListItem item = shoppingListService.addManualItem(
                listId,
                request.ingredientName(),
                request.quantity(),
                request.unit()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toItemResponse(item));
    }

    /**
     * Update shopping list name
     */
    @PatchMapping("/{listId}/name")
    @Operation(summary = "Update list name",
               description = "Change the name of the shopping list")
    public ResponseEntity<ShoppingListResponse> updateListName(
            @Parameter(description = "Shopping list ID") @PathVariable UUID listId,
            @Valid @RequestBody UpdateNameRequest request) {

        ShoppingList updated = shoppingListService.updateListName(listId, request.name());
        return ResponseEntity.ok(toResponse(updated));
    }

    /**
     * Delete shopping list
     */
    @DeleteMapping("/{listId}")
    @Operation(summary = "Delete shopping list",
               description = "Permanently delete a shopping list and all its items")
    public ResponseEntity<Void> deleteShoppingList(
            @Parameter(description = "Shopping list ID") @PathVariable UUID listId) {

        shoppingListService.deleteShoppingList(listId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================================
    // Response DTOs
    // ============================================================================

    private ShoppingListResponse toResponse(ShoppingList list) {
        List<CategoryResponse> categories = list.getItems().stream()
                .collect(java.util.stream.Collectors.groupingBy(ShoppingListItem::getCategory))
                .entrySet().stream()
                .map(entry -> new CategoryResponse(
                        entry.getKey(),
                        entry.getValue().stream()
                                .map(this::toItemResponse)
                                .toList()
                ))
                .toList();

        return new ShoppingListResponse(
                list.getId(),
                list.getName(),
                list.getCreatedDate(),
                categories,
                list.getCompletionPercentage(),
                list.getIsCompleted()
        );
    }

    private ShoppingListItemResponse toItemResponse(ShoppingListItem item) {
        return new ShoppingListItemResponse(
                item.getId(),
                item.getIngredientName(),
                item.getQuantity(),
                item.getUnit(),
                item.getCategory(),
                item.getIsChecked(),
                item.getFromRecipes(),
                item.getDisplayText()
        );
    }

    private ShoppingListSummary toSummary(ShoppingList list) {
        return new ShoppingListSummary(
                list.getId(),
                list.getName(),
                list.getCreatedDate(),
                list.getItems().size(),
                list.getCompletionPercentage(),
                list.getIsCompleted()
        );
    }

    // ============================================================================
    // Request/Response Records
    // ============================================================================

    public record GenerateShoppingListRequest(
            @NotNull UUID userId,
            String listName,
            @NotEmpty List<UUID> recipeIds
    ) {}

    public record AddItemRequest(
            @NotNull String ingredientName,
            Double quantity,
            String unit
    ) {}

    public record UpdateNameRequest(
            @NotNull String name
    ) {}

    public record ShoppingListResponse(
            UUID id,
            String name,
            java.time.LocalDate createdDate,
            List<CategoryResponse> categories,
            int completionPercentage,
            Boolean isCompleted
    ) {}

    public record CategoryResponse(
            String name,
            List<ShoppingListItemResponse> items
    ) {}

    public record ShoppingListItemResponse(
            UUID id,
            String ingredientName,
            Double quantity,
            String unit,
            String category,
            Boolean isChecked,
            String fromRecipes,
            String displayText
    ) {}

    public record ShoppingListSummary(
            UUID id,
            String name,
            java.time.LocalDate createdDate,
            int itemCount,
            int completionPercentage,
            Boolean isCompleted
    ) {}
}
