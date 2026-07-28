# 👻 Phantom Fleet Manager v2.0

**Made by Phantom** — Professional Discord Bot Fleet Control Center

---

## 🚀 Quick Start

```bash
npm install
npm run setup
npm start
```

Dashboard: `http://your-vps-ip:3000`

---

## ✨ Features

| Feature | Status | Description |
|---------|--------|-------------|
| Bot Fleet Management | ✅ | Add, start, stop, restart multiple bots |
| Message Logger | ✅ | Real-time message monitoring with edit/delete tracking |
| Smart Token Replace | ✅ | Auto-detect and replace tokens without breaking code |
| Status & Activity Engine | ✅ | Intelligent status injection (detects existing code) |
| Channel Navigation | ✅ | Arrow key navigation, Enter to select |
| Send Messages | ✅ | Type and send from dashboard |
| Import/Export | ✅ | Full fleet portability |
| Multi-Fleet Switch | ✅ | Switch between complete fleet configurations |
| Auto-Update | ✅ | Update from GitHub/Google Drive without breaking config |
| Feature Templates | ✅ | Toggle per-bot features |

---

## 🎨 Message Logger Color System

| Color | Meaning |
|-------|---------|
| 🟢 Green | Normal message |
| 🟡 Yellow | **Edited** — old text shown with strikethrough |
| 🔴 Red | **Deleted** — blurred, hover to reveal |
| 🟣 Purple | Embed-only |
| 🔵 Blue | Bot message |

---

## ⌨️ Keyboard Shortcuts (Message Logger)

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate channels |
| Enter | Focus message input |
| Scroll | Load older messages |

---

## 🔧 CLI Commands

```bash
phantom-fleet update [url]     # Update from remote source
phantom-fleet config import    # Import configuration
phantom-fleet config export    # Export configuration
phantom-fleet fleet import     # Import full fleet
phantom-fleet fleet switch     # Switch active fleet
phantom-fleet export           # Export current state
phantom-fleet uninstall        # Remove all data
```

---

## 🔐 Security

- AES-256 token encryption
- Tokens never exposed in API responses
- `FLEET_SECRET` environment variable for encryption key

---

## 📝 Made by Phantom

Version 2.0.0
