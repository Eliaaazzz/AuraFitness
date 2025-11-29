/**
 * sync-spoonacular-to-r2.ts
 * 
 * Syncs recipe images from Spoonacular to Cloudflare R2.
 * Reads recipe IDs from seed/recipes.json and uploads images that don't exist yet.
 * 
 * Environment variables (required in /.env or exported):
 *   R2_ACCOUNT_ID        - Cloudflare R2 Account ID
 *   R2_ACCESS_KEY_ID     - Cloudflare R2 Access Key ID
 *   R2_SECRET_ACCESS_KEY - Cloudflare R2 Secret Access Key
 * 
 * Usage:
 *   npx ts-node infrastructure/sync-spoonacular-to-r2.ts
 * 
 * Or from project root:
 *   cd /path/to/project && npx ts-node infrastructure/sync-spoonacular-to-r2.ts
 */

import { S3Client, HeadObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ES module compatibility: define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Load environment variables from .env file
// ============================================================
// Try multiple possible locations for .env file
const possibleEnvPaths = [
  path.resolve(__dirname, "../.env"),           // infrastructure/../.env
  path.resolve(process.cwd(), ".env"),          // current working directory
  path.resolve(__dirname, "../../.env"),        // two levels up
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Loaded environment from: ${envPath}`);
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.warn(`⚠️  No .env file found. Tried paths:`);
  possibleEnvPaths.forEach(p => console.warn(`   - ${p}`));
  console.warn(`   Falling back to existing environment variables.\n`);
}

// ============================================================
// Validate environment variables
// ============================================================
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

// Check which variables are missing
const missingVars: string[] = [];
if (!accountId) missingVars.push("R2_ACCOUNT_ID");
if (!accessKeyId) missingVars.push("R2_ACCESS_KEY_ID");
if (!secretAccessKey) missingVars.push("R2_SECRET_ACCESS_KEY");

if (missingVars.length > 0) {
  console.error(`
❌ Missing required environment variables!

Missing variables:
${missingVars.map(v => `  - ${v}`).join("\n")}

Please ensure your .env file contains:
  R2_ACCOUNT_ID=your_account_id
  R2_ACCESS_KEY_ID=your_access_key_id
  R2_SECRET_ACCESS_KEY=your_secret_access_key

Or export them directly:
  export R2_ACCOUNT_ID="your_account_id"
  export R2_ACCESS_KEY_ID="your_access_key_id"
  export R2_SECRET_ACCESS_KEY="your_secret_access_key"
`);
  process.exit(1);
}

// Type assertion after validation
const R2_ACCOUNT_ID = accountId as string;
const R2_ACCESS_KEY_ID = accessKeyId as string;
const R2_SECRET_ACCESS_KEY = secretAccessKey as string;

// ============================================================
// Configuration (safe to commit - no secrets here)
// ============================================================
const R2_BUCKET = "aurafitness-public";
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Image settings
const SPOONACULAR_IMAGE_SIZE = "312x231"; // or "240x150", "556x370", etc.
const IMAGE_EXTENSION = "jpg";

// ============================================================
// Initialize S3 Client for R2
// ============================================================
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ============================================================
// Types
// ============================================================
interface Recipe {
  id?: number;
  spoonacularId?: number;
  name?: string;
  title?: string;
  imageUrl?: string;
  image?: string;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if an object exists in R2
 */
async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Download image from URL and return as Buffer
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  ⚠️  Failed to download: ${url} (${response.status})`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn(`  ⚠️  Error downloading ${url}:`, error);
    return null;
  }
}

/**
 * Upload image buffer to R2
 */
async function uploadToR2(key: string, buffer: Buffer, contentType: string = "image/jpeg"): Promise<boolean> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to upload ${key}:`, error);
    return false;
  }
}

/**
 * Extract Spoonacular recipe ID from various URL formats
 */
function extractSpoonacularId(imageUrl: string): number | null {
  // Format: https://img.spoonacular.com/recipes/12345-312x231.jpg
  const match = imageUrl.match(/recipes\/(\d+)-/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Generate Spoonacular image URL from recipe ID
 */
function getSpoonacularImageUrl(recipeId: number): string {
  return `https://img.spoonacular.com/recipes/${recipeId}-${SPOONACULAR_IMAGE_SIZE}.${IMAGE_EXTENSION}`;
}

/**
 * Generate R2 key for a recipe image
 */
function getR2Key(recipeId: number): string {
  return `recipes/${recipeId}.${IMAGE_EXTENSION}`;
}

/**
 * Load recipes from seed file
 */
function loadRecipesFromSeed(): Recipe[] {
  // Try multiple possible seed file locations
  const possiblePaths = [
    path.join(__dirname, "../backend/src/main/resources/seed/recipes.json"),
    path.join(__dirname, "../src/main/resources/seed/recipes.json"),
    path.join(process.cwd(), "backend/src/main/resources/seed/recipes.json"),
    path.join(process.cwd(), "src/main/resources/seed/recipes.json"),
  ];
  
  for (const seedPath of possiblePaths) {
    if (fs.existsSync(seedPath)) {
      console.log(`   Loading from: ${seedPath}`);
      const content = fs.readFileSync(seedPath, "utf-8");
      const data = JSON.parse(content);
      
      // Handle both { recipes: [...] } and [...] formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.recipes && Array.isArray(data.recipes)) {
        return data.recipes;
      } else {
        throw new Error(`Invalid recipes.json format: expected array or { recipes: [...] }`);
      }
    }
  }
  
  throw new Error(`Seed file not found. Tried:\n${possiblePaths.map(p => `  - ${p}`).join("\n")}`);
}

