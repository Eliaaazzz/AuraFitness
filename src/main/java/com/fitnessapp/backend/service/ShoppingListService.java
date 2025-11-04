package com.fitnessapp.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.recipe.MealPlanHistoryService;
import com.fitnessapp.backend.recipe.SmartRecipeService;
import com.fitnessapp.backend.recipe.SmartRecipeService.MealEntry;
import com.fitnessapp.backend.recipe.SmartRecipeService.MealPlanDay;
import com.fitnessapp.backend.recipe.SmartRecipeService.MealPlanResponse;
import com.fitnessapp.backend.repository.RecipeRepository;
import jakarta.persistence.EntityNotFoundException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShoppingListService {

  private final MealPlanHistoryService mealPlanHistoryService;
  private final RecipeRepository recipeRepository;
  private final ObjectMapper objectMapper;

  @Transactional(readOnly = true)
  public ShoppingList buildShoppingList(UUID userId, LocalDate requestedWeekStart) {
    MealPlanResponseWrapper wrapper = resolvePlan(userId, requestedWeekStart);
    MealPlanResponse plan = wrapper.plan();
    LocalDate weekStart = wrapper.weekStart();
    LocalDate weekEnd = weekStart.plusDays(Math.max(plan.days().size(), 7) - 1);

    Map<UUID, Recipe> recipesById = loadRecipes(plan);
    Map<String, Recipe> recipeNameCache = new LinkedHashMap<>();

    Map<IngredientCategory, Map<String, AggregateItem>> grouped = new EnumMap<>(IngredientCategory.class);
    for (IngredientCategory category : IngredientCategory.values()) {
      grouped.put(category, new LinkedHashMap<>());
    }

    for (MealPlanDay day : plan.days()) {
      if (CollectionUtils.isEmpty(day.meals())) {
        continue;
      }
      for (MealEntry meal : day.meals()) {
        resolveRecipe(meal, recipesById, recipeNameCache).ifPresent(recipe -> {
          addIngredients(grouped, recipe, meal);
        });
      }
    }

    List<ShoppingList.Category> categories = grouped.entrySet().stream()
        .filter(entry -> !entry.getValue().isEmpty())
        .map(entry -> new ShoppingList.Category(
            entry.getKey().displayName(),
            entry.getValue().values().stream()
                .sorted((left, right) -> left.name.compareToIgnoreCase(right.name))
                .map(AggregateItem::toItem)
                .collect(Collectors.toList())
        ))
        .collect(Collectors.toList());

    return new ShoppingList(weekStart, weekEnd, categories, null);
  }

  @Transactional(readOnly = true)
  public byte[] renderPdf(ShoppingList shoppingList) {
    try (PDDocument document = new PDDocument()) {
      PdfWriter writer = new PdfWriter(document);
      writer.writeTitle("每周购物清单");
      writer.writeSubtitle(shoppingList.weekStart() + " - " + shoppingList.weekEnd());
      writer.writeBlankLine();

      for (ShoppingList.Category category : shoppingList.categories()) {
        writer.writeSectionHeader(category.name());
        for (ShoppingList.Item item : category.items()) {
          String quantity = formatQuantity(item.quantity(), item.unit(), item.estimated());
          StringBuilder line = new StringBuilder("• ").append(item.ingredientName());
          if (StringUtils.hasText(quantity)) {
            line.append(" ").append(quantity);
          }
          if (!CollectionUtils.isEmpty(item.recipes())) {
            line.append(" (").append(String.join(", ", item.recipes())).append(")");
          }
          writer.writeLine(line.toString());
        }
        writer.writeBlankLine();
      }

      if (shoppingList.estimatedCost() != null) {
        writer.writeLine("预估总价：¥" + shoppingList.estimatedCost().setScale(2, RoundingMode.HALF_UP));
      }

      return writer.finish();
    } catch (IOException ex) {
      throw new IllegalStateException("Failed to generate shopping list PDF", ex);
    }
  }

  private MealPlanResponseWrapper resolvePlan(UUID userId, LocalDate requestedWeekStart) {
    LocalDate normalizedStart = requestedWeekStart != null
        ? requestedWeekStart.with(DayOfWeek.MONDAY)
        : null;

    Optional<com.fitnessapp.backend.domain.MealPlan> planOpt = normalizedStart != null
        ? mealPlanHistoryService.planForWeek(userId, normalizedStart)
        : mealPlanHistoryService.latestPlan(userId);

    if (planOpt.isEmpty() && normalizedStart != null) {
      log.debug("No plan found for user {} at {}, falling back to latest", userId, normalizedStart);
      planOpt = mealPlanHistoryService.latestPlan(userId);
    }

    com.fitnessapp.backend.domain.MealPlan plan = planOpt.orElseThrow(
        () -> new EntityNotFoundException("No meal plan available for user " + userId));

    MealPlanResponse response = parsePlan(plan.getPlanPayload());
    LocalDate weekStart = normalizedStart != null
        ? normalizedStart
        : plan.getGeneratedAt()
            .atZoneSameInstant(ZoneOffset.UTC)
            .toLocalDate()
            .with(DayOfWeek.MONDAY);

    return new MealPlanResponseWrapper(response, weekStart);
  }

  private MealPlanResponse parsePlan(String payload) {
    try {
      return objectMapper.readValue(payload, SmartRecipeService.MealPlanResponse.class);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Failed to parse meal plan payload", e);
    }
  }

  private Map<UUID, Recipe> loadRecipes(MealPlanResponse plan) {
    Set<UUID> ids = plan.days().stream()
        .flatMap(day -> day.meals().stream())
        .map(MealEntry::recipeId)
        .filter(StringUtils::hasText)
        .map(id -> {
          try {
            return UUID.fromString(id);
          } catch (IllegalArgumentException e) {
            log.debug("Invalid recipe UUID in plan: {}", id);
            return null;
          }
        })
        .filter(uuid -> uuid != null)
        .collect(Collectors.toSet());

    if (ids.isEmpty()) {
      return Map.of();
    }

    return recipeRepository.findByIdIn(ids).stream()
        .collect(Collectors.toMap(Recipe::getId, recipe -> recipe));
  }

  private Optional<Recipe> resolveRecipe(MealEntry meal, Map<UUID, Recipe> recipesById, Map<String, Recipe> recipeNameCache) {
    if (StringUtils.hasText(meal.recipeId())) {
      try {
        UUID recipeId = UUID.fromString(meal.recipeId());
        Recipe recipe = recipesById.get(recipeId);
        if (recipe != null) {
          return Optional.of(recipe);
        }
      } catch (IllegalArgumentException ignored) {
        log.debug("Skipping invalid recipe UUID {}", meal.recipeId());
      }
    }

    if (StringUtils.hasText(meal.recipeName())) {
      String key = meal.recipeName().trim().toLowerCase(Locale.ROOT);
      Recipe cached = recipeNameCache.get(key);
      if (cached != null) {
        return Optional.of(cached);
      }
      Optional<Recipe> fetched = recipeRepository.findFirstByTitleIgnoreCase(meal.recipeName().trim());
      fetched.ifPresent(recipe -> recipeNameCache.put(key, recipe));
      return fetched;
    }
    return Optional.empty();
  }

  private void addIngredients(Map<IngredientCategory, Map<String, AggregateItem>> grouped,
                              Recipe recipe,
                              MealEntry meal) {
    if (CollectionUtils.isEmpty(recipe.getIngredients())) {
      return;
    }
    String recipeLabel = StringUtils.hasText(recipe.getTitle()) ? recipe.getTitle() : "未命名食谱";
    for (RecipeIngredient relation : recipe.getIngredients()) {
      if (relation.getIngredient() == null || !StringUtils.hasText(relation.getIngredient().getName())) {
        continue;
      }
      String ingredientName = relation.getIngredient().getName().trim();
      IngredientCategory category = categorize(ingredientName);
      String unit = normalizeUnit(relation.getUnit());
      String key = ingredientName.toLowerCase(Locale.ROOT) + "|" + unit;

      Map<String, AggregateItem> bucket = grouped.computeIfAbsent(category, c -> new LinkedHashMap<>());
      AggregateItem item = bucket.computeIfAbsent(key, k -> new AggregateItem(ingredientName, unit));
      item.addQuantity(relation.getQuantity());
      item.addRecipe(recipeLabel, meal.mealType());
    }
  }

  private IngredientCategory categorize(String ingredientName) {
    if (!StringUtils.hasText(ingredientName)) {
      return IngredientCategory.OTHER;
    }
    String normalized = ingredientName.toLowerCase(Locale.ROOT);
    for (Map.Entry<IngredientCategory, List<String>> entry : CATEGORY_KEYWORDS.entrySet()) {
      if (entry.getValue().stream().anyMatch(normalized::contains)) {
        return entry.getKey();
      }
    }
    return IngredientCategory.OTHER;
  }

  private String normalizeUnit(String unit) {
    if (!StringUtils.hasText(unit)) {
      return "";
    }
    String normalized = unit.toLowerCase(Locale.ROOT).trim();
    return UNIT_ALIASES.getOrDefault(normalized, normalized);
  }

  private String formatQuantity(BigDecimal quantity, String unit, boolean estimated) {
    if (quantity == null) {
      return estimated ? "适量" + (StringUtils.hasText(unit) ? "(" + unit + ")" : "") : "";
    }
    BigDecimal scaled = quantity.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros();
    String formatted = scaled.toPlainString();
    if (StringUtils.hasText(unit)) {
      formatted = formatted + (unit.startsWith("/") ? "" : " ") + unit;
    }
    if (estimated) {
      formatted = "约 " + formatted;
    }
    return formatted;
  }

  private static final Map<String, String> UNIT_ALIASES = Map.ofEntries(
      Map.entry("grams", "g"),
      Map.entry("gram", "g"),
      Map.entry("g", "g"),
      Map.entry("kilograms", "kg"),
      Map.entry("kilogram", "kg"),
      Map.entry("ml", "ml"),
      Map.entry("milliliter", "ml"),
      Map.entry("milliliters", "ml"),
      Map.entry("tablespoon", "tbsp"),
      Map.entry("tablespoons", "tbsp"),
      Map.entry("tbsp", "tbsp"),
      Map.entry("teaspoon", "tsp"),
      Map.entry("teaspoons", "tsp"),
      Map.entry("tsp", "tsp"),
      Map.entry("cup", "cup"),
      Map.entry("cups", "cup")
  );

  private static final Map<IngredientCategory, List<String>> CATEGORY_KEYWORDS = Map.ofEntries(
      Map.entry(IngredientCategory.PRODUCE, List.of(
          "lettuce", "spinach", "kale", "broccoli", "cauliflower", "carrot", "pepper", "tomato", "onion", "potato",
          "apple", "banana", "berry", "orange", "lemon", "lime", "cabbage", "mushroom", "菜", "青椒", "西兰花", "胡萝卜", "洋葱", "土豆", "菠菜"
      )),
      Map.entry(IngredientCategory.PROTEIN, List.of(
          "chicken", "beef", "pork", "lamb", "turkey", "egg", "tofu", "tempeh", "salmon", "tuna", "shrimp", "prawn",
          "豆腐", "鸡", "牛肉", "猪肉", "羊肉", "虾", "蛋", "鸡胸"
      )),
      Map.entry(IngredientCategory.GRAINS, List.of(
          "rice", "oats", "oat", "quinoa", "bread", "pasta", "noodle", "udon", "buckwheat", "面", "饭", "米", "燕麦", "意面", "面条"
      )),
      Map.entry(IngredientCategory.DAIRY, List.of(
          "milk", "cheese", "yogurt", "cream", "butter", "奶", "芝士", "黄油", "酸奶"
      )),
      Map.entry(IngredientCategory.PANTRY, List.of(
          "bean", "lentil", "chickpea", "canned", "nuts", "almond", "walnut", "peanut", "黑豆", "红豆", "罐头", "坚果"
      )),
      Map.entry(IngredientCategory.SEASONING, List.of(
          "salt", "pepper", "garlic", "ginger", "soy", "sauce", "vinegar", "oil", "spice", "herb",
          "盐", "胡椒", "蒜", "姜", "酱油", "料酒", "醋", "香料", "辣椒"
      )),
      Map.entry(IngredientCategory.FROZEN, List.of(
          "frozen", "冰淇淋", "冷冻"
      ))
  );

  private enum IngredientCategory {
    PRODUCE("蔬菜水果"),
    PROTEIN("蛋白肉类"),
    GRAINS("主食谷物"),
    DAIRY("乳制品"),
    PANTRY("干货罐头"),
    SEASONING("调味配料"),
    FROZEN("冷冻速食"),
    OTHER("其他");

    private final String displayName;

    IngredientCategory(String displayName) {
      this.displayName = displayName;
    }

    public String displayName() {
      return displayName;
    }
  }

  private static final class AggregateItem {
    private final String name;
    private final String unit;
    private BigDecimal quantity;
    private boolean estimated;
    private final Set<String> recipes = new LinkedHashSet<>();

    AggregateItem(String name, String unit) {
      this.name = name;
      this.unit = unit;
    }

    void addQuantity(BigDecimal addition) {
      if (addition == null) {
        this.estimated = true;
        return;
      }
      if (this.quantity == null) {
        this.quantity = addition;
      } else {
        this.quantity = this.quantity.add(addition);
      }
    }

    void addRecipe(String recipeName, String mealType) {
      if (StringUtils.hasText(recipeName)) {
        recipes.add(recipeName);
      }
    }

    ShoppingList.Item toItem() {
      return new ShoppingList.Item(
          name,
          quantity,
          StringUtils.hasText(unit) ? unit : null,
          estimated || quantity == null,
          new ArrayList<>(recipes)
      );
    }
  }

  private static final class PdfWriter {
    private static final float MARGIN = 40f;
    private static final float LEADING = 18f;
    private static final int MAX_LINES_PER_PAGE = 38;

    private final PDDocument document;
    private PDPageContentStream stream;
    private PDPage page;
    private int linesOnPage;

    PdfWriter(PDDocument document) throws IOException {
      this.document = document;
      addPage();
    }

    void writeTitle(String text) throws IOException {
      write(text, PDType1Font.HELVETICA_BOLD, 18);
    }

    void writeSubtitle(String text) throws IOException {
      write(text, PDType1Font.HELVETICA, 12);
    }

    void writeSectionHeader(String text) throws IOException {
      write(text, PDType1Font.HELVETICA_BOLD, 14);
    }

    void writeLine(String text) throws IOException {
      write(text, PDType1Font.HELVETICA, 11);
    }

    void writeBlankLine() throws IOException {
      ensureCapacity();
      stream.newLine();
      linesOnPage++;
    }

    private void write(String text, org.apache.pdfbox.pdmodel.font.PDFont font, float size) throws IOException {
      ensureCapacity();
      stream.setFont(font, size);
      stream.showText(sanitize(text));
      stream.newLine();
      linesOnPage++;
    }

    private String sanitize(String text) {
      if (!StringUtils.hasText(text)) {
        return "";
      }
      StringBuilder builder = new StringBuilder(text.length());
      for (char ch : text.toCharArray()) {
        if (ch >= 32 && ch <= 126) {
          builder.append(ch);
        } else {
          builder.append('?');
        }
      }
      return builder.toString();
    }

    private void ensureCapacity() throws IOException {
      if (linesOnPage >= MAX_LINES_PER_PAGE) {
        addPage();
      }
    }

    private void addPage() throws IOException {
      if (stream != null) {
        stream.endText();
        stream.close();
      }
      page = new PDPage();
      document.addPage(page);
      stream = new PDPageContentStream(document, page);
      stream.setLeading(LEADING);
      float yStart = page.getMediaBox().getHeight() - MARGIN;
      stream.beginText();
      stream.newLineAtOffset(MARGIN, yStart);
      linesOnPage = 0;
    }

    byte[] finish() throws IOException {
      if (stream != null) {
        stream.endText();
        stream.close();
      }
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      document.save(output);
      return output.toByteArray();
    }
  }

  private record MealPlanResponseWrapper(MealPlanResponse plan, LocalDate weekStart) {}

  public record ShoppingList(LocalDate weekStart,
                             LocalDate weekEnd,
                             List<Category> categories,
                             BigDecimal estimatedCost) {

    public record Category(String name, List<Item> items) {}

    public record Item(String ingredientName,
                       BigDecimal quantity,
                       String unit,
                       boolean estimated,
                       List<String> recipes) {}
  }
}
