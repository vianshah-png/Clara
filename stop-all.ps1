echo "Stopping all node/tsx processes for Clara AI..."

# Stop any running node or tsx processes
Get-Process | Where-Object { $_.Name -eq "node" -or $_.Name -eq "tsx" } | Stop-Process -Force -ErrorAction SilentlyContinue

echo "Processes stopped successfully."
