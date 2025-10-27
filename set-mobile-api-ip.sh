#!/usr/bin/env bash
# Detect local LAN IP and update fitness-mvp/.env API_BASE_URL
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT_DIR/fitness-mvp/.env"

detect_ip() {
  local ip
  # Common Wi-Fi interfaces on macOS
  for iface in en0 en1; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
    if [[ -n "$ip" ]]; then echo "$ip"; return 0; fi
  done
  # Fallback: parse ipconfig
  ip=$(ipconfig | awk '/inet /{print $2; exit}')
  if [[ -n "$ip" ]]; then echo "$ip"; return 0; fi
  return 1
}

IP=$(detect_ip || true)
if [[ -z "${IP:-}" ]]; then
  echo "❌ Could not detect LAN IP. Connect to Wi‑Fi and retry." >&2
  exit 1
fi

API_URL="http://$IP:8080"
echo "🔧 Detected IP: $IP"
echo "🔗 Setting API_BASE_URL=$API_URL in $ENV_FILE"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "API_BASE_URL=$API_URL" > "$ENV_FILE"
else
  if grep -q '^API_BASE_URL=' "$ENV_FILE"; then
    sed -i '' "s#^API_BASE_URL=.*#API_BASE_URL=$API_URL#" "$ENV_FILE"
  else
    echo "API_BASE_URL=$API_URL" >> "$ENV_FILE"
  fi
fi

echo "✅ Updated. Restart Expo for changes to take effect."

