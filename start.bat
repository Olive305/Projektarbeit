@echo off


:: Navigate to the frontend directory
cd client

:: Install frontend dependencies using npm
echo Installing frontend dependencies...
call npm install

:: Navigate to the backend directory
cd ..\server

:: Install backend Python dependencies using pip
echo Installing backend dependencies...
pip install -r requirements.txt

:: Start backend in a new command window
echo Starting the backend...
start cmd /k python main.py
