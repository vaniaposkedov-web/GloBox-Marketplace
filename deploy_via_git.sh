#!/bin/bash
set -e

# Configure SSH to use deploy key for GitHub
mkdir -p /root/.ssh
cat > /root/.ssh/config << 'SSHEOF'
Host github.com
  HostName github.com
  User git
  IdentityFile /root/.ssh/github_deploy
  StrictHostKeyChecking no
SSHEOF
chmod 600 /root/.ssh/config

echo "=== Testing GitHub SSH access ==="
ssh -T git@github.com 2>&1 | grep -E "success|denied|Hi" || true

echo "=== Setting up git in /root/marketplace ==="
cd /root/marketplace

# Remove broken .git if exists
if [ -d ".git" ]; then
  rm -rf .git
fi

git init -b main
git remote add origin git@github.com:kkit159/marketplizzzz.git
git fetch origin main

# Save current .env files before reset
cp apps/api/.env /tmp/api_env_backup
cp apps/web/.env.local /tmp/web_env_backup

git reset --hard origin/main
echo "[OK] Code updated from git"

# Restore .env files (not in git)
cp /tmp/api_env_backup apps/api/.env
cp /tmp/web_env_backup apps/web/.env.local
echo "[OK] .env files restored"

echo "=== Installing dependencies ==="
pnpm install --frozen-lockfile 2>&1 | tail -3

echo "=== Building API ==="
cd apps/api
pnpm build 2>&1 | grep -E "error TS|Cannot find|Successfully compiled|Built in" || true
cd /root/marketplace

echo "=== Restarting API ==="
pm2 restart marketplace-api
sleep 4
pm2 logs marketplace-api --lines 3 --nostream 2>&1 | grep -E "listening|error|P1000" || true

echo "=== DONE ==="
