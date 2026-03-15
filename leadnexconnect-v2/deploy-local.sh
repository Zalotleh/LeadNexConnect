#!/usr/bin/env bash
# =============================================================================
# LeadNexConnect v2 — Local Ubuntu Deployment Script (systemd)
# =============================================================================
# Run as root:   sudo bash deploy-local.sh
# =============================================================================
set -euo pipefail

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Config ───────────────────────────────────────────────────────────────────
APP_DIR="/opt/leadnexconnect"          # where the app lives on the server
APP_USER="leadnex"                      # dedicated system user
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"  # directory this script lives in
DB_NAME="leadnexconnect"
DB_USER="leadnex_user"
DB_PASS="$(openssl rand -base64 20)"   # generated on first run; saved in .env

# ─── Root check ───────────────────────────────────────────────────────────────
[[ "$EUID" -eq 0 ]] || die "Please run as root:  sudo bash $0"

echo ""
echo "======================================================"
echo "  LeadNexConnect v2 — Local Ubuntu Deployment"
echo "======================================================"
echo ""

# ─── 1. System packages ───────────────────────────────────────────────────────
info "Updating system packages…"
apt-get update -q

# Node.js 18 via NodeSource
if ! command -v node &>/dev/null || [[ "$(node -e 'process.exit(Number(process.version.slice(1).split(\".\")[0]) < 18)')" ]]; then
  info "Installing Node.js 18…"
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >/dev/null
  apt-get install -y nodejs
fi
success "Node.js $(node -v) ready"

# PostgreSQL
if ! systemctl is-active --quiet postgresql 2>/dev/null; then
  info "Installing PostgreSQL…"
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
fi
success "PostgreSQL ready"

# Redis (used by Bull queue for email jobs)
if ! systemctl is-active --quiet redis-server 2>/dev/null; then
  info "Installing Redis…"
  apt-get install -y redis-server
  systemctl enable redis-server
  systemctl start redis-server
fi
success "Redis ready"

# Nginx (reverse proxy)
if ! command -v nginx &>/dev/null; then
  info "Installing Nginx…"
  apt-get install -y nginx
  systemctl enable nginx
fi
success "Nginx ready"

# ─── 2. System user ───────────────────────────────────────────────────────────
if ! id "$APP_USER" &>/dev/null; then
  info "Creating system user '$APP_USER'…"
  useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"
fi
success "System user '$APP_USER' ready"

# ─── 3. Copy application files ────────────────────────────────────────────────
info "Copying application to $APP_DIR…"
mkdir -p "$APP_DIR"

# Sync everything except development artefacts
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='apps/api/dist' \
  --exclude='.env' \
  --exclude='backups' \
  --exclude='.git' \
  --exclude='*.log' \
  "$SOURCE_DIR/" "$APP_DIR/"

mkdir -p "$APP_DIR/logs"
success "Application files copied"

# ─── 4. Environment file ──────────────────────────────────────────────────────
ENV_FILE="$APP_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  info "Creating .env from template…"
  cp "$SOURCE_DIR/.env.example" "$ENV_FILE"

  # Patch the generated DB password and required values
  sed -i "s|postgresql://user:password@localhost:5432/leadnexconnect|postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}|g" "$ENV_FILE"
  sed -i "s|NODE_ENV=development|NODE_ENV=production|g" "$ENV_FILE"
  sed -i "s|JWT_SECRET=your-super-secret-jwt-key-change-this-in-production|JWT_SECRET=$(openssl rand -hex 32)|g" "$ENV_FILE"
  sed -i "s|SESSION_SECRET=your-session-secret-change-this-in-production|SESSION_SECRET=$(openssl rand -hex 32)|g" "$ENV_FILE"
  sed -i "s|# REDIS_URL=redis://localhost:6379|REDIS_URL=redis://localhost:6379|g" "$ENV_FILE"

  warn "─────────────────────────────────────────────────────────"
  warn ".env created at $ENV_FILE"
  warn "You MUST edit it and fill in keys before the app works:"
  warn "  - SMTP_HOST / SMTP_USER / SMTP_PASS  (email sending)"
  warn "  - APOLLO_API_KEY / HUNTER_API_KEY    (lead generation)"
  warn "  - GOOGLE_PLACES_API_KEY              (local business scraping)"
  warn "  - FRONTEND_URL / API_BASE_URL        (adjust if using Nginx)"
  warn "─────────────────────────────────────────────────────────"
  read -r -p "Press ENTER once you have finished editing $ENV_FILE …"
fi

