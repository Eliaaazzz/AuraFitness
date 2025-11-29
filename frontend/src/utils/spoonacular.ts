/**
 * Spoonacular Image Utilities
 * 
 * Handles image URL construction and recipe normalization for Spoonacular API.
 * 
 * Spoonacular image URL pattern:
 * https://img.spoonacular.com/recipes/{id}-{size}.{imageType}
 * 
 * Valid sizes: "90x90", "240x150", "312x231", "480x360", "556x370", "636x393"
 */

// ============================================================================
// Constants
// ============================================================================

/** Spoonacular image server base URL */
export const SPOONACULAR_IMAGE_BASE = 'https://img.spoonacular.com/recipes';

/** Available Spoonacular image sizes */
export const SPOONACULAR_SIZES = {
  /** 90x90 - Tiny thumbnail */
  TINY: '90x90',
  /** 240x150 - Small thumbnail for lists */
  THUMB: '240x150',
  /** 312x231 - Medium size for cards */
  SMALL: '312x231',
  /** 480x360 - Medium-large for detail previews */
  MEDIUM: '480x360',
  /** 556x370 - Large for hero images */
  LARGE: '556x370',
  /** 636x393 - Full size for detail pages */
  FULL: '636x393',
} as const;

export type SpoonacularSize = (typeof SPOONACULAR_SIZES)[keyof typeof SPOONACULAR_SIZES];

/** Global fallback image when no image data is available */
export const FALLBACK_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';

// ============================================================================
// Types
// ============================================================================

/**
 * Raw recipe data as received from Spoonacular API or our backend DB.
 * Fields may be missing or null.
 */
export interface RawSpoonRecipe {
  /** Spoonacular recipe ID (number) - may be stored as string in our DB */
  id: number | string;
  /** Recipe title */
  title: string;
  /** Image type extension (e.g., "jpg", "png") */
  imageType?: string | null;
  /** Full image URL (optional, we prefer building from id + imageType) */
  image?: string | null;
  /** Alternative: imageUrl from our DB */
  imageUrl?: string | null;
  /** Cooking time in minutes */
  timeMinutes?: number | null;
  readyInMinutes?: number | null;
  /** Difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  /** Calories per serving */
  calories?: number | null;
  /** Nutrition summary */
  nutritionSummary?: Record<string, unknown> | null;
  /** Ingredients list */
  ingredients?: RecipeIngredient[] | null;
  extendedIngredients?: ExtendedIngredient[] | null;
  /** Cooking steps */
  steps?: string[] | Record<string, unknown> | null;
  instructions?: string | null;
  analyzedInstructions?: AnalyzedInstruction[] | null;
  /** Tags for categorization */
  tags?: string[] | null;
  dishTypes?: string[] | null;
  cuisines?: string[] | null;
  diets?: string[] | null;
  /** Whether AI generated */
  isAiGenerated?: boolean | null;
}

/** Ingredient from our DB format */
export interface RecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
}

/** Extended ingredient from Spoonacular */
export interface ExtendedIngredient {
  id?: number;
  name: string;
  original?: string;
  amount?: number;
  unit?: string;
}

/** Analyzed instruction from Spoonacular */
export interface AnalyzedInstruction {
  name?: string;
  steps: {
    number: number;
    step: string;
    ingredients?: { id: number; name: string }[];
    equipment?: { id: number; name: string }[];
  }[];
}

/**
 * Image URLs for different use cases.
 * All URLs are guaranteed to be valid strings.
 */
export interface RecipeImageUrls {
  /** Thumbnail for lists (240x150) */
  thumb: string;
  /** Medium size for cards (480x360) */
  medium: string;
  /** Large size for detail pages (636x393) */
  large: string;
  /** Original source URL if available */
  original?: string;
}

/**
 * Normalized recipe for use in the app.
 * All fields are guaranteed to have safe default values.
 */
