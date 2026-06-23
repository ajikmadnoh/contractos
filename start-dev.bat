@echo off
title ContractOS Dev Startup
echo ============================================
echo  ContractOS - Starting Development Servers
echo ============================================
echo.

echo [1/3] Starting PostgreSQL via Docker...
docker-compose up -d
timeout /t 5 /nobreak >nul

echo [2/3] Running seed (demo users)...
cd backend
call npm run seed
cd ..

echo [3/3] Starting backend and frontend...
start "ContractOS Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "ContractOS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo  Servers starting up...
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:5001
echo.
echo  Demo login: director@demo.com / Demo1234!
echo ============================================
echo.
echo Opening browser in 8 seconds...
timeout /t 8 /nobreak >nul
start http://localhost:3000
