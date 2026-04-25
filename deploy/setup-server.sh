#!/bin/bash
# Run this ONCE on a fresh Linode server to set up everything.
# Usage: ssh root@your-server 'bash -s' < deploy/setup-server.sh

set -e

DOMAIN="galedge.byvaibhav.com"
APP_DIR="/opt/galedge"
DEPLOY_USER="deploy"
REPO="https://github.com/mr-vaibh/galedge.git"

echo "=== Installing system dependencies ==="
apt update && apt upgrade -y
apt install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx git curl

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

echo "=== Creating deploy user ==="
id -u $DEPLOY_USER &>/dev/null || useradd -m -s /bin/bash $DEPLOY_USER
mkdir -p /home/$DEPLOY_USER/.ssh
cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/ 2>/dev/null || true
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null || true

# Allow deploy user to restart galedge services without password
cat > /etc/sudoers.d/galedge << EOF
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart galedge-api
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart galedge-frontend
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop galedge-api
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop galedge-frontend
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl start galedge-api
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl start galedge-frontend
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl status galedge-api
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl status galedge-frontend
EOF
chmod 440 /etc/sudoers.d/galedge

echo "=== Cloning repo ==="
git clone "$REPO" "$APP_DIR" || (cd "$APP_DIR" && git pull)
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"

echo "=== Setting up Python venv ==="
su - $DEPLOY_USER -c "
  python3 -m venv $APP_DIR/.venv
  source $APP_DIR/.venv/bin/activate
  pip install -r $APP_DIR/backend/requirements.txt
  pip install -e $APP_DIR/packages/galedge-core
"

echo "=== Building frontend ==="
su - $DEPLOY_USER -c "
  cd $APP_DIR/frontend
  npm ci
  echo 'NEXT_PUBLIC_API_URL=https://$DOMAIN' > .env.local
  npm run build
"

echo "=== Creating systemd services ==="

# Backend API service
cat > /etc/systemd/system/galedge-api.service << EOF
[Unit]
Description=Galedge FastAPI Backend
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$APP_DIR/backend
ExecStart=$APP_DIR/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
cat > /etc/systemd/system/galedge-frontend.service << EOF
[Unit]
Description=Galedge Next.js Frontend
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$APP_DIR/frontend
ExecStart=/usr/bin/npx next start --port 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable galedge-api galedge-frontend
systemctl start galedge-api galedge-frontend

echo "=== Configuring Nginx ==="

cat > /etc/nginx/sites-available/galedge << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/galedge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Setting up SSL ==="
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN || echo "SSL setup failed — run manually: certbot --nginx -d $DOMAIN"

echo ""
echo "=== Setup complete! ==="
echo "  Frontend: https://$DOMAIN"
echo "  API:      https://$DOMAIN/api/docs"
echo ""
echo "  Deploy user: $DEPLOY_USER"
echo "  App dir:     $APP_DIR"
echo ""
echo "Next steps:"
echo "  1. Add these GitHub secrets:"
echo "     LINODE_HOST    = your server IP"
echo "     LINODE_SSH_KEY = private SSH key for '$DEPLOY_USER' user"
echo "  2. Push to main branch to trigger auto-deploy"
