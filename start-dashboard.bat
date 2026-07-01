@echo off
echo Starting Marketing Dashboard Servers...
echo =======================================

echo Starting Node Proxy Server...
start cmd /k "node dev-proxy.js"

echo Starting Vite Frontend Server...
start cmd /k "npm run dev"

echo Both servers are starting up. You can access the dashboard in your browser shortly!
echo.
pause