# Re-read DB credentials that may have been manually set in .env
DB_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
success ".env is ready"

# ─── 5. Database setup ────────────────────────────────────────────────────────
info "Setting up PostgreSQL database…"
# Create DB user (safe to re-run)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" \
  | grep -q 1 || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

# Create database (safe to re-run)
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
  | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" >/dev/null
success "Database '${DB_NAME}' and user '${DB_USER}' ready"

# ─── 6. Install dependencies ──────────────────────────────────────────────────
info "Installing npm dependencies (this may take a few minutes)…"
cd "$APP_DIR"
npm install --workspaces --include-workspace-root
success "Dependencies installed"

# ─── 7. Run database migrations ───────────────────────────────────────────────
info "Running database migrations…"
npm run db:migrate -w packages/database
success "Migrations complete"

info "Seeding initial data (admin user etc.)…"
npm run db:seed -w packages/database
success "Seed complete"

# ─── 8. Build both apps ───────────────────────────────────────────────────────
info "Building API (TypeScript → dist/)…"
npm run build:api
success "API build complete"

info "Building Next.js frontend (standalone mode)…"
npm run build:web
success "Web build complete"

# Copy public assets and node_modules required by the Next.js standalone server
info "Copying static assets into Next.js standalone bundle…"
cp -r "$APP_DIR/apps/web/public" "$APP_DIR/apps/web/.next/standalone/apps/web/public"
cp -r "$APP_DIR/apps/web/.next/static" "$APP_DIR/apps/web/.next/standalone/apps/web/.next/static"
success "Static assets copied"

# ─── 9. Fix ownership ─────────────────────────────────────────────────────────
info "Setting file ownership to '${APP_USER}'…"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
success "Ownership set"

# ─── 10. Install systemd services ─────────────────────────────────────────────
info "Installing systemd service units…"
cp "$APP_DIR/deploy/leadnex-api.service" /etc/systemd/system/
cp "$APP_DIR/deploy/leadnex-web.service" /etc/systemd/system/

systemctl daemon-reload
success "Service units installed"

# ─── 11. Enable and start services ───────────────────────────────────────────
info "Enabling services to auto-start on boot…"
systemctl enable leadnex-api leadnex-web

info "Starting services…"
systemctl restart leadnex-api
sleep 3
systemctl restart leadnex-web

# ─── 12. Configure Nginx reverse proxy ───────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/leadnexconnect"

if [[ ! -f "$NGINX_CONF" ]]; then
  info "Writing Nginx configuration…"
  cat > "$NGINX_CONF" <<'NGINX'
server {
    listen 80;
    server_name _;          # catch-all — change to your IP or hostname if needed

    # Next.js frontend
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js already rewrites /api/* to the Express API internally,
    # but keep this block to allow direct API access and health checks.
    location /api/ {
        proxy_pass         http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000/health;
    }

    # Serve Next.js static assets directly for better performance
    location /_next/static/ {
        alias /opt/leadnexconnect/apps/web/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/leadnexconnect
  rm -f /etc/nginx/sites-enabled/default   # remove placeholder site

  nginx -t && systemctl reload nginx
  success "Nginx configured and reloaded"
else
  warn "Nginx config already exists at $NGINX_CONF — skipping (run 'nginx -t && systemctl reload nginx' manually if you changed it)"
fi

# ─── 13. Status summary ───────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  Deployment Complete!"
echo "======================================================"
echo ""
systemctl is-active --quiet leadnex-api  && success "leadnex-api  is RUNNING" || warn "leadnex-api  is NOT running — check: journalctl -u leadnex-api -n 50"
systemctl is-active --quiet leadnex-web  && success "leadnex-web  is RUNNING" || warn "leadnex-web  is NOT running — check: journalctl -u leadnex-web -n 50"
systemctl is-active --quiet postgresql   && success "postgresql   is RUNNING" || warn "postgresql   is NOT running"
systemctl is-active --quiet redis-server && success "redis-server is RUNNING" || warn "redis-server is NOT running"
systemctl is-active --quiet nginx        && success "nginx        is RUNNING" || warn "nginx        is NOT running"
echo ""
info "Useful commands:"
echo "  View API logs:  journalctl -u leadnex-api  -f"
echo "  View Web logs:  journalctl -u leadnex-web  -f"
echo "  Restart API:    systemctl restart leadnex-api"
echo "  Restart Web:    systemctl restart leadnex-web"
echo "  Stop both:      systemctl stop leadnex-api leadnex-web"
echo ""
info "The app is available at:  http://$(hostname -I | awk '{print $1}')"
echo ""
