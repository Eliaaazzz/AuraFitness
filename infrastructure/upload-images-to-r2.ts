/**
 * upload-images-to-r2.ts
 * 
 * Uploads recipe images to Cloudflare R2.
 * Reads recipe image paths from seed/recipes.json and uploads corresponding images.
 * 
 * Environment variables (required in /.env):
 *   R2_ACCOUNT_ID        - Cloudflare R2 Account ID
 *   R2_ACCESS_KEY_ID     - Cloudflare R2 Access Key ID
 *   R2_SECRET_ACCESS_KEY - Cloudflare R2 Secret Access Key
 * 
 * Usage:
 *   # First download sample images
 *   ./download-sample-images.sh ./static/images
 *   
 *   # Then upload to R2
 *   npm run upload-images
 *   
 *   # Or specify a custom source directory
 *   npm run upload-images -- --source ./my-images
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
const possibleEnvPaths = [
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
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
  console.warn(`⚠️  No .env file found. Using existing environment variables.\n`);
}

// ============================================================
// Validate environment variables
// ============================================================
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const missingVars: string[] = [];
if (!accountId) missingVars.push("R2_ACCOUNT_ID");
if (!accessKeyId) missingVars.push("R2_ACCESS_KEY_ID");
if (!secretAccessKey) missingVars.push("R2_SECRET_ACCESS_KEY");

if (missingVars.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missingVars.join(", ")}\n`);
  process.exit(1);
}

// ============================================================
// Configuration
// ============================================================
const R2_BUCKET = "aurafitness-public";
const R2_ENDPOINT = `https://${accountId}.r2.cloudflarestorage.com`;
const CDN_DOMAIN = "cdn.aurafitness.org";

// ============================================================
// Initialize S3 Client for R2
// ============================================================
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  },
});

// ============================================================
// Types
// ============================================================
interface Recipe {
  title?: string;
  imageUrl?: string;
  image?: string;
}

interface ImageToUpload {
  localPath: string;
  r2Key: string;
  exists: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(localPath: string, r2Key: string): Promise<boolean> {
  try {
    const buffer = fs.readFileSync(localPath);
    const contentType = localPath.endsWith(".png") ? "image/png" : "image/jpeg";
    
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to upload ${r2Key}:`, error);
    return false;
  }
}

function loadRecipesFromSeed(): Recipe[] {
  const possiblePaths = [
    path.join(__dirname, "../backend/src/main/resources/seed/recipes.json"),
    path.join(process.cwd(), "backend/src/main/resources/seed/recipes.json"),
  ];
  
  for (const seedPath of possiblePaths) {
    if (fs.existsSync(seedPath)) {
      console.log(`   Loading from: ${seedPath}`);
      const content = fs.readFileSync(seedPath, "utf-8");
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : (data.recipes || []);
    }
  }
  
  throw new Error(`Seed file not found`);
}

/**
 * Extract image filename from CDN URL
 * e.g., "https://cdn.aurafitness.org/recipes/chicken_01.jpg" -> "recipes/chicken_01.jpg"
 */
function extractR2KeyFromUrl(imageUrl: string): string | null {
  const match = imageUrl.match(/cdn\.aurafitness\.org\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Find local image file for a given R2 key
 */
function findLocalImage(r2Key: string, sourceDir: string): string | null {
  // Try exact path
  const exactPath = path.join(sourceDir, r2Key);
  if (fs.existsSync(exactPath)) return exactPath;
  
  // Try just the filename
  const filename = path.basename(r2Key);
  const byFilename = path.join(sourceDir, filename);
  if (fs.existsSync(byFilename)) return byFilename;
  
  // Try in subdirectories
  const subDir = path.dirname(r2Key);
  const inSubDir = path.join(sourceDir, subDir, filename);
  if (fs.existsSync(inSubDir)) return inSubDir;
  
  return null;
}

// ============================================================
// Main Functions
// ============================================================

async function uploadImagesFromDirectory(sourceDir: string) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║            Upload Images to Cloudflare R2                  ║
╠════════════════════════════════════════════════════════════╣
║  Source:   ${sourceDir.substring(0, 45).padEnd(45)}  ║
║  Bucket:   ${R2_BUCKET.padEnd(45)}  ║
║  CDN:      https://${CDN_DOMAIN.padEnd(37)}  ║
╚════════════════════════════════════════════════════════════╝
`);

  // Load recipes and find images to upload
  console.log("📂 Loading recipes from seed file...");
  const recipes = loadRecipesFromSeed();
  console.log(`   Found ${recipes.length} recipes\n`);

  // Collect unique R2 keys from recipes
  const r2Keys = new Set<string>();
  for (const recipe of recipes) {
    const imageUrl = recipe.imageUrl || recipe.image;
    if (imageUrl) {
      const key = extractR2KeyFromUrl(imageUrl);
      if (key) r2Keys.add(key);
    }
  }

  console.log(`🔍 Found ${r2Keys.size} unique images to upload\n`);

  // Check what images exist locally and in R2
  const images: ImageToUpload[] = [];
  for (const r2Key of r2Keys) {
    const localPath = findLocalImage(r2Key, sourceDir);
    if (localPath) {
      images.push({ localPath, r2Key, exists: false });
    }
  }

  if (images.length === 0) {
    console.log(`⚠️  No local images found in ${sourceDir}`);
    console.log(`\n   Expected structure:`);
    console.log(`   ${sourceDir}/`);
    console.log(`   └── recipes/`);
    console.log(`       ├── chicken_01.jpg`);
    console.log(`       ├── chicken_02.jpg`);
    console.log(`       └── ...`);
    console.log(`\n   Run this first to download sample images:`);
    console.log(`   ./infrastructure/download-sample-images.sh ${sourceDir}`);
    return;
  }

  console.log(`📤 Uploading ${images.length} images...\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const img of images) {
    process.stdout.write(`  ${img.r2Key} `);

    // Check if already exists in R2
    if (await objectExists(img.r2Key)) {
      console.log("✓ Already exists");
      skipped++;
      continue;
    }

    // Upload
    const success = await uploadFile(img.localPath, img.r2Key);
    if (success) {
      const size = fs.statSync(img.localPath).size;
      console.log(`✓ Uploaded (${(size / 1024).toFixed(1)} KB)`);
      uploaded++;
    } else {
      failed++;
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Upload Complete                         ║
╠════════════════════════════════════════════════════════════╣
║  ✓ Uploaded: ${String(uploaded).padEnd(43)}  ║
║  ○ Skipped:  ${String(skipped).padEnd(43)}  ║
║  ✗ Failed:   ${String(failed).padEnd(43)}  ║
╚════════════════════════════════════════════════════════════╝

📍 Images available at:
   https://${CDN_DOMAIN}/recipes/{filename}.jpg
`);
}

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
  } catch (error) {
    console.error("❌ Failed to list images:", error);
  }
}

// ============================================================
// CLI
// ============================================================
const args = process.argv.slice(2);

if (args.includes("--list")) {
  listR2Images();
} else if (args.includes("--help")) {
  console.log(`
Usage: npm run upload-images [options]

Options:
  --source <dir>  Source directory for images (default: ./static/images)
  --list          List existing images in R2
  --help          Show this help

Steps:
  1. Download sample images:
     ./infrastructure/download-sample-images.sh ./static/images

  2. Upload to R2:
     npm run upload-images -- --source ./static/images
`);
} else {
  const sourceIdx = args.indexOf("--source");
  const sourceDir = sourceIdx >= 0 ? args[sourceIdx + 1] : path.join(process.cwd(), "static/images");
  uploadImagesFromDirectory(sourceDir);
}
