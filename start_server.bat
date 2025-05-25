@echo off
echo Starting Gym Management System...

REM Kill any existing Node.js processes using port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Killing process %%a
    taskkill /F /PID %%a
)

REM Start the server
node server.js

pause 