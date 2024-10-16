@echo off

:: Navigate to the backend directory
cd server

:: Install backend Python dependencies using pip
echo Installing backend dependencies...
pip install -r requirements.txt

:: Start backend in a new command window
echo Starting the backend...
start cmd /k python main.py

:: Navigate to the frontend directory
cd ../client

:: Install frontend dependencies using npm
echo Installing frontend dependencies...
call npm install

:: Start frontend in a new command window (ensure correct working directory)
echo Starting the frontend...
start cmd /k "cd /d %cd% && npm run dev"
