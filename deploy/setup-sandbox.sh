#!/bin/bash
# Galedge Code Editor Sandbox Setup
# Run this script as root on a fresh server to set up the sandboxed code editor.
# Usage: bash deploy/setup-sandbox.sh

set -e

echo "=== Setting up Galedge Code Editor Sandbox ==="

# ── 1. Create restricted user ──────────────────────────────────────────
echo "[1/8] Creating galedge-coder user..."
useradd -m -s /bin/bash galedge-coder 2>/dev/null || echo "User already exists"
chmod 700 /root
chmod 700 /opt/galedge/backend 2>/dev/null || true
chmod 700 /opt/galedge/frontend 2>/dev/null || true

# ── 2. Create restricted bin with safe commands only ───────────────────
echo "[2/8] Setting up restricted PATH..."
mkdir -p /home/galedge-coder/bin

# Safe system commands (symlinks)
for cmd in uname sed awk grep groups id whoami basename dirname tee file stat wc seq tr cut sort uniq find xargs clear mkdir touch head tail; do
    if [ -f "/usr/bin/$cmd" ]; then
        ln -sf "/usr/bin/$cmd" /home/galedge-coder/bin/$cmd
    elif [ -f "/bin/$cmd" ]; then
        ln -sf "/bin/$cmd" /home/galedge-coder/bin/$cmd
    fi
done
ln -sf /usr/bin/bash /home/galedge-coder/bin/bash
ln -sf /usr/bin/sh /home/galedge-coder/bin/sh
ln -sf /usr/bin/realpath /home/galedge-coder/bin/realpath

# Python wrapper (uses venv)
cat > /home/galedge-coder/bin/python << 'SCRIPT'
#!/bin/bash
exec /opt/galedge/.venv/bin/python3 "$@"
SCRIPT
chmod +x /home/galedge-coder/bin/python
ln -sf /home/galedge-coder/bin/python /home/galedge-coder/bin/python3

# Safe ls (workspace only)
cat > /home/galedge-coder/bin/ls << 'SCRIPT'
#!/bin/bash
target="${1:-.}"
resolved="$(/usr/bin/realpath "$target" 2>/dev/null || echo "$target")"
case "$resolved" in
    /home/galedge-coder*) /usr/bin/ls "$@" ;;
    *) echo "Access denied: you can only browse ~/workspace" ;;
esac
SCRIPT

# Safe cat (workspace only)
cat > /home/galedge-coder/bin/cat << 'SCRIPT'
#!/bin/bash
if [ $# -eq 0 ]; then /usr/bin/cat; exit; fi
for f in "$@"; do
    case "$f" in -*) continue ;; esac
    resolved="$(/usr/bin/realpath "$f" 2>/dev/null || echo "$f")"
    case "$resolved" in
        /home/galedge-coder*) /usr/bin/cat "$f" ;;
        *) echo "Access denied: $f" ;;
    esac
done
SCRIPT

