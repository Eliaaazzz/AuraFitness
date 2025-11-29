#!/usr/bin/env bash
#
# download-sample-images.sh
# Download sample food images from Unsplash for recipe placeholders
# These can be uploaded to R2 via upload-images-to-r2.sh
#
# Usage:
#   ./download-sample-images.sh [output-dir]
#
# Example:
#   ./download-sample-images.sh ./static/images
#

set -euo pipefail

OUTPUT_DIR="${1:-./static/images}"

echo "Creating directory structure..."
mkdir -p "$OUTPUT_DIR/recipes"
mkdir -p "$OUTPUT_DIR/workouts"

echo "Downloading sample recipe images..."

# Chicken images (10)
declare -a CHICKEN_URLS=(
    "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1632634735548-24fbb85c3989?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80"
)

for i in "${!CHICKEN_URLS[@]}"; do
    idx=$((i + 1))
    fname=$(printf "chicken_%02d.jpg" "$idx")
    echo "  Downloading $fname..."
    curl -sL -o "$OUTPUT_DIR/recipes/$fname" "${CHICKEN_URLS[$i]}"
done

# Pasta images (10)
declare -a PASTA_URLS=(
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1622973536968-3ead9e780960?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=800&auto=format&fit=crop&q=80"
)

for i in "${!PASTA_URLS[@]}"; do
    idx=$((i + 1))
    fname=$(printf "pasta_%02d.jpg" "$idx")
    echo "  Downloading $fname..."
    curl -sL -o "$OUTPUT_DIR/recipes/$fname" "${PASTA_URLS[$i]}"
done

# Eggs images (10)
declare -a EGGS_URLS=(
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1582169505937-b9992bd01ed9?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1594497335722-5bd9a6c9f5d2?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&auto=format&fit=crop&q=80"
)

for i in "${!EGGS_URLS[@]}"; do
    idx=$((i + 1))
    fname=$(printf "eggs_%02d.jpg" "$idx")
    echo "  Downloading $fname..."
    curl -sL -o "$OUTPUT_DIR/recipes/$fname" "${EGGS_URLS[$i]}"
done

# Salmon images (10)
declare -a SALMON_URLS=(
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1580959375944-064e72a8fc34?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1611171711791-b34fa42e9fc3?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&auto=format&fit=crop&q=80"
)

for i in "${!SALMON_URLS[@]}"; do
    idx=$((i + 1))
    fname=$(printf "salmon_%02d.jpg" "$idx")
    echo "  Downloading $fname..."
    curl -sL -o "$OUTPUT_DIR/recipes/$fname" "${SALMON_URLS[$i]}"
done

# Beef images (10)
declare -a BEEF_URLS=(
    "https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1588347818036-558601350947?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=800&auto=format&fit=crop&q=80"
)

for i in "${!BEEF_URLS[@]}"; do
    idx=$((i + 1))
    fname=$(printf "beef_%02d.jpg" "$idx")
    echo "  Downloading $fname..."
    curl -sL -o "$OUTPUT_DIR/recipes/$fname" "${BEEF_URLS[$i]}"
done

# Salad images (10)
declare -a SALAD_URLS=(
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1604497181015-76590d828b75?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=800&auto=format&fit=crop&q=80"
    "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800&auto=format&fit=crop&q=80"
)

for i in "${!SALAD_URLS[@]}"; do
    idx=$((i + 1))
    fname=$(printf "salad_%02d.jpg" "$idx")
    echo "  Downloading $fname..."
    curl -sL -o "$OUTPUT_DIR/recipes/$fname" "${SALAD_URLS[$i]}"
done

echo ""
echo "Done! Downloaded $(find "$OUTPUT_DIR/recipes" -type f -name '*.jpg' | wc -l | tr -d ' ') recipe images."
echo "Images saved to: $OUTPUT_DIR/recipes/"
echo ""
echo "Next steps:"
echo "  1. Configure rclone for Cloudflare R2 (see upload-images-to-r2.sh for instructions)"
echo "  2. Run: ./infrastructure/upload-images-to-r2.sh $OUTPUT_DIR"
