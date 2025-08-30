#!/bin/bash

# Fan Club Z - WebSocket Connection & Authentication Fix
# This script fixes the specific WebSocket authentication issues seen in browser console

echo "🔧 Fan Club Z - WebSocket Authentication Fix"
echo "============================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_info "Step 1: Updating ChatStore with better authentication flow..."

# Create a comprehensive fix for the chatStore authentication
cat > client/src/store/chatStore.ts << 'EOF'
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { getSocketUrl } from '../lib/environment';

export interface ChatMessage {
  id: string;
  prediction_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'image' | 'emoji' | 'system';
  reply_to_id?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface ChatParticipant {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen_at: string;
}

export interface TypingUser {
  username: string;
  timestamp: number;
}

export interface MessageReaction {
  messageId: string;
  userId: string;
  reactionType: string;
}

interface ChatState {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  messages: Record<string, ChatMessage[]>; // predictionId -> messages
  participants: Record<string, ChatParticipant[]>; // predictionId -> participants
  typingUsers: Record<string, TypingUser[]>; // predictionId -> typing users
  currentPredictionId: string | null;
  connectionError: string | null;
  messageHistory: Record<string, boolean>; // Track which predictions have loaded history
  reconnectAttempts: number;
  
  // Actions
  initializeSocket: () => void;
  disconnectSocket: () => void;
  joinPrediction: (predictionId: string) => void;
  leavePrediction: (predictionId: string) => void;
  sendMessage: (predictionId: string, content: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, reactionType: string) => void;
  startTyping: (predictionId: string) => void;
  stopTyping: (predictionId: string) => void;
  clearMessages: (predictionId: string) => void;
  testConnection: () => Promise<boolean>;
  
  // Getters
  getMessagesForPrediction: (predictionId: string) => ChatMessage[];
  getParticipantsForPrediction: (predictionId: string) => ChatParticipant[];
  getTypingUsersForPrediction: (predictionId: string) => TypingUser[];
  getUnreadCount: (predictionId: string) => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  isConnected: false,
  isConnecting: false,
  isAuthenticated: false,
  messages: {},
  participants: {},
  typingUsers: {},
  currentPredictionId: null,
  connectionError: null,
  messageHistory: {},
  reconnectAttempts: 0,

  testConnection: async () => {
    const serverUrl = getServerUrl();
    console.log('🔗 Testing connection to:', serverUrl);
    
    try {
      const response = await fetch(`${serverUrl}/health`);
      const data = await response.json();
      console.log('✅ Server health check passed:', data);
      return true;
    } catch (error) {
      console.error('❌ Server health check failed:', error);
      return false;
    }
  },

  initializeSocket: () => {
    const { socket, isConnected, isConnecting } = get();
    
    if (socket?.connected || isConnecting) {
      console.log('🔗 Socket already connected or connecting, skipping initialization');
      return;
    }

    const { user } = useAuthStore.getState();
    if (!user) {
      console.warn('⚠️ Cannot initialize socket without authenticated user');
      console.warn('⚠️ User state:', user);
      // Retry after a short delay in case auth is still loading
      setTimeout(() => {
        const { user: retryUser } = useAuthStore.getState();
        if (retryUser && !get().socket?.connected) {
          console.log('🔄 Retrying socket initialization with user:', retryUser.email);
          get().initializeSocket();
        }
      }, 2000);
      return;
    }

    console.log('👤 Initializing socket for user:', {
      id: user.id,
      email: user.email,
      username: user.username
    });

    set({ isConnecting: true, connectionError: null, reconnectAttempts: 0, isAuthenticated: false });

    const serverUrl = getServerUrl();
    console.log('🔗 Connecting to chat server:', serverUrl);
    console.log('🌍 Environment:', import.meta.env.MODE);
    console.log('🌍 Is Production:', import.meta.env.PROD);
    
    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 20000, // Shorter timeout for faster feedback
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      // Add query parameters for debugging
      query: {
        clientType: 'web',
        version: '2.0.0',
        environment: import.meta.env.MODE,
        userId: user.id
      }
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔗 Connected to chat server');
      console.log('🆔 Socket ID:', newSocket.id);
      console.log('🔧 Transport:', newSocket.io.engine.transport.name);
      
      set({ 
        isConnected: true, 
        isConnecting: false, 
        connectionError: null,
        reconnectAttempts: 0 
      });
      
      // Authenticate with the server immediately
      console.log('🔐 Sending authentication for user:', user.id);
      newSocket.emit('authenticate', {
        userId: user.id,
        username: user.username || user.email?.split('@')[0] || 'Anonymous',
        avatar: user.avatar_url
      });
    });

