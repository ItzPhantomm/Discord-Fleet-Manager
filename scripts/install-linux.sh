#!/bin/bash
# Phantom Fleet Manager - Linux Installation Script
# Supports: Ubuntu/Debian, Arch, Fedora, Alpine, generic Linux

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="phantom1785322-hub/Discord-Fleet-Manager"
INSTALL_DIR="/usr/local/bin"
DATA_DIR="/var/lib/discord-fleet-manager"
CONFIG_DIR="/etc/discord-fleet-manager"
LOG_DIR="/var/log/discord-fleet-manager"
SERVICE_NAME="phantom-fleet-manager"
BINARY_NAME="phantom-fleet-manager"

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        DISTRO="unknown"
    fi
    log_info "Detected distribution: $DISTRO $VERSION"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    case $DISTRO in
        ubuntu|debian)
            apt-get update
            apt-get install -y nodejs npm git curl
            ;;
        arch|manjaro)
            pacman -Sy --noconfirm nodejs npm git curl
            ;;
        fedora|centos|rhel)
            dnf install -y nodejs npm git curl
            ;;
        alpine)
            apk add --no-cache nodejs npm git curl
            ;;
        *)
            log_warn "Unknown distribution. Please install Node.js 20+, npm, git, and curl manually."
            ;;
    esac
    
    # Verify Node.js version
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [[ $NODE_VERSION -lt 20 ]]; then
        log_error "Node.js 20+ required. Current: $(node --version)"
        exit 1
    fi
    
    log_success "Dependencies installed"
}

# Create directories
create_directories() {
    log_info "Creating directories..."
    mkdir -p "$DATA_DIR" "$CONFIG_DIR" "$LOG_DIR"
    chown -R "$SUDO_USER:$SUDO_USER" "$DATA_DIR" "$CONFIG_DIR" "$LOG_DIR" 2>/dev/null || true
    log_success "Directories created"
}

# Clone repository
clone_repo() {
    log_info "Cloning repository..."
    local temp_dir="/tmp/discord-fleet-manager-install"
    rm -rf "$temp_dir"
    git clone --depth 1 "https://github.com/$REPO.git" "$temp_dir"
    cd "$temp_dir"
    log_success "Repository cloned"
}

# Build project
build_project() {
    log_info "Building project..."
    npm ci
    npm run build
    log_success "Build complete"
}

# Install binary
install_binary() {
    log_info "Installing binary..."
    cp -r packages/manager/dist "$INSTALL_DIR/$BINARY_NAME"
    cp -r packages/cli/dist "$INSTALL_DIR/phantom-fleet"
    chmod +x "$INSTALL_DIR/$BINARY_NAME" "$INSTALL_DIR/phantom-fleet"
    log_success "Binary installed to $INSTALL_DIR"
}

# Generate FLEET_SECRET
generate_secret() {
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
}

# Create environment file
create_env_file() {
    log_info "Creating environment configuration..."
    local secret=$(generate_secret)
    
    cat > "$CONFIG_DIR/.env" <<EOF
# Phantom Fleet Manager Configuration
# Generated on $(date)

# Server
PORT=3000
NODE_ENV=production

# Security - KEEP THIS SECRET!
FLEET_SECRET=$secret

# Database
DATABASE_PATH=$DATA_DIR/fleet.db

# Optional: Redis for clustering
# REDIS_URL=redis://localhost:6379

# Optional: API Key for SDK access
# API_KEY=your-api-key-here
EOF
    
    chmod 600 "$CONFIG_DIR/.env"
    chown "$SUDO_USER:$SUDO_USER" "$CONFIG_DIR/.env" 2>/dev/null || true
    
    log_success "Environment file created at $CONFIG_DIR/.env"
    log_warn "IMPORTANT: Save your FLEET_SECRET: $secret"
}

# Install systemd service
install_systemd_service() {
    log_info "Installing systemd service..."
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=Phantom Fleet Manager
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$DATA_DIR
ExecStart=$INSTALL_DIR/$BINARY_NAME
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=-$CONFIG_DIR/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR $LOG_DIR $CONFIG_DIR

# Logging
StandardOutput=append:$LOG_DIR/out.log
StandardError=append:$LOG_DIR/err.log

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    log_success "Systemd service installed and enabled"
}

# Print post-install instructions
print_instructions() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Phantom Fleet Manager Installed! 🎉              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Start the service:"
    echo -e "     ${YELLOW}sudo systemctl start $SERVICE_NAME${NC}"
    echo ""
    echo "  2. Check status:"
    echo -e "     ${YELLOW}sudo systemctl status $SERVICE_NAME${NC}"
    echo ""
    echo "  3. View logs:"
    echo -e "     ${YELLOW}sudo journalctl -u $SERVICE_NAME -f${NC}"
    echo ""
    echo "  4. Open dashboard:"
    echo -e "     ${YELLOW}http://localhost:3000${NC}"
    echo ""
    echo -e "${BLUE}CLI Usage:${NC}"
    echo "  phantom-fleet bots"
    echo "  phantom-fleet bot:add -n MyBot -t <token>"
    echo "  phantom-fleet intel:health"
    echo ""
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Config: $CONFIG_DIR/.env"
    echo "  Data:   $DATA_DIR"
    echo "  Logs:   $LOG_DIR"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT: Save your FLEET_SECRET from $CONFIG_DIR/.env${NC}"
    echo -e "${RED}   Losing it will make all encrypted tokens unrecoverable!${NC}"
}

# Main
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║      Phantom Fleet Manager - Linux Installer               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_root
    detect_distro
    install_dependencies
    create_directories
    clone_repo
    build_project
    install_binary
    create_env_file
    install_systemd_service
    print_instructions
}

main "$@"