# Safe rm (workspace only, not shared)
cat > /home/galedge-coder/bin/rm << 'SCRIPT'
#!/bin/bash
for f in "$@"; do
    case "$f" in -*) continue ;; esac
    resolved="$(/usr/bin/realpath "$f" 2>/dev/null || echo "$f")"
    case "$resolved" in
        /home/galedge-coder/users/*|/home/galedge-coder/workspace/*) ;;
        *) echo "Access denied: can only delete in your workspace"; exit 1 ;;
    esac
done
/usr/bin/rm "$@"
SCRIPT

# Safe cp (workspace only)
cat > /home/galedge-coder/bin/cp << 'SCRIPT'
#!/bin/bash
for f in "$@"; do
    case "$f" in -*) continue ;; esac
    resolved="$(/usr/bin/realpath "$f" 2>/dev/null || echo "$f")"
    case "$resolved" in
        /home/galedge-coder*) ;;
        *) echo "Access denied: can only copy within workspace"; exit 1 ;;
    esac
done
/usr/bin/cp "$@"
SCRIPT

# Safe mv (workspace only)
cat > /home/galedge-coder/bin/mv << 'SCRIPT'
#!/bin/bash
for f in "$@"; do
    case "$f" in -*) continue ;; esac
    resolved="$(/usr/bin/realpath "$f" 2>/dev/null || echo "$f")"
    case "$resolved" in
        /home/galedge-coder*) ;;
        *) echo "Access denied: can only move within workspace"; exit 1 ;;
    esac
done
/usr/bin/mv "$@"
SCRIPT

# Safe rmdir
cat > /home/galedge-coder/bin/rmdir << 'SCRIPT'
#!/bin/bash
for f in "$@"; do
    case "$f" in -*) continue ;; esac
    resolved="$(/usr/bin/realpath "$f" 2>/dev/null || echo "$f")"
    case "$resolved" in
        /home/galedge-coder/users/*|/home/galedge-coder/workspace/*) ;;
        *) echo "Access denied"; exit 1 ;;
    esac
done
/usr/bin/rmdir "$@"
SCRIPT

chmod +x /home/galedge-coder/bin/*
chown -R galedge-coder:galedge-coder /home/galedge-coder/bin/

# ── 3. Create shared read-only files ──────────────────────────────────
echo "[3/8] Setting up shared workspace files..."
mkdir -p /home/galedge-coder/shared/examples

# Copy SDK and examples
cp /opt/galedge/deploy/sandbox-files/galedge.py /home/galedge-coder/shared/ 2>/dev/null || echo "galedge.py not found in deploy/sandbox-files/"
cp /opt/galedge/deploy/sandbox-files/README.md /home/galedge-coder/shared/ 2>/dev/null || echo "README.md not found"
cp /opt/galedge/deploy/sandbox-files/examples/*.py /home/galedge-coder/shared/examples/ 2>/dev/null || echo "examples not found"

# Make read-only
chown -R root:root /home/galedge-coder/shared
chmod -R 555 /home/galedge-coder/shared

# ── 4. Create users base directory ────────────────────────────────────
echo "[4/8] Creating users directory..."
mkdir -p /home/galedge-coder/users
chown galedge-coder:galedge-coder /home/galedge-coder/users
chmod 711 /home/galedge-coder/users

# ── 5. Create readonly DB copy + cron ─────────────────────────────────
echo "[5/8] Setting up readonly database copy..."
cp /opt/galedge/backend/galedge_alpha.db /home/galedge-coder/galedge_readonly.db 2>/dev/null || touch /home/galedge-coder/galedge_readonly.db
chmod 444 /home/galedge-coder/galedge_readonly.db

# Hourly DB sync cron
echo '0 * * * * root cp /opt/galedge/backend/galedge_alpha.db /home/galedge-coder/galedge_readonly.db 2>/dev/null && chmod 444 /home/galedge-coder/galedge_readonly.db' > /etc/cron.d/galedge-db-sync

# ── 6. Set up .bashrc with workspace restrictions ─────────────────────
echo "[6/8] Configuring restricted shell..."
cat > /home/galedge-coder/.bashrc << 'BASHRC'
export PATH=/home/galedge-coder/bin
export HOME=/home/galedge-coder

# Use current directory as workspace (code-server sets this via ?folder=)
_MY_WORKSPACE="${GALEDGE_WORKSPACE:-$PWD}"
case "$_MY_WORKSPACE" in
    /home/galedge-coder/users/*) ;;
    *) _MY_WORKSPACE="/home/galedge-coder/workspace" ; builtin cd "$_MY_WORKSPACE" ;;
esac
export PYTHONPATH="$_MY_WORKSPACE"
builtin cd "$_MY_WORKSPACE"

# Snap back if user escapes
PROMPT_COMMAND='case "$PWD" in $_MY_WORKSPACE*) ;; *) builtin cd "$_MY_WORKSPACE" ;; esac'

cd() {
    local target="${1:-$_MY_WORKSPACE}"
    local resolved="$(realpath "$target" 2>/dev/null || echo "$target")"
    case "$resolved" in
        $_MY_WORKSPACE*) builtin cd "$target" ;;
        *) echo "Access denied: restricted to your workspace" ;;
    esac
}

alias python="python3"
alias pip="echo pip-install-is-disabled"
alias sudo="echo disabled"
alias su="echo disabled"

echo "Galedge Sandbox — Type: python galedge.py to get started"
BASHRC

cp /home/galedge-coder/.bashrc /home/galedge-coder/.bash_profile
cp /home/galedge-coder/.bashrc /home/galedge-coder/.profile
chown galedge-coder:galedge-coder /home/galedge-coder/.bashrc /home/galedge-coder/.bash_profile /home/galedge-coder/.profile

# ── 7. Python-level security (sitecustomize.py) ──────────────────────
echo "[7/8] Installing Python security restrictions..."
cat > /usr/lib/python3.12/sitecustomize.py << 'PYRC'
"""Galedge Sandbox — block dangerous functions while keeping libraries working."""
import os as _os

# Block dangerous os functions
_dangerous_os = ["system", "exec", "execl", "execle", "execlp", "execlpe", "execv", "execve", "execvp", "execvpe", "popen", "spawnl", "spawnle", "spawnlp", "spawnlpe", "spawnv", "spawnve", "spawnvp", "spawnvpe", "fork", "forkpty", "kill", "killpg", "setuid", "setgid", "chroot"]

def _blocked(name):
    def _f(*a, **kw):
        raise PermissionError(f"os.{name}() is blocked in Galedge sandbox.")
    return _f

for _fn in _dangerous_os:
    if hasattr(_os, _fn):
        setattr(_os, _fn, _blocked(_fn))

# Block subprocess execution functions
import subprocess as _sp
def _blocked_sp(name):
    def _f(*a, **kw):
        raise PermissionError(f"subprocess.{name}() is blocked in Galedge sandbox.")
    return _f

for _fn in ["run", "call", "check_call", "check_output", "Popen", "getoutput", "getstatusoutput"]:
    if hasattr(_sp, _fn):
        setattr(_sp, _fn, _blocked_sp(_fn))
PYRC

# ── 8. Install and configure code-server ──────────────────────────────
echo "[8/8] Setting up code-server..."
if ! command -v code-server &>/dev/null; then
    curl -fsSL https://code-server.dev/install.sh | sh
fi

# code-server config
mkdir -p /home/galedge-coder/.config/code-server
cat > /home/galedge-coder/.config/code-server/config.yaml << CFG
bind-addr: 0.0.0.0:8080
auth: none
cert: false
CFG

# VS Code user settings
mkdir -p /home/galedge-coder/.local/share/code-server/User
cat > /home/galedge-coder/.local/share/code-server/User/settings.json << JSON
{
    "security.workspace.trust.enabled": false,
    "files.exclude": {
        "**/.vscode": true
    },
    "python.defaultInterpreterPath": "/home/galedge-coder/bin/python"
}
JSON