    // Authentication events
    newSocket.on('authenticated', (data) => {
      console.log('✅ Authentication successful:', data);
      set({ isAuthenticated: true });
      
      // If there was a pending prediction join, try it now
      const { currentPredictionId } = get();
      if (currentPredictionId) {
        console.log('🔄 Rejoining prediction after authentication:', currentPredictionId);
        get().joinPrediction(currentPredictionId);
      }
    });

    newSocket.on('auth_error', (data) => {
      console.error('❌ Authentication failed:', data);
      set({ 
        isAuthenticated: false,
        connectionError: 'Authentication failed. Please refresh the page.' 
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat server:', reason);
      set({ isConnected: false, isConnecting: false, isAuthenticated: false });
      
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected, attempting to reconnect...');
      } else if (reason === 'transport close') {
        console.log('🔄 Connection timeout, reconnecting...');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      
      const attempts = get().reconnectAttempts + 1;
      set({ 
        isConnected: false, 
        isConnecting: false, 
        connectionError: getConnectionErrorMessage(error),
        reconnectAttempts: attempts,
        isAuthenticated: false
      });

      if (attempts >= 3) {
        set({ 
          connectionError: 'Unable to connect to chat server. Please check your internet connection and try again.' 
        });
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      set({ 
        isConnected: true, 
        isConnecting: false, 
        connectionError: null,
        reconnectAttempts: 0 
      });
    });

    // Connection confirmation
    newSocket.on('connected', (data) => {
      console.log('🎉 Connection confirmed:', data);
    });

    // Ping/pong for connection testing
    newSocket.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
    });

    // Error handling
    newSocket.on('error', ({ message }: { message: string }) => {
      console.error('❌ Chat error:', message);
      set({ connectionError: message });
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      console.log('🔌 Disconnecting socket');
      socket.disconnect();
      set({ 
        socket: null, 
        isConnected: false, 
        isConnecting: false,
        isAuthenticated: false,
        currentPredictionId: null,
        connectionError: null,
        reconnectAttempts: 0
      });
    }
  },

  joinPrediction: (predictionId: string) => {
    const { socket, isConnected, isAuthenticated } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected) {
      console.warn('⚠️ Cannot join prediction: socket not connected');
      console.warn('⚠️ Connection state:', { connected: socket?.connected, isConnected });
      return;
    }

    if (!isAuthenticated) {
      console.warn('⚠️ Cannot join prediction: not authenticated');
      console.warn('⚠️ Setting prediction ID for later:', predictionId);
      set({ currentPredictionId: predictionId });
      return;
    }

    if (!user) {
      console.warn('⚠️ Cannot join prediction: user not available');
      return;
    }

    console.log('👥 Joining prediction chat:', predictionId);
    
    socket.emit('join_prediction', {
      predictionId,
      userId: user.id
    });

    set({ currentPredictionId: predictionId });
  },

  leavePrediction: (predictionId: string) => {
    const { socket } = get();
    if (!socket?.connected) return;

    console.log('👋 Leaving prediction chat:', predictionId);
    
    socket.emit('leave_prediction', { predictionId });
    
    if (get().currentPredictionId === predictionId) {
      set({ currentPredictionId: null });
    }
  },

  sendMessage: (predictionId: string, content: string) => {
    const { socket, isAuthenticated } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !isAuthenticated || !user || !content.trim()) {
      console.warn('⚠️ Cannot send message:', {
        connected: socket?.connected,
        authenticated: isAuthenticated,
        hasUser: !!user,
        hasContent: !!content.trim()
      });
      return;
    }

    console.log('📤 Sending message:', content);
    
