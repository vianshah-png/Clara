#!/bin/sh

# 1. Start Lightpanda browser in the background
echo "[Launcher] Starting Lightpanda browser on :9222..."
lightpanda --host 0.0.0.0 --port 9222 --headless &
BROWSER_PID=$!

# 2. Start Backend Server
echo "[Launcher] Starting Backend server on :3001..."
cd /app/backend && node server.js &
BACKEND_PID=$!

# 3. Start Frontend (Next.js Standalone)
# Note: Next.js handles the main $PORT (8080) and proxies /api to :3001
echo "[Launcher] Starting Frontend on :$PORT..."
cd /app/frontend && PORT=$PORT HOSTNAME=0.0.0.0 node server.js &
FRONTEND_PID=$!

# Keep-alive and monitoring
wait -n
exit $?
