# Fan Club Z - Complete Testing Setup Guide
## All Services Available for Testing

### 🚀 **Current Service Status: ALL RUNNING**

**Last Updated**: July 17, 2025, 23:26 UTC  
**Status**: ✅ All services operational and ready for testing

---

## 📊 **Service Endpoints**

### **Backend Server (Node.js/Express)**
- **Port**: 3001
- **Status**: ✅ Running
- **Health Check**: `http://localhost:3001/health`
- **API Base**: `http://localhost:3001/api`
- **WebSocket**: `ws://localhost:3001/ws`

### **Frontend Server (Vite/React)**
- **Port**: 3000
- **Status**: ✅ Running
- **URL**: `http://localhost:3000`
- **Mobile Access**: `http://172.20.2.210:3000`

### **Database (PostgreSQL)**
- **Port**: 5432
- **Status**: ✅ Running
- **Connection**: Local development database

---

## 🧪 **Testing URLs**

### **Desktop Testing**
```bash
# Frontend Application
http://localhost:3000

# Backend API
http://localhost:3001/api

# Health Check
http://localhost:3001/health
```

### **Mobile Testing**
```bash
# Primary Network IP
http://172.20.2.210:3000

# Alternative Network IP
http://172.16.30.1:3000
```

### **API Endpoints for Testing**
```bash
# Clubs
GET http://localhost:3001/api/clubs
GET http://localhost:3001/api/clubs/:id

# Bets
GET http://localhost:3001/api/bets
GET http://localhost:3001/api/bets/:id

# Authentication
POST http://localhost:3001/api/auth/login
POST http://localhost:3001/api/auth/register

# Health Check
GET http://localhost:3001/health
```

---

## 📱 **Mobile Testing Setup**

### **Step 1: Connect to Same Network**
- Ensure your mobile device is on the same WiFi network as your computer
- Network IP: `172.20.2.210`

### **Step 2: Access the App**
- Open Safari/Chrome on your mobile device
- Navigate to: `http://172.20.2.210:3000`
- The app should load with full functionality

### **Step 3: Test Features**
- ✅ Authentication (Demo login available)
- ✅ Club navigation and details
- ✅ Bet creation and viewing
- ✅ Real-time chat functionality
- ✅ Profile and settings
- ✅ Mobile-optimized UI

---

## 🔧 **Quick Verification Commands**

### **Check Service Status**
```bash
# Check all ports
lsof -i :3000 -i :3001 -i :5432

# Test backend health
curl -s http://localhost:3001/health | jq .

# Test frontend
curl -s http://localhost:3000 | head -5

# Test API endpoints
curl -s "http://localhost:3001/api/clubs" | jq '.data | length'
curl -s "http://localhost:3001/api/bets" | jq '.data | length'
```

### **Restart Services (if needed)**
```bash
# Stop all services
pkill -f "node.*tsx.*src/index.ts"
pkill -f "vite.*--host"

# Start all services
npm run dev
```

---

## 🎯 **Testing Checklist**

### **Core Functionality**
- [ ] **Authentication**: Demo login works
- [ ] **Navigation**: Bottom tabs and FAB navigation
- [ ] **Clubs**: View clubs, enter club, chat functionality
- [ ] **Bets**: Create bets, view bet details
- [ ] **Profile**: Settings, wallet access
- [ ] **Real-time**: WebSocket connections working

### **Mobile Experience**
- [ ] **Responsive Design**: All screens look good on mobile
- [ ] **Touch Targets**: Buttons are appropriately sized
- [ ] **Navigation**: Smooth transitions and gestures
- [ ] **Performance**: Fast loading and smooth interactions
- [ ] **Accessibility**: Text readable, contrast good

### **API Testing**
- [ ] **Clubs API**: Returns club data correctly
- [ ] **Bets API**: Returns bet data correctly
- [ ] **Health Check**: Backend status reporting
- [ ] **WebSocket**: Real-time connections established

---

## 🐛 **Troubleshooting**

### **Common Issues**

**1. Port Already in Use**
```bash
# Check what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>
```

**2. Mobile Can't Connect**
```bash
# Check firewall settings
sudo ufw status

# Allow the port (if needed)
sudo ufw allow 3000
sudo ufw allow 3001
```

**3. Database Connection Issues**
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Restart PostgreSQL if needed
brew services restart postgresql
```

**4. WebSocket Connection Errors**
- Ensure backend is running on port 3001
- Check browser console for connection errors
- Verify notification service configuration

---

## 📋 **Current Configuration**

### **Server Configuration**
- **Default Port**: 3001 (updated from 5001)
- **Host**: 0.0.0.0 (accessible from network)
- **Environment**: Development
- **Database**: PostgreSQL (local)

### **Client Configuration**
- **API URL**: `http://localhost:3001/api`
- **WebSocket URL**: `ws://localhost:3001/ws`
- **Mobile API URL**: `http://172.20.2.210:3001/api`
- **Mobile WebSocket**: `ws://172.20.2.210:3001/ws`

### **Recent Fixes Applied**
- ✅ WebSocket port corrected from 5001 to 3001
- ✅ Server configuration updated
- ✅ Client configuration files updated
- ✅ Club detail page debugging added
- ✅ Mobile network access configured

---

## 🎉 **Ready for Testing!**

All services are now running and available for comprehensive testing:

- **Desktop**: `http://localhost:3000`
- **Mobile**: `http://172.20.2.210:3000`
- **API**: `http://localhost:3001/api`
- **Health**: `http://localhost:3001/health`

The application is fully functional with all features working, including:
- Real-time chat in clubs
- Bet creation and management
- Mobile-optimized UI
- Apple-inspired design system
- Authentication and user management

Happy testing! 🚀 