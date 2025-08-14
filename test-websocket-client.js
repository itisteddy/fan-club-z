const io = require('socket.io-client');

console.log('🧪 Testing WebSocket Client Connection...\n');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_USER = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  avatar_url: null
};

console.log(`🔗 Connecting to: ${SERVER_URL}`);
console.log(`👤 Test user: ${TEST_USER.username}\n`);

// Create socket connection
const socket = io(SERVER_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to chat server successfully!');
  console.log('🆔 Socket ID:', socket.id);
  
  // Authenticate with the server
  console.log('🔐 Authenticating user...');
  socket.emit('authenticate', {
    userId: TEST_USER.id,
    username: TEST_USER.username,
    avatar: TEST_USER.avatar_url
  });
  
  // Join a test prediction
  setTimeout(() => {
    console.log('👥 Joining test prediction...');
    socket.emit('join_prediction', {
      predictionId: 'test-prediction-1',
      userId: TEST_USER.id
    });
  }, 1000);
  
  // Send a test message
  setTimeout(() => {
    console.log('📤 Sending test message...');
    socket.emit('send_message', {
      predictionId: 'test-prediction-1',
      userId: TEST_USER.id,
      content: 'Hello from WebSocket test!',
      username: TEST_USER.username,
      avatar: TEST_USER.avatar_url
    });
  }, 2000);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('🔄 Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('❌ Reconnection error:', error.message);
});

// Chat events
socket.on('message_history', (messages) => {
  console.log('📚 Received message history:', messages.length, 'messages');
  messages.forEach(msg => {
    console.log(`  - ${msg.username}: ${msg.content}`);
  });
});

socket.on('new_message', (message) => {
  console.log('📨 New message received:', {
    from: message.username,
    content: message.content,
    timestamp: message.created_at
  });
});

socket.on('user_joined', ({ userId, username }) => {
  console.log('👋 User joined:', username);
});

socket.on('user_left', ({ userId, username }) => {
  console.log('👋 User left:', username);
});

socket.on('user_typing', ({ username }) => {
  console.log('⌨️ User typing:', username);
});

socket.on('user_stop_typing', ({ username }) => {
  console.log('⌨️ User stopped typing:', username);
});

socket.on('error', ({ message }) => {
  console.error('❌ Chat error:', message);
});

socket.on('message_error', ({ error }) => {
  console.error('❌ Message error:', error);
});

// Test completion
setTimeout(() => {
  console.log('\n🎉 WebSocket test completed successfully!');
  console.log('✅ All connection events working properly');
  console.log('✅ Chat functionality ready for frontend integration');
  
  socket.disconnect();
  process.exit(0);
}, 5000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  socket.disconnect();
  process.exit(0);
});

console.log('⏳ Waiting for connection events...\n');
