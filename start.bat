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

:: Install waitress if not already installed
pip install waitress || exit /b

:: Start backend using waitress
echo Starting the backend with waitress...
waitress-serve --port=8000 main:app || exit /b

endlocal
