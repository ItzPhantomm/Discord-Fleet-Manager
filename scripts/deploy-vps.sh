#!/bin/bash
# Phantom Fleet Manager - VPS Deployment Script
# Run as root: curl -fsSL https://raw.githubusercontent.com/phantom1785322-hub/Phantom-Fleet/main/scripts/deploy-vps.sh | bash

set -euo pipefail

REPO="phantom1785322-hub/Phantom-Fleet"
INSTALL_DIR="/opt/phantom-fleet"
DATA_DIR="/var/lib/phantom-fleet"
CONFIG_DIR="/etc/phantom-fleet"
LOG_DIR="/var/log/phantom-fleet"
SERVICE_NAME="phantom-fleet"
USER="phantom-fleet"

log() { echo -e "\033[0;34m[INFO]\033[0m $*"; }
success() { echo -e "\033[0;32m[SUCCESS]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $*"; exit 1; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Must run as root. Use: sudo bash $0"
    fi
}

install_deps() {
    log "Installing dependencies..."
    apt-get update -qq
    apt-get install -y -qq curl git nodejs npm 2>/dev/null || {
        # Install Node.js 20 if not available
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs
    }
    success "Dependencies installed"
}

create_user() {
    log "Creating service user..."
    id -u "$USER" &>/dev/null || useradd -r -s /bin/false -d "$DATA_DIR" "$USER"
    success "User created"
}

create_dirs() {
    log "Creating directories..."
    mkdir -p "$DATA_DIR" "$CONFIG_DIR" "$LOG_DIR"
    chown -R "$USER:$USER" "$DATA_DIR" "$CONFIG_DIR" "$LOG_DIR"
    success "Directories created"
}

clone_repo() {
    log "Cloning repository..."
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 "https://github.com/$REPO.git" "$INSTALL_DIR"
    chown -R "$USER:$USER" "$INSTALL_DIR"
    success "Repository cloned"
}

build_project() {
    log "Building project (this may take a minute)..."
    cd "$INSTALL_DIR"
    sudo -u "$USER" npm ci --prefer-offline --no-audit 2>&1 | tail -5
    sudo -u "$USER" npm run build 2>&1 | tail -10
    success "Build complete"
}

generate_secret() {
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
}

create_env() {
    log "Generating configuration..."
    SECRET=$(generate_secret)
    
    cat > "$CONFIG_DIR/.env" <<EOF
# Phantom Fleet Manager - Generated $(date)
PORT=3000
NODE_ENV=production
FLEET_SECRET=$SECRET
DATABASE_PATH=$DATA_DIR/fleet.db
EOF
    
    chmod 600 "$CONFIG_DIR/.env"
    chown "$USER:$USER" "$CONFIG_DIR/.env"
    
    success "Configuration created"
    warn "SAVE YOUR FLEET_SECRET: $SECRET"
}

create_service() {
    log "Creating systemd service..."
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=Phantom Fleet Manager
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DATA_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/packages/manager/dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=-$CONFIG_DIR/.env

# Security hardening
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
    success "Service created and enabled"
}

start_service() {
    log "Starting service..."
    systemctl start "$SERVICE_NAME"
    sleep 3
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        success "Service started successfully"
    else
        error "Service failed to start. Check: journalctl -u $SERVICE_NAME -f"
    fi
}

print_summary() {
    IP=$(curl -s ifconfig.me || curl -s icanhazip.com || hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "\033[0;32m╔══════════════════════════════════════════════════════════════╗\033[0m"
    echo -e "\033[0;32m║     Phantom Fleet Manager Deployed Successfully! 🎉       ║\033[0m"
    echo -e "\033[0;32m╚══════════════════════════════════════════════════════════════╝\033[0m"
    echo ""
    echo -e "\033[0;34mDashboard:\033[0m  http://$IP:3000"
    echo -e "\033[0;34mConfig:\033[0m    $CONFIG_DIR/.env"
    echo -e "\033[0;34mData:\033[0m      $DATA_DIR"
    echo -e "\033[0;34mLogs:\033[0m      $LOG_DIR"
    echo ""
    echo -e "\033[1;33mCommands:\033[0m"
    echo "  Status:  systemctl status $SERVICE_NAME"
    echo "  Logs:    journalctl -u $SERVICE_NAME -f"
    echo "  Restart: systemctl restart $SERVICE_NAME"
    echo "  CLI:     $INSTALL_DIR/packages/cli/dist/cli.js bots"
    echo ""
    echo -e "\033[1;31m⚠️  SAVE YOUR FLEET_SECRET FROM ABOVE!\033[0m"
    echo ""
}

main() {
    check_root
    install_deps
    create_user
    create_dirs
    clone_repo
    build_project
    create_env
    create_service
    start_service
    print_summary
}

main "$@"