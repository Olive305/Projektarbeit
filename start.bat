@echo off
setlocal

:: Navigate to the frontend directory
cd client || exit /b

:: Install frontend dependencies using npm
echo Installing frontend dependencies...
call npm install || exit /b
call npm fund || exit /b
call npm run build || exit /b

:: Navigate to the backend directory
cd ..\server || exit /b

:: Install backend Python dependencies using pip
echo Installing backend dependencies...
pip install -r requirements.txt || exit /b

:: Start backend in a new command window
echo Starting the backend...
start cmd /k "python main.py" || exit /b

endlocal
