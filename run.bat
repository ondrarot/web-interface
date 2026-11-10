@echo off
title WebHub Central Server
echo Starting My Website Hub...
echo --------------------------
echo.

:: 1. Start the background "Waiter" to open the browser
start /b powershell -Command "$port = 8000; while (!(Test-NetConnection localhost -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded) { Start-Sleep -Seconds 1 }; Start-Process 'http://localhost:8000'"

echo Server is starting with AUTO-RELOAD... 
echo (The browser will open automatically in a few seconds)
echo.
echo --------------------------
echo SERVER LOGS:
echo --------------------------

:: 2. Run the server using uvicorn with --reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo Server stopped.
pause
