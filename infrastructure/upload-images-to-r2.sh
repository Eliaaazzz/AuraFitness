#!/usr/bin/env bash
#
# upload-images-to-r2.sh
# Upload recipe/workout images to Cloudflare R2 for CDN serving via cdn.aurafitness.org
#
# Prerequisites:
#   1. Install rclone: brew install rclone (macOS) or see https://rclone.org/install/
#   2. Configure rclone for Cloudflare R2 (one-time setup - see instructions below)
#   3. Set environment variables or edit this script with your bucket name
#
# Usage:
#   ./upload-images-to-r2.sh [local-images-dir]
#
# Example:
#   ./upload-images-to-r2.sh ./assets/images
#   ./upload-images-to-r2.sh                    # uses default ./static/images
#
# ============================================================================
# ONE-TIME SETUP: Configure rclone for Cloudflare R2
# ============================================================================
#
# 1. Get your Cloudflare R2 credentials:
#    - Go to Cloudflare Dashboard -> R2 -> Manage R2 API Tokens
#    - Create a new API token with "Object Read & Write" permission
#    - Note: Account ID, Access Key ID, Secret Access Key
#
# 2. Run: rclone config
#    - Choose "n" for new remote
#    - Name: r2 (or any name you prefer)
#    - Storage: Amazon S3 Compliant Storage Providers (choose number)
#    - Provider: Cloudflare R2 (or "Other" and configure manually)
#    - Access Key ID: <your R2 access key>
#    - Secret Access Key: <your R2 secret key>
#    - Endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
#    - Leave other options default
#
# 3. Test: rclone lsd r2:
#    - Should list your R2 buckets
#
# ============================================================================

set -euo pipefail

# ---------------------- Configuration ----------------------
# Remote name configured in rclone (default: r2)
RCLONE_REMOTE="${RCLONE_REMOTE:-r2}"

# R2 bucket name (create this in Cloudflare R2 dashboard)
R2_BUCKET="${R2_BUCKET:-aurafitness-cdn}"

# Local images directory (default: ./static/images or first argument)
LOCAL_IMAGES_DIR="${1:-./static/images}"

# Remote path prefix in bucket (e.g., "recipes" -> bucket/recipes/...)
# Leave empty to upload to bucket root
REMOTE_PREFIX="${REMOTE_PREFIX:-}"

# ---------------------- Colors ----------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------------------- Pre-flight checks ----------------------
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check rclone installed
    if ! command -v rclone &> /dev/null; then
        log_error "rclone is not installed."
        echo "  Install with: brew install rclone (macOS)"
        echo "  Or visit: https://rclone.org/install/"
        exit 1
    fi
    log_ok "rclone found: $(rclone version | head -1)"
    
    # Check remote configured
    if ! rclone listremotes | grep -q "^${RCLONE_REMOTE}:"; then
        log_error "rclone remote '${RCLONE_REMOTE}' not configured."
        echo "  Run: rclone config"
        echo "  And set up a remote named '${RCLONE_REMOTE}' for Cloudflare R2."
        exit 1
    fi
    log_ok "rclone remote '${RCLONE_REMOTE}' configured"
    
    # Check local directory exists
    if [[ ! -d "$LOCAL_IMAGES_DIR" ]]; then
        log_warn "Local images directory not found: $LOCAL_IMAGES_DIR"
        echo "  Creating directory structure..."
        mkdir -p "$LOCAL_IMAGES_DIR/recipes"
        mkdir -p "$LOCAL_IMAGES_DIR/workouts"
        log_info "Created: $LOCAL_IMAGES_DIR/recipes and $LOCAL_IMAGES_DIR/workouts"
        echo "  Please add your images to these directories and run again."
        exit 0
    fi
    log_ok "Local images directory: $LOCAL_IMAGES_DIR"
}

# ---------------------- Upload function ----------------------
upload_to_r2() {
    local src="$1"
    local dest="${RCLONE_REMOTE}:${R2_BUCKET}"
    
    if [[ -n "$REMOTE_PREFIX" ]]; then
        dest="${dest}/${REMOTE_PREFIX}"
    fi
    
    log_info "Uploading images to R2..."
    echo "  Source: $src"
    echo "  Destination: $dest"
    echo ""
    
    # Sync with progress, skip existing unchanged files
    rclone sync "$src" "$dest" \
        --progress \
        --transfers 8 \
        --checkers 16 \
        --contimeout 60s \
        --timeout 300s \
        --retries 3 \
        --low-level-retries 10 \
        --stats 5s \
        --stats-one-line \
        -v
    
    log_ok "Upload complete!"
}

# ---------------------- List uploaded files ----------------------
list_uploaded() {
    local dest="${RCLONE_REMOTE}:${R2_BUCKET}"
    if [[ -n "$REMOTE_PREFIX" ]]; then
        dest="${dest}/${REMOTE_PREFIX}"
    fi
    
    log_info "Listing uploaded files in R2..."
    rclone ls "$dest" | head -50
    
    local count
    count=$(rclone ls "$dest" 2>/dev/null | wc -l | tr -d ' ')
    log_ok "Total files in bucket: $count"
}

# ---------------------- Verify public access ----------------------
verify_cdn_access() {
    log_info "Verifying CDN access..."
    
    # Try to fetch a known image via CDN
    local test_url="https://cdn.aurafitness.org/recipes/chicken_01.jpg"
    local http_code
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$test_url" || echo "000")
    
    if [[ "$http_code" == "200" ]]; then
        log_ok "CDN is serving images! Test URL returned HTTP $http_code"
        echo "  $test_url"
    elif [[ "$http_code" == "404" ]]; then
        log_warn "HTTP 404 - Image not found. Make sure images are uploaded to correct path."
        echo "  Expected URL: $test_url"
        echo "  Check that 'recipes/chicken_01.jpg' exists in R2 bucket."
    else
        log_warn "HTTP $http_code - CDN may not be configured correctly."
        echo "  Check Cloudflare R2 public access or Worker route configuration."
    fi
}

# ---------------------- Main ----------------------
main() {
    echo "=============================================="
    echo "  Cloudflare R2 Image Uploader"
    echo "  Target: cdn.aurafitness.org"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    upload_to_r2 "$LOCAL_IMAGES_DIR"
    echo ""
    
    list_uploaded
    echo ""
    
    verify_cdn_access
    echo ""
    
    log_ok "Done! Images should now be available at:"
    echo "  https://cdn.aurafitness.org/<path-to-image>"
    echo ""
    echo "Example URLs:"
    echo "  https://cdn.aurafitness.org/recipes/chicken_01.jpg"
    echo "  https://cdn.aurafitness.org/workouts/workout_01.jpg"
}

main "$@"
