#!/bin/sh
# This is a placeholder script to satisfy the Replit deployment process
# It simply serves the web app from the dist directory

echo "Deploying Soccer Coach Tracker web app..."
cd dist
exec python -m http.server 5000