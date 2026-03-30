# restart-all.ps1
# Cleanly restarts the Clara AI services

Write-Host "Stopping all node/tsx processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Starting Services in a new context..." -ForegroundColor Green
# Start the root development server (which handles both frontend and backend)
# Using Start-Process to keep it separate if needed, but npm run dev is fine here.
npm run dev
