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

# Install waitress if not already installed
pip install waitress || { echo "Failed to install waitress"; exit 1; }

# Start backend using waitress
echo "Starting the backend with waitress..."
~/.local/bin/waitress-serve --port=8000 main:app || { echo "Failed to start the backend with waitress"; exit 1; }