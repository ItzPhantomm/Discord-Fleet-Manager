# Installation

Phantom Fleet Manager runs on any platform with Node.js 20+. Choose your preferred method:

## Linux (systemd) — Recommended for VPS

```bash
# One-liner (runs as root, sets up systemd service)
curl -fsSL https://raw.githubusercontent.com/phantom1785322-hub/Phantom-Fleet/main/scripts/install-linux.sh | bash

# Manual steps
git clone https://github.com/phantom1785322-hub/Phantom-Fleet
cd Phantom-Fleet
npm install
npm run setup
sudo systemctl enable --now phantom-fleet-manager
```

**Result:** Service runs at boot, logs to `journalctl -u phantom-fleet-manager -f`

## macOS (Homebrew / launchd)

```bash
# Homebrew (when published)
brew tap phantom1785322-hub/fleet && brew install phantom-fleet-manager

# Manual
git clone https://github.com/phantom1785322-hub/Phantom-Fleet
cd Phantom-Fleet
npm install
npm run setup
brew services start phantom-fleet-manager
```

## Windows (Scoop / PowerShell)

```powershell
# Scoop (when published)
scoop bucket add phantom https://github.com/phantom1785322-hub/scoop-bucket
scoop install phantom-fleet-manager

# Manual (PowerShell as Admin)
git clone https://github.com/phantom1785322-hub/Phantom-Fleet
cd Phantom-Fleet
npm install
npm run setup
# Creates Windows Service via NSSM or native
```

## Docker (Any Platform)

```bash
# Quick start
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  ghcr.io/phantom1785322-hub/phantom-fleet:latest

# Docker Compose (production)
docker compose -f docker/docker-compose.yml up -d
```

## Termux (Android)

```bash
pkg update && pkg install -y nodejs-lts git
git clone https://github.com/phantom1785322-hub/Phantom-Fleet
cd Phantom-Fleet
npm install
npm run setup
termux-wake-lock
npm start
# Dashboard at http://localhost:3000 (or your phone's IP)
```

## Kubernetes (Helm)

```bash
helm repo add phantom https://phantom1785322-hub.github.io/helm-charts
helm install fleet-manager phantom/fleet-manager \
  --set env.FLEET_SECRET=$(openssl rand -base64 32) \
  --set persistence.enabled=true
```

## Verify Installation

```bash
# Check service
phantom-fleet doctor

# Check dashboard
curl http://localhost:3000/health
# → {"status":"ok","timestamp":...,"uptime":...}

# CLI test
phantom-fleet bots
```

## Platform-Specific Notes

| Platform | Service Manager | Data Dir | Config Dir | Log Dir |
|----------|----------------|----------|------------|---------|
| Linux | systemd | `/var/lib/phantom-fleet` | `/etc/phantom-fleet` | `/var/log/phantom-fleet` |
| macOS | launchd | `~/Library/Application Support/PhantomFleet` | `~/Library/Preferences` | `~/Library/Logs/PhantomFleet` |
| Windows | Windows Service | `%PROGRAMDATA%\PhantomFleet` | `%PROGRAMDATA%\PhantomFleet` | `%LOCALAPPDATA%\PhantomFleet\Logs` |
| Termux | termux-services | `$PREFIX/var/lib/phantom-fleet` | `$PREFIX/etc/phantom-fleet` | `$PREFIX/var/log/phantom-fleet` |

The `phantom-fleet doctor` command auto-detects your platform and shows the correct paths.