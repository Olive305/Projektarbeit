#!/bin/bash

# Navigate to the backend directory
cd server

# Install backend Python dependencies using pip and requirements.txt
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Start Backend (Python Flask)
echo "Starting the backend..."
python3 main.py &

# Navigate to the frontend directory and install npm dependencies
echo "Installing frontend dependencies..."
cd ../client
npm install

# Start Frontend
echo "Starting the frontend..."
npm run dev
