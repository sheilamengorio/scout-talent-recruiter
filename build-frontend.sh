#!/bin/bash
# Build frontend for FTP deployment
# Usage: ./build-frontend.sh https://your-backend-url.up.railway.app

if [ -z "$1" ]; then
  echo ""
  echo "Usage: ./build-frontend.sh <BACKEND_URL>"
  echo ""
  echo "Example: ./build-frontend.sh https://scout-talent-api.up.railway.app"
  echo ""
  echo "The BACKEND_URL is where your backend is deployed (Railway/Render)."
  echo "The /api suffix will be added automatically."
  echo ""
  exit 1
fi

BACKEND_URL="$1"

echo "Building frontend with backend URL: ${BACKEND_URL}/api"
echo ""

cd client

# Set the API URL environment variable and build
VITE_API_URL="${BACKEND_URL}/api" npm run build

echo ""
echo "Build complete!"
echo ""
echo "Upload the contents of the 'public/' folder to your FTP server."
echo "Files to upload are in: $(cd .. && pwd)/public/"
echo ""
echo "Files:"
ls -la ../public/