/**
 * Extract unique Spoonacular IDs from recipes
 */
function extractRecipeIds(recipes: Recipe[]): number[] {
  const ids = new Set<number>();
  
  for (const recipe of recipes) {
    // Try to get ID from various fields
    if (recipe.spoonacularId) {
      ids.add(recipe.spoonacularId);
    } else if (recipe.id && recipe.id > 1000) {
      // Spoonacular IDs are typically large numbers
      ids.add(recipe.id);
    }
    
    // Try to extract from imageUrl
    const imageUrl = recipe.imageUrl || recipe.image;
    if (imageUrl) {
      const extractedId = extractSpoonacularId(imageUrl);
      if (extractedId) {
        ids.add(extractedId);
      }
    }
  }
  
  return Array.from(ids).sort((a, b) => a - b);
}

// ============================================================
// Main Sync Function
// ============================================================
async function syncRecipeImages() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Spoonacular → Cloudflare R2 Image Sync             ║
╠════════════════════════════════════════════════════════════╣
║  Endpoint: ${R2_ENDPOINT.substring(0, 45)}...  ║
║  Bucket:   ${R2_BUCKET.padEnd(45)}  ║
╚════════════════════════════════════════════════════════════╝
`);

  // Load recipes from seed
  console.log("📂 Loading recipes from seed file...");
  let recipes: Recipe[];
  try {
    recipes = loadRecipesFromSeed();
    console.log(`   Found ${recipes.length} recipes in seed file`);
  } catch (error) {
    console.error("❌ Failed to load recipes:", error);
    process.exit(1);
  }

  // Extract Spoonacular IDs
  const recipeIds = extractRecipeIds(recipes);
  console.log(`   Extracted ${recipeIds.length} unique Spoonacular recipe IDs\n`);

  if (recipeIds.length === 0) {
    console.log("⚠️  No Spoonacular recipe IDs found in seed file.");
    console.log("   Make sure recipes have 'spoonacularId' or valid 'imageUrl' fields.");
    process.exit(0);
  }

  // Process each recipe
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  console.log("🔄 Syncing images...\n");

  for (const recipeId of recipeIds) {
    const key = getR2Key(recipeId);
    const spoonUrl = getSpoonacularImageUrl(recipeId);

    process.stdout.write(`  [${recipeId}] `);

    // Check if already exists
    if (await objectExists(key)) {
      console.log("✓ Already exists, skipping");
      skipped++;
      continue;
    }

    // Download from Spoonacular
    const buffer = await downloadImage(spoonUrl);
    if (!buffer) {
      console.log("✗ Download failed");
      failed++;
      continue;
    }

    // Upload to R2
    const success = await uploadToR2(key, buffer);
    if (success) {
      console.log(`✓ Uploaded (${(buffer.length / 1024).toFixed(1)} KB)`);
      uploaded++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Summary
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                      Sync Complete                         ║
╠════════════════════════════════════════════════════════════╣
║  ✓ Uploaded: ${String(uploaded).padEnd(43)}  ║
║  ○ Skipped:  ${String(skipped).padEnd(43)}  ║
║  ✗ Failed:   ${String(failed).padEnd(43)}  ║
╚════════════════════════════════════════════════════════════╝

📍 Images are now available at:
   https://cdn.aurafitness.org/recipes/{id}.jpg

   (Make sure R2 bucket is connected to cdn.aurafitness.org domain)
`);
}

// ============================================================
// List existing images in R2 (utility function)
// ============================================================
async function listR2Images() {
  console.log(`\n📋 Listing images in R2 bucket: ${R2_BUCKET}\n`);

  try {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: "recipes/",
        MaxKeys: 100,
      })
    );

    if (!response.Contents || response.Contents.length === 0) {
      console.log("   (No images found)");
      return;
    }

    for (const obj of response.Contents) {
      const size = obj.Size ? `${(obj.Size / 1024).toFixed(1)} KB` : "unknown";
      console.log(`   ${obj.Key} (${size})`);
    }

    console.log(`\n   Total: ${response.Contents.length} images`);
    if (response.IsTruncated) {
      console.log("   (more images exist, showing first 100)");
    }
  } catch (error) {
    console.error("❌ Failed to list images:", error);
  }
}

// ============================================================
// CLI Entry Point
// ============================================================
const args = process.argv.slice(2);

if (args.includes("--list")) {
  listR2Images();
} else if (args.includes("--help")) {
  console.log(`
Usage: npx ts-node sync-spoonacular-to-r2.ts [options]

Options:
  --list    List existing images in R2 bucket
  --help    Show this help message

Environment Variables:
  R2_ACCESS_KEY_ID      Cloudflare R2 Access Key ID (required)
  R2_SECRET_ACCESS_KEY  Cloudflare R2 Secret Access Key (required)

Examples:
  # Sync images
  R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=yyy npx ts-node sync-spoonacular-to-r2.ts

  # List existing images
  R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=yyy npx ts-node sync-spoonacular-to-r2.ts --list
`);
} else {
  syncRecipeImages();
}
