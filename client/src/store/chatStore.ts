import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

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
  messages: Record<string, ChatMessage[]>; // predictionId -> messages
  participants: Record<string, ChatParticipant[]>; // predictionId -> participants
  typingUsers: Record<string, TypingUser[]>; // predictionId -> typing users
  currentPredictionId: string | null;
  connectionError: string | null;
  messageHistory: Record<string, boolean>; // Track which predictions have loaded history
  
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
  messages: {},
  participants: {},
  typingUsers: {},
  currentPredictionId: null,
  connectionError: null,
  messageHistory: {},

  initializeSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      console.log('🔗 Socket already connected');
      return;
    }

    const { user } = useAuthStore.getState();
    if (!user) {
      console.warn('⚠️ Cannot initialize socket without authenticated user');
      return;
    }

    set({ isConnecting: true, connectionError: null });

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('🔗 Connecting to chat server:', serverUrl);
    
    const newSocket = io(serverUrl, {
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
    newSocket.on('connect', () => {
      console.log('🔗 Connected to chat server');
      set({ isConnected: true, isConnecting: false, connectionError: null });
      
      // Authenticate with the server
      newSocket.emit('authenticate', {
        userId: user.id,
        username: user.username || user.email?.split('@')[0] || 'Anonymous',
        avatar: user.avatar_url
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat server:', reason);
      set({ isConnected: false, isConnecting: false });
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        console.log('🔄 Server disconnected, attempting to reconnect...');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      set({ 
        isConnected: false, 
        isConnecting: false, 
        connectionError: 'Failed to connect to chat server'
      });
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      set({ isConnected: true, isConnecting: false, connectionError: null });
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    // Chat events
    newSocket.on('message_history', (messages: ChatMessage[]) => {
      const { currentPredictionId } = get();
      if (!currentPredictionId) return;

      console.log('📚 Received message history:', messages.length, 'messages');
      set(state => ({
        messages: {
          ...state.messages,
          [currentPredictionId]: messages
        },
        messageHistory: {
          ...state.messageHistory,
          [currentPredictionId]: true
        }
      }));
    });

    newSocket.on('new_message', (message: ChatMessage) => {
      console.log('📨 New message received:', message);
      const predictionId = message.prediction_id;
      
      set(state => {
        const existingMessages = state.messages[predictionId] || [];
        const messageExists = existingMessages.some(m => m.id === message.id);
        
        if (messageExists) return state; // Prevent duplicates
        
        return {
          messages: {
            ...state.messages,
            [predictionId]: [...existingMessages, message]
          }
        };
      });
    });

    newSocket.on('message_edited', (editedMessage: ChatMessage) => {
      console.log('✏️ Message edited:', editedMessage);
      const predictionId = editedMessage.prediction_id;
      
      set(state => {
        const messages = state.messages[predictionId] || [];
        const updatedMessages = messages.map(msg => 
          msg.id === editedMessage.id ? editedMessage : msg
        );
        
        return {
          messages: {
            ...state.messages,
            [predictionId]: updatedMessages
          }
        };
      });
    });

    newSocket.on('message_deleted', ({ messageId }: { messageId: string }) => {
      console.log('🗑️ Message deleted:', messageId);
      
      set(state => {
        const updatedMessages: Record<string, ChatMessage[]> = {};
        
        Object.keys(state.messages).forEach(predictionId => {
          updatedMessages[predictionId] = state.messages[predictionId].filter(
            msg => msg.id !== messageId
          );
        });
        
        return {
          messages: updatedMessages
        };
      });
    });

    newSocket.on('reaction_added', ({ messageId, userId, reactionType }: MessageReaction) => {
      console.log('👍 Reaction added:', { messageId, userId, reactionType });
      // Handle reaction updates if needed
    });

    newSocket.on('user_typing', ({ username }: { username: string }) => {
      const { currentPredictionId } = get();
      if (!currentPredictionId) return;

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.username === username) return; // Don't show own typing

      set(state => {
        const existingTypers = state.typingUsers[currentPredictionId] || [];
        const alreadyTyping = existingTypers.some(t => t.username === username);
        
        if (alreadyTyping) return state;
        
        return {
          typingUsers: {
            ...state.typingUsers,
            [currentPredictionId]: [
              ...existingTypers,
              { username, timestamp: Date.now() }
            ]
          }
        };
      });

      // Auto-remove typing indicator after 4 seconds
      setTimeout(() => {
        set(state => {
          const { currentPredictionId } = get();
          if (!currentPredictionId) return state;
          
          return {
            typingUsers: {
              ...state.typingUsers,
              [currentPredictionId]: (state.typingUsers[currentPredictionId] || [])
                .filter(t => t.username !== username)
            }
          };
        });
      }, 4000);
    });

    newSocket.on('user_stop_typing', ({ username }: { username: string }) => {
      const { currentPredictionId } = get();
      if (!currentPredictionId) return;

      set(state => ({
        typingUsers: {
          ...state.typingUsers,
          [currentPredictionId]: (state.typingUsers[currentPredictionId] || [])
            .filter(t => t.username !== username)
        }
      }));
    });

    newSocket.on('participants_updated', (participants: ChatParticipant[]) => {
      const { currentPredictionId } = get();
      if (!currentPredictionId) return;

      set(state => ({
        participants: {
          ...state.participants,
          [currentPredictionId]: participants
        }
      }));
    });

    newSocket.on('user_joined', ({ userId, username }: { userId: string; username: string }) => {
      console.log('👋 User joined:', username);
    });

    newSocket.on('user_left', ({ userId, username }: { userId: string; username: string }) => {
      console.log('👋 User left:', username);
    });

    newSocket.on('error', ({ message }: { message: string }) => {
      console.error('❌ Chat error:', message);
      set({ connectionError: message });
    });

    newSocket.on('message_error', ({ error }: { error: string }) => {
      console.error('❌ Message error:', error);
      // Could show toast notification here
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
        currentPredictionId: null 
      });
    }
  },

  joinPrediction: (predictionId: string) => {
    const { socket } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !user) {
      console.warn('⚠️ Cannot join prediction: socket not connected or user not authenticated');
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
    const { socket } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !user || !content.trim()) {
      console.warn('⚠️ Cannot send message: invalid state');
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
    const { socket } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !user || !newContent.trim()) return;

    socket.emit('edit_message', {
      messageId,
      userId: user.id,
      newContent: newContent.trim()
    });
  },

  deleteMessage: (messageId: string) => {
    const { socket } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !user) return;

    socket.emit('delete_message', {
      messageId,
      userId: user.id
    });
  },

  addReaction: (messageId: string, reactionType: string) => {
    const { socket } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !user) return;

    socket.emit('add_reaction', {
      messageId,
      userId: user.id,
      reactionType
    });
  },

  startTyping: (predictionId: string) => {
    const { socket } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !user) return;

    socket.emit('typing_start', {
      predictionId,
      username: user.username || user.email?.split('@')[0] || 'Anonymous'
    });
  },

  stopTyping: (predictionId: string) => {
    const { socket } = get();
    const { user } = useAuthStore.getState();
    
    if (!socket?.connected || !user) return;

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
    // This would track unread messages in a real implementation
    // For now, return 0
    return 0;
  }
}));