    socket.emit('send_message', {
      predictionId,
      userId: user.id,
      content: content.trim(),
      username: user.username || user.email?.split('@')[0] || 'Anonymous',
      avatar: user.avatar_url
    });
  },

  editMessage: (messageId: string, newContent: string) => {
    const { socket, isAuthenticated } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !isAuthenticated || !user || !newContent.trim()) return;

    socket.emit('edit_message', {
      messageId,
      userId: user.id,
      newContent: newContent.trim()
    });
  },

  deleteMessage: (messageId: string) => {
    const { socket, isAuthenticated } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !isAuthenticated || !user) return;

    socket.emit('delete_message', {
      messageId,
      userId: user.id
    });
  },

  addReaction: (messageId: string, reactionType: string) => {
    const { socket, isAuthenticated } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !isAuthenticated || !user) return;

    socket.emit('add_reaction', {
      messageId,
      userId: user.id,
      reactionType
    });
  },

  startTyping: (predictionId: string) => {
    const { socket, isAuthenticated } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !isAuthenticated || !user) return;

    socket.emit('typing_start', {
      predictionId,
      username: user.username || user.email?.split('@')[0] || 'Anonymous'
    });
  },

  stopTyping: (predictionId: string) => {
    const { socket, isAuthenticated } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !isAuthenticated || !user) return;

    socket.emit('typing_stop', {
      predictionId,
      username: user.username || user.email?.split('@')[0] || 'Anonymous'
    });
  },

  clearMessages: (predictionId: string) => {
    set(state => {
      const newMessages = { ...state.messages };
      delete newMessages[predictionId];
      
      const newMessageHistory = { ...state.messageHistory };
      delete newMessageHistory[predictionId];
      
      return {
        messages: newMessages,
        messageHistory: newMessageHistory
      };
    });
  },

  // Getters
  getMessagesForPrediction: (predictionId: string) => {
    return get().messages[predictionId] || [];
  },

  getParticipantsForPrediction: (predictionId: string) => {
    return get().participants[predictionId] || [];
  },

  getTypingUsersForPrediction: (predictionId: string) => {
    return get().typingUsers[predictionId] || [];
  },

  getUnreadCount: (predictionId: string) => {
    return 0;
  }
}));

// Helper function to get the correct server URL using environment detection
function getServerUrl(): string {
  const serverUrl = getSocketUrl();
  console.log('🔧 Using detected server URL:', serverUrl);
  return serverUrl;
}

// Helper function to get user-friendly connection error messages
function getConnectionErrorMessage(error: any): string {
  if (error.message) {
    if (error.message.includes('CORS')) {
      return 'Connection blocked by CORS policy. Please check server configuration.';
    } else if (error.message.includes('xhr poll error')) {
      return 'Polling connection failed. Trying WebSocket...';
    } else if (error.message.includes('websocket error')) {
      return 'WebSocket connection failed. Check URL configuration.';
    } else if (error.message.includes('timeout')) {
      return 'Connection timeout. Server may be slow to respond.';
    }
  }
  
  return `Failed to connect to chat server: ${error.message || 'Unknown error'}`;
}
EOF

print_status "Updated ChatStore with improved authentication flow"

print_info "Step 2: Updating Discussion component to handle new authentication state..."

# Update the Discussion component to use the new authentication state
cat > client/src/components/Discussion.tsx << 'EOF'
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Users, MessageCircle } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

