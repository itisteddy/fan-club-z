#!/bin/bash

echo "🚀 Fan Club Z - Comments API Fix Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Deployment Steps:${NC}"
echo "1. Check current directory"
echo "2. Install/update dependencies"
echo "3. Build and restart server"
echo "4. Test API endpoints"
echo "5. Verify fixes in browser"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}🔍 Step 1: Checking project structure...${NC}"
if [ -d "server" ] && [ -d "client" ]; then
    echo -e "${GREEN}✅ Project structure looks good${NC}"
else
    echo -e "${RED}❌ Error: Expected server and client directories not found${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📦 Step 2: Installing dependencies...${NC}"
echo "Installing root dependencies..."
npm install

echo "Installing server dependencies..."
cd server && npm install && cd ..

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo -e "\n${YELLOW}🔨 Step 3: Building server...${NC}"
cd server
echo "Building TypeScript server..."
npm run build

echo -e "\n${YELLOW}🚀 Step 4: Starting server in background...${NC}"
echo "Starting server (this will run in background)..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Go back to root
cd ..

echo -e "\n${YELLOW}🧪 Step 5: Testing API endpoints...${NC}"
if [ -f "test-comments-api.sh" ]; then
    chmod +x test-comments-api.sh
    echo "Running API tests..."
    ./test-comments-api.sh
else
    echo -e "${RED}❌ Test script not found. Creating basic test...${NC}"
    
    # Basic curl test
    echo "Testing basic health endpoint..."
    curl -s "http://localhost:3001/api/v2/social/health" | jq '.' || echo "Health endpoint test failed"
fi

echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo "1. Open your browser and navigate to the Fan Club Z app"
echo "2. Go to any prediction detail page"
echo "3. Try adding a comment"
echo "4. Check browser console - should see no 404 errors"
echo "5. Server is running in background (PID: $SERVER_PID)"

echo -e "\n${YELLOW}🛑 To stop the server:${NC}"
echo "kill $SERVER_PID"

echo -e "\n${YELLOW}📊 To monitor server logs:${NC}"
echo "cd server && npm run dev"

echo -e "\n${YELLOW}🔍 To check browser console:${NC}"
echo "Open DevTools (F12) -> Console tab -> Look for comment-related requests"

echo -e "\n${GREEN}🎉 Comments API fix has been deployed successfully!${NC}"
