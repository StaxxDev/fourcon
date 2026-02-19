#!/usr/bin/env bash
# deploy.sh — Deploy 4con to Conway Cloud
# Requires: conway-terminal installed + funded wallet
# Usage: ./deploy.sh [domain]
set -e

DOMAIN="${1:-}"
APP_DIR="/opt/fourcon"
PORT=3000

echo "==> 4con Conway Cloud Deploy"
echo ""

# ── Step 1: Create sandbox ────────────────────────────────────────────────────
echo "[1/6] Creating Conway Cloud sandbox..."
SANDBOX_ID=$(conway sandbox create --image ubuntu-22.04 --json | jq -r '.id')
echo "      Sandbox: $SANDBOX_ID"

# ── Step 2: Install Node.js ───────────────────────────────────────────────────
echo "[2/6] Installing Node.js 20..."
conway sandbox exec "$SANDBOX_ID" -- bash -c "
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &&
  apt-get install -y nodejs &&
  node --version
"

# ── Step 3: Upload app files ──────────────────────────────────────────────────
echo "[3/6] Uploading 4con app..."
conway sandbox exec "$SANDBOX_ID" -- mkdir -p "$APP_DIR"

# Upload source files via tarball
tar czf /tmp/fourcon.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data' \
  --exclude='mcp-server/node_modules' \
  --exclude='mcp-server/dist' \
  .

conway sandbox upload "$SANDBOX_ID" /tmp/fourcon.tar.gz "$APP_DIR/fourcon.tar.gz"
conway sandbox exec "$SANDBOX_ID" -- bash -c "cd $APP_DIR && tar xzf fourcon.tar.gz && rm fourcon.tar.gz"

# ── Step 4: Install dependencies and build ────────────────────────────────────
echo "[4/6] Building 4con..."
conway sandbox exec "$SANDBOX_ID" -- bash -c "
  cd $APP_DIR &&
  npm ci &&
  npm run build
"

# ── Step 5: Start the app ─────────────────────────────────────────────────────
echo "[5/6] Starting 4con..."
conway sandbox exec "$SANDBOX_ID" -- bash -c "
  cd $APP_DIR &&
  mkdir -p data &&
  nohup npm run start > /var/log/fourcon.log 2>&1 &
  sleep 3
  curl -sf http://localhost:$PORT/ > /dev/null && echo 'App is running' || echo 'WARNING: App may not be ready yet'
"

# ── Step 6: Expose port ───────────────────────────────────────────────────────
echo "[6/6] Exposing port $PORT..."
PUBLIC_URL=$(conway sandbox expose "$SANDBOX_ID" "$PORT" --json | jq -r '.url')
echo ""
echo "==> 4con is live at: $PUBLIC_URL"

# ── Optional: Register domain ─────────────────────────────────────────────────
if [ -n "$DOMAIN" ]; then
  echo ""
  echo "[+] Registering domain: $DOMAIN"
  conway domain register "$DOMAIN" || echo "Domain may already exist, continuing..."
  echo "[+] Setting DNS for $DOMAIN → $PUBLIC_URL"
  conway domain dns set "$DOMAIN" --type CNAME --name "@" --value "$PUBLIC_URL"
  echo "==> 4con will be available at: https://$DOMAIN"
fi

echo ""
echo "Sandbox ID: $SANDBOX_ID"
echo "Logs:       conway sandbox exec $SANDBOX_ID -- tail -f /var/log/fourcon.log"
echo "Shell:      conway sandbox exec $SANDBOX_ID -- bash"
