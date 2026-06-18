#!/bin/bash
#
# Proxmox EPG App - Debian 13 LXC installation script
#
# Run as root inside a fresh Debian 13 LXC container:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/proxmox-epg-app/main/proxmox/install.sh -o /tmp/install.sh
#   chmod +x /tmp/install.sh
#   /tmp/install.sh
#
# For private GitHub repositories, pass a personal access token:
#   GIT_TOKEN="ghp_xxxxxxxx" /tmp/install.sh
#
# To install Node.js from Debian repositories instead of NodeSource:
#   NODE_INSTALL_METHOD=debian /tmp/install.sh

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------------
# Configuration (override via environment variables before running the script)
# ---------------------------------------------------------------------------

# Public repository URL (replace with your fork or organization repo)
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/Lavve/proxmox-epg-app.git}"

# Optional: Git branch or tag to install
GIT_BRANCH="${GIT_BRANCH:-main}"

# Optional: GitHub personal access token for private repositories
GIT_TOKEN="${GIT_TOKEN:-}"

# Application install directory (must match paths in proxmox/nginx.conf)
APP_DIR="${APP_DIR:-/var/www/proxmox-epg-app}"

# Backend listen port (Nginx proxies /api to this port)
BACKEND_PORT="${BACKEND_PORT:-3001}"

# Node.js install method: "nodesource" (default) or "debian"
NODE_INSTALL_METHOD="${NODE_INSTALL_METHOD:-nodesource}"

# NodeSource major version when NODE_INSTALL_METHOD=nodesource
NODE_MAJOR_VERSION="${NODE_MAJOR_VERSION:-22}"

# systemd unit name (installed to /etc/systemd/system/epg-backend.service)
BACKEND_SERVICE_NAME="epg-backend"

# Debian Nginx site configuration paths
NGINX_SITE_NAME="proxmox-epg-app"
NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() {
	echo "[install] $*"
}

error() {
	echo "[install] ERROR: $*" >&2
	exit 1
}

require_root() {
	if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
		error "This script must be run as root."
	fi
}

resolve_clone_url() {
	local url="$GIT_REPO_URL"

	if [[ -n "$GIT_TOKEN" ]]; then
		# Insert the token into HTTPS clone URLs for private repo access.
		url="${url/https:\/\//https:\/\/${GIT_TOKEN}@}"
	fi

	printf '%s' "$url"
}

command_exists() {
	command -v "$1" >/dev/null 2>&1
}

# ---------------------------------------------------------------------------
# Step 1: Install system dependencies
# ---------------------------------------------------------------------------

install_base_packages() {
	log "Updating Debian package index..."
	apt-get update

	log "Installing base system packages..."
	# build-essential, python3, and libsqlite3-dev are required to compile the
	# native sqlite3 Node.js module when prebuilt binaries are unavailable.
	apt-get install -y \
		ca-certificates \
		curl \
		git \
		gnupg \
		nginx \
		sqlite3 \
		build-essential \
		python3 \
		libsqlite3-dev
}

install_nodejs() {
	if command_exists node && command_exists npm; then
		log "Node.js already installed: $(node --version)"
		return 0
	fi

	case "$NODE_INSTALL_METHOD" in
		nodesource)
			log "Installing Node.js ${NODE_MAJOR_VERSION}.x from NodeSource..."
			curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR_VERSION}.x" \
				| bash -
			apt-get install -y nodejs
			;;
		debian)
			log "Installing Node.js from Debian repositories..."
			apt-get install -y nodejs npm
			;;
		*)
			error "Unsupported NODE_INSTALL_METHOD: ${NODE_INSTALL_METHOD} (use nodesource or debian)"
			;;
	esac

	if ! command_exists node; then
		error "Node.js installation failed."
	fi

	log "Node.js version: $(node --version)"
	log "npm version: $(npm --version)"
}

install_pnpm() {
	log "Installing pnpm globally via npm..."
	npm install -g pnpm

	if ! command_exists pnpm; then
		error "pnpm installation failed."
	fi

	log "pnpm version: $(pnpm --version)"
}

install_system_packages() {
	install_base_packages
	install_nodejs
	install_pnpm
}

# ---------------------------------------------------------------------------
# Step 2: Clone or update the application repository
# ---------------------------------------------------------------------------

setup_application_source() {
	local clone_url
	clone_url="$(resolve_clone_url)"

	mkdir -p "$(dirname "$APP_DIR")"

	if [[ -d "$APP_DIR/.git" ]]; then
		log "Repository already present at ${APP_DIR}, pulling latest changes..."
		git -C "$APP_DIR" fetch origin
		git -C "$APP_DIR" checkout "$GIT_BRANCH"
		git -C "$APP_DIR" pull origin "$GIT_BRANCH"
	elif [[ -d "$APP_DIR" ]]; then
		error "Directory ${APP_DIR} exists but is not a git repository."
	else
		log "Cloning repository from ${GIT_REPO_URL} (branch: ${GIT_BRANCH})..."
		git clone --branch "$GIT_BRANCH" --depth 1 "$clone_url" "$APP_DIR"
	fi

	if [[ ! -f "$APP_DIR/proxmox/nginx.conf" ]]; then
		error "Missing ${APP_DIR}/proxmox/nginx.conf after clone."
	fi
}

