#!/bin/bash
set -e

cd /root/marketplace

# Init git if not already done
if [ ! -d ".git" ]; then
  git init
  git remote add origin https://github.com/kkit159/marketplizzzz.git
fi

# Try pulling as public repo
git config --global credential.helper ""
GIT_TERMINAL_PROMPT=0 git fetch origin main 2>&1
if [ $? -eq 0 ]; then
  git reset --hard origin/main
  echo "[OK] Git pull successful"
else
  echo "[FAIL] Could not pull - repo may be private"
fi
