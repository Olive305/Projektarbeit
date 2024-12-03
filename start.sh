#!/bin/bash

# Navigate to the frontend directory and install npm dependencies
echo "Installing frontend dependencies..."
cd client || { echo "Failed to navigate to client directory"; exit 1; }
npm install || { echo "Failed to install npm dependencies"; exit 1; }
npm fund || { echo "Failed to install npm dependencies"; exit 1; }
npm run build || { echo "Failed to build frontend"; exit 1; }

# Navigate to the backend directory
cd ../server || { echo "Failed to navigate to server directory"; exit 1; }

# Install backend Python dependencies using pip and requirements.txt
echo "Installing backend dependencies..."
pip install -r requirements.txt || { echo "Failed to install backend dependencies"; exit 1; }

# Start Backend (Python Flask)
echo "Starting the backend..."
python3 main.py &