# ---------------------------------------------------------------------------
# Step 3: Backend setup
# ---------------------------------------------------------------------------

setup_backend() {
	local backend_dir="${APP_DIR}/backend"
	local data_dir="${backend_dir}/data"

	log "Installing backend dependencies..."
	cd "$backend_dir"
	pnpm install --frozen-lockfile

	log "Compiling backend TypeScript..."
	pnpm exec tsc

	if [[ ! -f "${backend_dir}/dist/index.js" ]]; then
		error "Backend build failed: ${backend_dir}/dist/index.js not found."
	fi

	log "Creating backend data directory..."
	mkdir -p "$data_dir"

	log "Writing backend production environment file..."
	cat > "${backend_dir}/.env" <<EOF
# Proxmox EPG App - backend production configuration
# Edit these values after installation if needed.

PORT=${BACKEND_PORT}
EPG_SOURCE_URL=https://www.open-epg.com/generate/kqsNPj3Tq5.xml.gz
USE_MOCK=false
DB_PATH=${data_dir}/epg.db
EOF

	log "Installing systemd service at /etc/systemd/system/${BACKEND_SERVICE_NAME}.service..."
	cat > "/etc/systemd/system/${BACKEND_SERVICE_NAME}.service" <<EOF
[Unit]
Description=Proxmox EPG App Node.js Backend
Documentation=https://github.com/Lavve/proxmox-epg-app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=${backend_dir}
EnvironmentFile=${backend_dir}/.env
ExecStart=/usr/bin/node ${backend_dir}/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

# ---------------------------------------------------------------------------
# Step 4: Frontend setup
# ---------------------------------------------------------------------------

setup_frontend() {
	local frontend_dir="${APP_DIR}/frontend"

	log "Installing frontend dependencies..."
	cd "$frontend_dir"
	pnpm install --frozen-lockfile

	log "Writing frontend production environment file..."
	# Empty VITE_API_BASE_URL makes the SPA call /api on the same host via Nginx.
	cat > "${frontend_dir}/.env.production" <<EOF
VITE_API_BASE_URL=
EOF

	log "Building frontend for production..."
	pnpm run build

	if [[ ! -f "${frontend_dir}/dist/index.html" ]]; then
		error "Frontend build failed: ${frontend_dir}/dist/index.html not found."
	fi
}

# ---------------------------------------------------------------------------
# Step 5: Nginx integration (Debian sites-available / sites-enabled)
# ---------------------------------------------------------------------------

setup_nginx() {
	log "Installing Nginx site configuration to ${NGINX_SITE_AVAILABLE}..."
	cp "${APP_DIR}/proxmox/nginx.conf" "$NGINX_SITE_AVAILABLE"

	log "Enabling Nginx site via symlink in /etc/nginx/sites-enabled/..."
	ln -sf "$NGINX_SITE_AVAILABLE" "$NGINX_SITE_ENABLED"

	if [[ -f /etc/nginx/sites-enabled/default ]]; then
		log "Disabling default Nginx site to avoid conflicts..."
		rm -f /etc/nginx/sites-enabled/default
	fi

	log "Validating Nginx configuration..."
	nginx -t
}

# ---------------------------------------------------------------------------
# Step 6: Enable and start services (systemd)
# ---------------------------------------------------------------------------

start_services() {
	log "Reloading systemd daemon..."
	systemctl daemon-reload

	log "Enabling backend service to start on boot..."
	systemctl enable "${BACKEND_SERVICE_NAME}.service"

	log "Enabling Nginx to start on boot..."
	systemctl enable nginx.service

	log "Starting backend service..."
	systemctl restart "${BACKEND_SERVICE_NAME}.service"

	log "Starting Nginx..."
	systemctl restart nginx.service

	log "Backend service status:"
	systemctl --no-pager --full status "${BACKEND_SERVICE_NAME}.service" || true
}

print_summary() {
	cat <<EOF

[install] Installation complete.

Application directory : ${APP_DIR}
Frontend (static)     : ${APP_DIR}/frontend/dist
Backend service       : ${BACKEND_SERVICE_NAME}.service
Backend environment   : ${APP_DIR}/backend/.env
Nginx site (available): ${NGINX_SITE_AVAILABLE}
Nginx site (enabled)  : ${NGINX_SITE_ENABLED}

Useful commands:
  systemctl status ${BACKEND_SERVICE_NAME}.service
  systemctl restart ${BACKEND_SERVICE_NAME}.service
  systemctl status nginx.service
  systemctl reload nginx.service
  curl http://127.0.0.1:${BACKEND_PORT}/health
  curl http://127.0.0.1/api/channels

EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
	require_root

	log "Starting Proxmox EPG App installation on Debian..."

	install_system_packages
	setup_application_source
	setup_backend
	setup_frontend
	setup_nginx
	start_services
	print_summary
}

main "$@"