export interface NormalizedRecipe {
  /** Recipe ID (always string for consistency) */
  id: string;
  /** Recipe title */
  title: string;
  /** Image URLs for different variants */
  image: RecipeImageUrls;
  /** Cooking time in minutes */
  timeMinutes: number;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Calories per serving (optional) */
  calories?: number;
  /** Nutrition summary */
  nutritionSummary?: Record<string, unknown> | null;
  /** Ingredients list */
  ingredients: RecipeIngredient[];
  /** Cooking steps as string array */
  steps: string[];
  /** Tags for categorization */
  tags: string[];
  /** Whether AI generated */
  isAiGenerated: boolean;
}

// ============================================================================
// Image URL Builders
// ============================================================================

/**
 * Build a Spoonacular image URL from recipe ID, size, and image type.
 * 
 * @param id - Spoonacular recipe ID
 * @param size - Image size (e.g., "240x150", "636x393")
 * @param imageType - Image extension (e.g., "jpg", "png"). Defaults to "jpg"
 * @returns Full Spoonacular image URL
 * 
 * @example
 * buildSpoonacularImageUrl(716429, "480x360", "jpg")
 * // => "https://img.spoonacular.com/recipes/716429-480x360.jpg"
 */
export function buildSpoonacularImageUrl(
  id: number | string,
  size: SpoonacularSize = SPOONACULAR_SIZES.MEDIUM,
  imageType: string = 'jpg'
): string {
  // Validate inputs
  if (!id) {
    return FALLBACK_RECIPE_IMAGE;
  }
  
  // Sanitize imageType
  const ext = (imageType || 'jpg').toLowerCase().replace(/^\./, '');
  
  return `${SPOONACULAR_IMAGE_BASE}/${id}-${size}.${ext}`;
}

/**
 * Build a complete set of image URLs for a recipe.
 * Returns URLs for thumb, medium, and large variants.
 * 
 * @param id - Spoonacular recipe ID
 * @param imageType - Image extension (e.g., "jpg", "png"). Defaults to "jpg"
 * @returns Object with thumb, medium, and large URLs
 * 
 * @example
 * buildSpoonacularImageSet(716429, "jpg")
 * // => {
 * //   thumb: "https://img.spoonacular.com/recipes/716429-240x150.jpg",
 * //   medium: "https://img.spoonacular.com/recipes/716429-480x360.jpg",
 * //   large: "https://img.spoonacular.com/recipes/716429-636x393.jpg"
 * // }
 */
export function buildSpoonacularImageSet(
  id: number | string,
  imageType: string | null = 'jpg'
): RecipeImageUrls {
  // Handle missing or invalid ID
  if (!id) {
    return {
      thumb: FALLBACK_RECIPE_IMAGE,
      medium: FALLBACK_RECIPE_IMAGE,
      large: FALLBACK_RECIPE_IMAGE,
    };
  }
  
  const ext = imageType ?? 'jpg';
  
  return {
    thumb: buildSpoonacularImageUrl(id, SPOONACULAR_SIZES.THUMB, ext),
    medium: buildSpoonacularImageUrl(id, SPOONACULAR_SIZES.MEDIUM, ext),
    large: buildSpoonacularImageUrl(id, SPOONACULAR_SIZES.FULL, ext),
  };
}

// ============================================================================
// Image URL Resolution
// ============================================================================

const SPOONACULAR_ID_REGEX = /\/recipes\/(\d+)-/;
const IMAGE_EXT_REGEX = /\.(\w+)(?:\?|$)/;

/**
 * Extract Spoonacular recipe ID from a Spoonacular image URL.
 * 
 * @param url - Spoonacular image URL
 * @returns Recipe ID or null if not a valid Spoonacular URL
 * 
 * @example
 * extractSpoonacularId("https://img.spoonacular.com/recipes/716429-312x231.jpg")
 * // => "716429"
 */
