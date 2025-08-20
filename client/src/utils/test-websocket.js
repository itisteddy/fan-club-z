// Simple WebSocket connection test
// Run this in the browser console to test chat connection

console.log('🧪 Testing WebSocket connection...');

// Test the connection
const testConnection = () => {
  // Use the same configuration as the chatStore
  const serverUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3001';
  console.log('🔗 Connecting to:', serverUrl);
  
  // Try to connect using Socket.IO (if available)
  if (typeof io !== 'undefined') {
    const socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully!');
      console.log('📍 Socket ID:', socket.id);
      
      // Test authentication
      socket.emit('authenticate', {
        userId: 'test-user-' + Date.now(),
        username: 'TestUser',
        avatar: 'TU'
      });
    });

    socket.on('authenticated', (data) => {
      console.log('🔐 Authentication successful:', data);
      
      // Test joining a prediction room
      socket.emit('join_prediction', {
        predictionId: 'test-prediction',
        userId: 'test-user-' + Date.now()
      });
    });

    socket.on('joined_prediction', (data) => {
      console.log('👥 Joined prediction room:', data);
      
      // Test sending a message
      socket.emit('send_message', {
        predictionId: 'test-prediction',
        userId: 'test-user-' + Date.now(),
        content: 'Test message from browser console',
        username: 'TestUser'
      });
    });

    socket.on('new_message', (message) => {
      console.log('📨 Received message:', message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    // Store socket for manual testing
    window.testSocket = socket;
    console.log('💡 Socket stored as window.testSocket for manual testing');
    
    return socket;
  } else {
    console.error('❌ Socket.IO not available. Make sure the app is loaded.');
    return null;
  }
};

// Run the test
testConnection();

// Helper functions for manual testing
window.testChat = {
  connect: testConnection,
  
  sendMessage: (content) => {
    if (window.testSocket && window.testSocket.connected) {
      window.testSocket.emit('send_message', {
        predictionId: 'test-prediction',
        userId: 'test-user-' + Date.now(),
        content: content,
        username: 'TestUser'
      });
    } else {
      console.error('❌ Socket not connected. Run testChat.connect() first.');
    }
  },
  
  joinPrediction: (predictionId) => {
    if (window.testSocket && window.testSocket.connected) {
      window.testSocket.emit('join_prediction', {
        predictionId: predictionId,
        userId: 'test-user-' + Date.now()
      });
    } else {
      console.error('❌ Socket not connected. Run testChat.connect() first.');
    }
  },
  
  disconnect: () => {
    if (window.testSocket) {
      window.testSocket.disconnect();
      delete window.testSocket;
      console.log('🔌 Test socket disconnected');
    }
  }
};

console.log('💡 Use testChat.sendMessage("Hello") to test messaging');
console.log('💡 Use testChat.joinPrediction("prediction-id") to join a room');
console.log('💡 Use testChat.disconnect() to disconnect');