interface DiscussionProps {
  predictionId: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Discussion({ predictionId, title, isOpen, onClose }: DiscussionProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { user } = useAuthStore();
  const {
    socket,
    isConnected,
    isAuthenticated,
    connectionError,
    messages,
    participants,
    typingUsers,
    initializeSocket,
    joinPrediction,
    leavePrediction,
    sendMessage,
    startTyping,
    stopTyping,
    getMessagesForPrediction,
    getParticipantsForPrediction,
    getTypingUsersForPrediction,
  } = useChatStore();

  const predictionMessages = getMessagesForPrediction(predictionId);
  const predictionParticipants = getParticipantsForPrediction(predictionId);
  const predictionTypingUsers = getTypingUsersForPrediction(predictionId);

  // Initialize socket when component mounts or user changes
  useEffect(() => {
    if (user && !socket?.connected) {
      console.log('🚀 Discussion: Initializing socket for user:', user.email);
      initializeSocket();
    }
  }, [user, socket?.connected, initializeSocket]);

  // Join prediction when authenticated and connected
  useEffect(() => {
    if (isOpen && isConnected && isAuthenticated && predictionId) {
      console.log('🎯 Discussion: Joining prediction:', predictionId);
      joinPrediction(predictionId);
    }

    return () => {
      if (predictionId) {
        console.log('👋 Discussion: Leaving prediction:', predictionId);
        leavePrediction(predictionId);
      }
    };
  }, [isOpen, isConnected, isAuthenticated, predictionId, joinPrediction, leavePrediction]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [predictionMessages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isAuthenticated) return;

    sendMessage(predictionId, message);
    setMessage('');
    handleStopTyping();
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      startTyping(predictionId);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping(predictionId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const getConnectionStatus = () => {
    if (!user) return { text: 'Please log in to chat', color: 'text-red-500' };
    if (!isConnected) return { text: 'Connecting...', color: 'text-yellow-500' };
    if (!isAuthenticated) return { text: 'Authenticating...', color: 'text-yellow-500' };
    return { text: 'Connected', color: 'text-green-500' };
  };

  const connectionStatus = getConnectionStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900 truncate">Discussion</h3>
              <p className="text-xs text-gray-500 truncate">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected && isAuthenticated ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className={connectionStatus.color}>{connectionStatus.text}</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Users className="w-4 h-4" />
              <span>{predictionParticipants.length}</span>
            </div>
          </div>
          {connectionError && (
            <div className="text-xs text-red-500 mt-1">{connectionError}</div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {predictionMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            predictionMessages.map((msg) => (
              <div key={msg.id} className="flex space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-green-600">
                    {msg.user.username?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {msg.user.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicators */}
          {predictionTypingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs">
                {predictionTypingUsers.length === 1
                  ? `${predictionTypingUsers[0].username} is typing...`
                  : `${predictionTypingUsers.length} people are typing...`}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onBlur={handleStopTyping}
              placeholder={
                !user ? 'Please log in to chat' :
                !isConnected || !isAuthenticated ? 'Connecting...' :
                'Type a message...'
              }
              disabled={!user || !isConnected || !isAuthenticated}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!message.trim() || !isConnected || !isAuthenticated}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {user && (
            <div className="text-xs text-gray-500 mt-1">
              {message.length}/500 characters
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
EOF

print_status "Updated Discussion component with better authentication handling"

print_info "Step 3: Building and testing the fixes..."

# Test the build
cd client
if npm run build; then
    print_status "Client build successful"
else
    echo -e "${RED}❌ Client build failed - please check build errors${NC}"
    exit 1
fi

cd ..

print_info "Step 4: Committing WebSocket authentication fixes..."

# Add and commit changes
git add .
git commit -m "fix: WebSocket authentication and connection flow

- Added isAuthenticated state to track authentication status
- Improved error handling and connection retry logic
- Fixed joinPrediction flow to wait for authentication
- Enhanced Discussion component with better status indicators
- Added automatic retry for authentication delays
- Improved logging for debugging WebSocket issues

Fixes: Cannot join prediction: socket not connected or user not authenticated"

print_status "WebSocket authentication fix committed"

echo ""
echo "🎯 WebSocket Authentication Fix Summary:"
echo "========================================"
echo ""
echo "✅ Fixed authentication flow:"
echo "   - Added isAuthenticated state tracking"
echo "   - Fixed joinPrediction to wait for authentication"
echo "   - Added retry logic for auth delays"
echo ""
echo "✅ Improved error handling:"
echo "   - Better connection status indicators"
echo "   - More detailed error messages"
echo "   - Enhanced debugging logs"
echo ""
echo "✅ Updated Discussion component:"
echo "   - Real-time connection status display"
echo "   - Better user feedback during connection"
echo "   - Proper state management"
echo ""
echo "🚀 Next Steps:"
echo "1. Deploy to dev branch: git push origin dev"
echo "2. Test WebSocket connection on dev.fanclubz.app"
echo "3. Verify authentication flow completes"
echo "4. Test prediction chat functionality"
echo ""
echo "🔍 Expected Results:"
echo "- ✅ Socket connects successfully"
echo "- ✅ Authentication completes"
echo "- ✅ Can join prediction chats"
echo "- ✅ No 'Cannot join prediction' errors"

EOF

# Make the script executable
chmod +x websocket-auth-fix.sh

print_status "Created comprehensive WebSocket authentication fix script"

# Run the fix
./websocket-auth-fix.sh
