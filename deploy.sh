#!/bin/bash
# Simple deployment script for Soccer Coach Tracker web app

echo "Preparing Soccer Coach Tracker web app for deployment..."

# Create app directory structure expected by deployment
mkdir -p app/build/outputs/apk/debug

# Copy the dist contents to the location expected by the deployment
cp -r dist/* app/build/outputs/apk/debug/

echo "Soccer Coach Tracker web app is ready for deployment!"
echo "The app will be served from the clean dist version."

# This keeps the script running to satisfy deployment needs
python -m http.server 5000