export function extractSpoonacularId(url: string): string | null {
  if (!url?.includes('spoonacular.com')) {
    return null;
  }
  
  // Pattern: /recipes/{id}-{size}.{ext}
  const match = SPOONACULAR_ID_REGEX.exec(url);
  return match ? match[1] : null;
}

/**
 * Extract image type from a Spoonacular image URL.
 * 
 * @param url - Spoonacular image URL
 * @returns Image extension (jpg, png, etc.) or null
 */
export function extractImageType(url: string): string | null {
  if (!url) return null;
  
  const match = IMAGE_EXT_REGEX.exec(url);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Resolve the best available image URLs from raw recipe data.
 * Priority:
 * 1. Build from id + imageType (preferred)
 * 2. Build from id extracted from image URL
 * 3. Use image/imageUrl directly
 * 4. Fall back to placeholder
 * 
 * @param raw - Raw recipe data
 * @returns RecipeImageUrls with guaranteed valid URLs
 */
export function resolveRecipeImageUrls(raw: Partial<RawSpoonRecipe>): RecipeImageUrls {
  const { id, imageType, image, imageUrl } = raw;
  
  // Strategy 1: Build from id + imageType (best quality)
  if (id && imageType) {
    return buildSpoonacularImageSet(id, imageType);
  }
  
  // Strategy 2: Extract id from existing image URL
  const existingUrl = image || imageUrl;
  if (existingUrl) {
    const extractedId = extractSpoonacularId(existingUrl);
    const extractedType = extractImageType(existingUrl);
    
    if (extractedId) {
      return buildSpoonacularImageSet(extractedId, extractedType || 'jpg');
    }
    
    // Strategy 3: Use the URL directly (non-Spoonacular or custom URL)
    return {
      thumb: existingUrl,
      medium: existingUrl,
      large: existingUrl,
      original: existingUrl,
    };
  }
  
  // Strategy 4: Build from just ID (assume jpg)
  if (id) {
    return buildSpoonacularImageSet(id, 'jpg');
  }
  
  // Strategy 5: Fallback to placeholder
  return {
    thumb: FALLBACK_RECIPE_IMAGE,
    medium: FALLBACK_RECIPE_IMAGE,
    large: FALLBACK_RECIPE_IMAGE,
  };
}

// ============================================================================
// Recipe Normalization
// ============================================================================

/**
 * Extract ingredients from various Spoonacular formats.
 */
function normalizeIngredients(raw: Partial<RawSpoonRecipe>): RecipeIngredient[] {
  // Our DB format
  if (raw.ingredients && Array.isArray(raw.ingredients)) {
    return raw.ingredients.map(ing => ({
      name: ing.name || '',
      quantity: ing.quantity,
      unit: ing.unit,
    }));
  }
  
  // Spoonacular extendedIngredients format
  if (raw.extendedIngredients && Array.isArray(raw.extendedIngredients)) {
    return raw.extendedIngredients.map(ing => ({
      name: ing.name || ing.original || '',
      quantity: ing.amount,
      unit: ing.unit,
    }));
  }
  
  return [];
}

/**
 * Extract steps from analyzedInstructions format.
 */
function extractAnalyzedSteps(instructions: AnalyzedInstruction[]): string[] {
  return instructions.flatMap(instruction => 
    (instruction.steps ?? [])
      .filter(step => step.step)
      .map(step => step.step)
  );
}

/**
 * Parse plain text instructions into steps.
 */
function parseTextInstructions(instructions: string): string[] {
  return instructions
    .split(/(?:\d+\.\s*|\n+)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Extract cooking steps from various Spoonacular formats.
 */
function normalizeSteps(raw: Partial<RawSpoonRecipe>): string[] {
  // Already string array
  if (Array.isArray(raw.steps)) {
    return raw.steps.filter((s): s is string => typeof s === 'string');
  }
  
  // Spoonacular analyzedInstructions format
  if (Array.isArray(raw.analyzedInstructions)) {
    return extractAnalyzedSteps(raw.analyzedInstructions);
  }
  
  // Plain text instructions
  if (typeof raw.instructions === 'string') {
    return parseTextInstructions(raw.instructions);
  }
  
  return [];
}

/**
 * Extract tags from various recipe fields.
 */
function normalizeTags(raw: Partial<RawSpoonRecipe>): string[] {
  const tags: string[] = [];
  
  if (raw.tags && Array.isArray(raw.tags)) {
    tags.push(...raw.tags);
  }
  if (raw.dishTypes && Array.isArray(raw.dishTypes)) {
    tags.push(...raw.dishTypes);
  }
  if (raw.cuisines && Array.isArray(raw.cuisines)) {
    tags.push(...raw.cuisines);
  }
  if (raw.diets && Array.isArray(raw.diets)) {
    tags.push(...raw.diets);
  }
  
  // Deduplicate and clean
  return [...new Set(tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0))];
}

/**
 * Normalize a single raw recipe into our app's format.
 * Guarantees all fields have safe default values.
 * 
 * @param raw - Raw recipe from Spoonacular or our DB
 * @returns Normalized recipe with guaranteed safe values
 * 
 * @example
 * const normalized = normalizeRecipe({
 *   id: 716429,
 *   title: "Pasta Carbonara",
 *   imageType: "jpg",
 *   readyInMinutes: 30
 * });
 * // normalized.image.thumb => "https://img.spoonacular.com/recipes/716429-240x150.jpg"
 */
export function normalizeRecipe(raw: RawSpoonRecipe): NormalizedRecipe {
  return {
    id: String(raw.id),
    title: raw.title || 'Untitled Recipe',
    image: resolveRecipeImageUrls(raw),
    timeMinutes: raw.timeMinutes || raw.readyInMinutes || 0,
    difficulty: raw.difficulty || 'medium',
    calories: raw.calories ?? undefined,
    nutritionSummary: raw.nutritionSummary,
    ingredients: normalizeIngredients(raw),
    steps: normalizeSteps(raw),
    tags: normalizeTags(raw),
    isAiGenerated: raw.isAiGenerated ?? false,
  };
}

/**
 * Normalize an array of raw recipes.
 * 
 * @param raws - Array of raw recipes
 * @returns Array of normalized recipes
 */
export function normalizeRecipes(raws: RawSpoonRecipe[]): NormalizedRecipe[] {
  if (!Array.isArray(raws)) {
    return [];
  }
  return raws.map(normalizeRecipe);
}

// ============================================================================
// Backward Compatibility: Convert to RecipeCard format
// ============================================================================

/**
 * Convert a NormalizedRecipe to the existing RecipeCard format.
 * This maintains backward compatibility with existing components.
 */
export function toRecipeCard(normalized: NormalizedRecipe): {
  id: string;
  title: string;
  imageUrl: string;
  image: RecipeImageUrls;
  timeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories?: number;
  nutritionSummary?: Record<string, unknown> | null;
  ingredients?: RecipeIngredient[];
  steps?: string[];
  tags?: string[];
  isAiGenerated?: boolean;
} {
  return {
    id: normalized.id,
    title: normalized.title,
    // Keep imageUrl for backward compat (use medium as default)
    imageUrl: normalized.image.medium,
    // Add full image set for new components
    image: normalized.image,
    timeMinutes: normalized.timeMinutes,
    difficulty: normalized.difficulty,
    calories: normalized.calories,
    nutritionSummary: normalized.nutritionSummary,
    ingredients: normalized.ingredients.length > 0 ? normalized.ingredients : undefined,
    steps: normalized.steps.length > 0 ? normalized.steps : undefined,
    tags: normalized.tags.length > 0 ? normalized.tags : undefined,
    isAiGenerated: normalized.isAiGenerated || undefined,
  };
}

/**
 * Convert multiple NormalizedRecipes to RecipeCard format.
 */
export function toRecipeCards(normalized: NormalizedRecipe[]) {
  return normalized.map(toRecipeCard);
}
