#!/bin/sh
echo "[start] Starting API server (skip migrations)..."
exec node dist/main.js