chown -R galedge-coder:galedge-coder /home/galedge-coder/.config /home/galedge-coder/.local

# Install Python extension
su -l galedge-coder -s /bin/bash -c "PATH=/usr/bin:/bin code-server --install-extension ms-python.python" 2>/dev/null || true

# Systemd service
cat > /etc/systemd/system/code-server.service << SVC
[Unit]
Description=code-server
After=network.target

[Service]
Type=simple
User=galedge-coder
ExecStart=/usr/bin/code-server --bind-addr 0.0.0.0:8080 --auth none --disable-telemetry /home/galedge-coder/workspace
Restart=always
Environment=HOME=/home/galedge-coder
Environment=PATH=/usr/bin:/bin:/home/galedge-coder/bin

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable code-server
systemctl restart code-server

echo ""
echo "=== Sandbox setup complete ==="
echo ""
echo "Security summary:"
echo "  - Restricted user: galedge-coder"
echo "  - Restricted PATH: only safe commands available"
echo "  - os.system/popen/fork: BLOCKED"
echo "  - subprocess.run/Popen: BLOCKED"
echo "  - Terminal locked to user workspace"
echo "  - Shared files: read-only (root-owned)"
echo "  - DB: read-only copy, refreshed hourly"
echo "  - code-server: running on port 8080"
echo ""
echo "To set up nginx proxy for HTTPS, add:"
echo "  server_name code.yourdomain.com;"
echo "  proxy_pass http://127.0.0.1:8080;"
echo "  Then run: certbot --nginx -d code.yourdomain.com"
