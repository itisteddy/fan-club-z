#!/bin/bash

# WebSocket CORS Testing Script for Fan Club Z
# This script helps test and verify WebSocket connections

echo "🧪 Fan Club Z WebSocket CORS Testing Utility"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test HTTP endpoint
test_http_endpoint() {
    local url=$1
    echo -e "\n${BLUE}Testing HTTP endpoint: ${url}${NC}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ HTTP endpoint is accessible (200 OK)${NC}"
        return 0
    else
        echo -e "${RED}❌ HTTP endpoint failed (HTTP $response)${NC}"
        return 1
    fi
}

# Function to test Socket.IO endpoint
test_socket_endpoint() {
    local url=$1
    echo -e "\n${BLUE}Testing Socket.IO endpoint: ${url}${NC}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url/socket.io/?EIO=4&transport=polling" 2>/dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "101" ]; then
        echo -e "${GREEN}✅ Socket.IO endpoint is accessible (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}❌ Socket.IO endpoint failed (HTTP $response)${NC}"
        return 1
    fi
}

# Function to check environment variables
check_environment() {
    echo -e "\n${BLUE}Checking environment variables...${NC}"
    
    local missing_vars=0
    
    # Required variables
    vars=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
    
    for var in "${vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ Missing required variable: $var${NC}"
            ((missing_vars++))
        else
            echo -e "${GREEN}✅ $var is set${NC}"
        fi
    done
    
    # Optional but recommended
    optional_vars=("FRONTEND_URL" "CLIENT_URL" "VITE_APP_URL" "API_URL")
    
    for var in "${optional_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${YELLOW}⚠️  Optional variable not set: $var${NC}"
        else
            echo -e "${GREEN}✅ $var = ${!var}${NC}"
        fi
    done
    
    return $missing_vars
}

# Function to test CORS headers
test_cors_headers() {
    local url=$1
    local origin=$2
    echo -e "\n${BLUE}Testing CORS headers for origin: ${origin}${NC}"
    
    response=$(curl -s -H "Origin: $origin" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS "$url/api/health" -I 2>/dev/null)
    
    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        allowed_origin=$(echo "$response" | grep "Access-Control-Allow-Origin" | cut -d' ' -f2- | tr -d '\r\n')
        echo -e "${GREEN}✅ CORS headers present: $allowed_origin${NC}"
        return 0
    else
        echo -e "${RED}❌ CORS headers missing or not accessible${NC}"
        return 1
    fi
}

# Function to create test client
create_test_client() {
    cat > websocket-test.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Fan Club Z WebSocket Test</title>
    <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
</head>
<body>
    <h1>Fan Club Z WebSocket Connection Test</h1>
    <div id="status">Connecting...</div>
    <div id="logs"></div>
    
    <script>
        const statusDiv = document.getElementById('status');
        const logsDiv = document.getElementById('logs');
        
        function log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'black';
            logsDiv.innerHTML += `<div style="color: ${color}">[${timestamp}] ${message}</div>`;
        }
        
        // Get server URL from current location or use localhost
        const serverUrl = window.location.origin.replace(/:\d+$/, ':3001') || 'http://localhost:3001';
        
        log(`Attempting to connect to: ${serverUrl}`);
        
        const socket = io(serverUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });
        
        socket.on('connect', () => {
            statusDiv.innerHTML = '✅ Connected';
            statusDiv.style.color = 'green';
            log(`Connected! Socket ID: ${socket.id}`, 'success');
            log(`Transport: ${socket.io.engine.transport.name}`, 'info');
            
            // Test ping
            socket.emit('ping');
        });
        
        socket.on('connected', (data) => {
            log(`Server confirmation: ${JSON.stringify(data)}`, 'success');
        });
        
        socket.on('pong', (data) => {
            log(`Ping response: ${JSON.stringify(data)}`, 'success');
        });
        
        socket.on('connect_error', (error) => {
            statusDiv.innerHTML = '❌ Connection Error';
            statusDiv.style.color = 'red';
            log(`Connection error: ${error.message}`, 'error');
        });
        
        socket.on('disconnect', (reason) => {
            statusDiv.innerHTML = '🔌 Disconnected';
            statusDiv.style.color = 'orange';
            log(`Disconnected: ${reason}`, 'error');
        });
        
        // Test authentication after 1 second
        setTimeout(() => {
            if (socket.connected) {
                socket.emit('authenticate', {
                    userId: 'test-user-123',
                    username: 'TestUser',
                    avatar: null
                });
                log('Sent authentication request', 'info');
            }
        }, 1000);
        
        socket.on('authenticated', (data) => {
            log(`Authentication successful: ${JSON.stringify(data)}`, 'success');
        });
        
        socket.on('error', (error) => {
            log(`Socket error: ${JSON.stringify(error)}`, 'error');
        });
    </script>
</body>
</html>
EOF

    echo -e "${GREEN}✅ Created websocket-test.html${NC}"
    echo -e "${BLUE}📝 Open websocket-test.html in your browser to test the connection${NC}"
}

# Main testing function
run_tests() {
    echo -e "\n${YELLOW}Starting WebSocket CORS tests...${NC}"
    
    # Check environment
    check_environment
    env_result=$?
    
    if [ $env_result -gt 0 ]; then
        echo -e "\n${RED}⚠️  Some environment variables are missing. This may cause connection issues.${NC}"
    fi
    
    # Test URLs
    local test_urls=(
        "http://localhost:3001"
        "https://dev.fanclubz.app"
        "https://fanclubz.app"
    )
    
    # Test origins for CORS
    local test_origins=(
        "http://localhost:5173"
        "https://dev.fanclubz.app"
        "https://fanclubz.app"
    )
    
    echo -e "\n${YELLOW}Testing server endpoints...${NC}"
    
    for url in "${test_urls[@]}"; do
        if test_http_endpoint "$url"; then
            test_socket_endpoint "$url"
            
            # Test CORS for this URL
            for origin in "${test_origins[@]}"; do
                test_cors_headers "$url" "$origin"
            done
        fi
    done
    
    # Create test client
    echo -e "\n${YELLOW}Creating test client...${NC}"
    create_test_client
    
    echo -e "\n${BLUE}🎯 Summary:${NC}"
    echo -e "${BLUE}1. Check that your server is running on the correct port${NC}"
    echo -e "${BLUE}2. Verify environment variables are set correctly${NC}"
    echo -e "${BLUE}3. Open websocket-test.html in your browser to test the connection${NC}"
    echo -e "${BLUE}4. Check your browser's developer console for any errors${NC}"
    
    echo -e "\n${GREEN}✅ WebSocket testing complete!${NC}"
}

# Help function
show_help() {
    echo "Fan Club Z WebSocket CORS Testing Utility"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -e, --env      Check environment variables only"
    echo "  -c, --client   Create test client only"
    echo "  -t, --test     Run full test suite (default)"
    echo ""
    echo "Examples:"
    echo "  $0              # Run full test suite"
    echo "  $0 --env        # Check environment variables"
    echo "  $0 --client     # Create test HTML client"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -e|--env)
        check_environment
        exit $?
        ;;
    -c|--client)
        create_test_client
        exit 0
        ;;
    -t|--test|"")
        run_tests
        exit 0
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
esac