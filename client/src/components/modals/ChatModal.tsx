import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Smile, Paperclip, MoreVertical, Edit3, Trash2, Heart, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, ChatMessage } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictionId: string;
  predictionTitle: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  predictionId,
  predictionTitle
}) => {
  const [message, setMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const {
    initializeSocket,
    disconnectSocket,
    joinPrediction,
    leavePrediction,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    startTyping,
    stopTyping,
    getMessagesForPrediction,
    getTypingUsersForPrediction,
    isConnected,
    isConnecting,
    connectionError
  } = useChatStore();

  // Get real-time data from store
  const messages = getMessagesForPrediction(predictionId);
  const typingUsers = getTypingUsersForPrediction(predictionId);

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollToBottom(!isNearBottom);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      // Auto-scroll to bottom when new messages arrive
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = user && lastMessage.user_id === user.id;
      
      if (isOwnMessage || !showScrollToBottom) {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom, showScrollToBottom, user]);

  useEffect(() => {
    if (isOpen && user) {
      console.log('🎦 Chat modal opened for user:', user.username || user.email);
      
      // Initialize socket if not connected
      if (!isConnected && !isConnecting) {
        console.log('🔗 Initializing socket connection...');
        initializeSocket();
      }
      
      // Wait for connection before joining prediction
      if (isConnected) {
        console.log('✅ Socket connected, joining prediction:', predictionId);
        joinPrediction(predictionId);
      } else {
        console.log('⏳ Waiting for socket connection...');
        // Set up a listener for when connection is established
        const checkConnection = setInterval(() => {
          const currentState = useChatStore.getState();
          if (currentState.isConnected && !currentState.isConnecting) {
            console.log('✅ Socket connected (delayed), joining prediction:', predictionId);
            joinPrediction(predictionId);
            clearInterval(checkConnection);
          } else if (currentState.connectionError) {
            console.error('❌ Connection failed:', currentState.connectionError);
            clearInterval(checkConnection);
          }
        }, 500);
        
        // Clean up interval after 10 seconds
        const timeout = setTimeout(() => {
          clearInterval(checkConnection);
          console.warn('⏱️ Connection timeout - stopping connection attempts');
        }, 10000);
        
        return () => {
          clearInterval(checkConnection);
          clearTimeout(timeout);
        };
      }
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen, user, isConnected, isConnecting, predictionId, connectionError]);

  useEffect(() => {
    // Cleanup on unmount or when modal closes
    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
        setTypingTimer(null);
      }
      if (isOpen && isConnected) {
        console.log('👋 Leaving prediction on cleanup:', predictionId);
        leavePrediction(predictionId);
      }
    };
  }, [isOpen, isConnected, predictionId, typingTimer]);

  const handleSendMessage = useCallback(() => {
    if (!message.trim() || !user || !isConnected) return;

    sendMessage(predictionId, message);
    setMessage('');
    
    // Stop typing indicator
    if (typingTimer) {
      clearTimeout(typingTimer);
      setTypingTimer(null);
    }
    stopTyping(predictionId);
  }, [message, user, isConnected, predictionId, typingTimer]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (!user || !isConnected) return;

    // Handle typing indicators
    if (value.trim() && !typingTimer) {
      startTyping(predictionId);
    }

    // Clear existing timer
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    // Set new timer to stop typing after 2 seconds of inactivity
    const newTimer = setTimeout(() => {
      stopTyping(predictionId);
      setTypingTimer(null);
    }, 2000);

    setTypingTimer(newTimer);
  }, [user, isConnected, predictionId, typingTimer]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleSaveEdit();
      } else {
        handleSendMessage();
      }
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [editingMessageId, handleSendMessage]);

  const handleEditMessage = useCallback((msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
    setMessage(msg.content);
    inputRef.current?.focus();
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingMessageId || !message.trim()) return;
    
    editMessage(editingMessageId, message.trim());
    setEditingMessageId(null);
    setEditingContent('');
    setMessage('');
  }, [editingMessageId, message]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent('');
    setMessage('');
    inputRef.current?.focus();
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(messageId);
    }
  }, []);

  const handleReaction = useCallback((messageId: string, reactionType: string) => {
    addReaction(messageId, reactionType);
  }, []);

  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const isOwnMessage = useCallback((msg: ChatMessage) => {
    return user && msg.user_id === user.id;
  }, [user]);

  const handleClose = useCallback(() => {
    leavePrediction(predictionId);
    setMessage('');
    setEditingMessageId(null);
    setEditingContent('');
    onClose();
  }, [predictionId, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ height: '600px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              Discussion
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {predictionTitle}
            </p>
            {/* Connection status */}
            <div className="flex items-center gap-2 mt-1">
              {isConnecting && (
                <div className="flex items-center gap-1 text-xs text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  Connecting...
                </div>
              )}
              {isConnected && !isConnecting && (
                <div className="flex items-center gap-1 text-xs text-teal-600">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  Connected
                </div>
              )}
              {connectionError && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  Connection error
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            {/* Debug info (only in development) */}
            {import.meta.env.DEV && (
              <div className="text-xs text-gray-400 mr-2">
                {isConnecting ? 'Connecting...' : isConnected ? 'Online' : 'Offline'}
              </div>
            )}
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-2 relative" 
          style={{ height: 'calc(600px - 140px)' }}
          onScroll={handleScroll}
        >
          {/* Empty state */}
          {messages.length === 0 && isConnected && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Be the first to start the discussion!</p>
              </div>
            </div>
          )}

          {/* Connection error state */}
          {connectionError && !isConnected && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Connection failed</p>
                <p className="text-xs mb-2">{connectionError}</p>
                {!user ? (
                  <p className="text-xs text-gray-500">Please sign in to use chat</p>
                ) : (
                  <button 
                    onClick={() => {
                      console.log('🔄 Manual retry connection clicked');
                      initializeSocket();
                    }}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Retry connection'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Connecting state */}
          {isConnecting && !isConnected && !connectionError && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm">Connecting to chat...</p>
                <p className="text-xs">This may take a moment</p>
              </div>
            </div>
          )}

          {/* Messages list */}
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 mb-4 group ${isOwnMessage(msg) ? 'flex-row-reverse' : ''}`}
              >
                {!isOwnMessage(msg) && (
                  <div className="flex-shrink-0">
                    <img
                      src={
                        msg.user.avatar_url || 
                        `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face`
                      }
                      alt={msg.user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </div>
                )}
                
                <div className={`flex-1 min-w-0 ${isOwnMessage(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwnMessage(msg) && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{msg.user.username}</span>
                      <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  
                  <div className="relative">
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        msg.message_type === 'system' 
                          ? 'bg-gray-100 text-gray-600 text-center text-sm italic'
                          : isOwnMessage(msg)
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      {msg.edited_at && (
                        <span className="text-xs opacity-75 block mt-1">(edited)</span>
                      )}
                    </div>
                    
                    {/* Message actions for own messages */}
                    {isOwnMessage(msg) && msg.message_type !== 'system' && (
                      <div className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditMessage(msg)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit message"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reaction button for other messages */}
                    {!isOwnMessage(msg) && msg.message_type !== 'system' && (
                      <div className="absolute top-0 left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleReaction(msg.id, 'like')}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Like message"
                        >
                          <Heart className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isOwnMessage(msg) && (
                    <span className="text-xs text-gray-500 mt-1">{formatTime(msg.created_at)}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3 mb-4"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs">💬</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {typingUsers.map(t => t.username).join(', ')}
                  </span>
                  <span className="text-xs text-gray-500">typing...</span>
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md max-w-xs">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-20 right-4 w-8 h-8 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center text-sm"
            title="Scroll to bottom"
          >
            ↓
          </button>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          {editingMessageId && (
            <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-700">Editing message...</span>
              <button
                onClick={handleCancelEdit}
                className="text-blue-600 hover:text-blue-800"
                title="Cancel edit"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-3">
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={
                  editingMessageId ? "Edit your message..." :
                  isConnected ? "Type a message..." : 
                  isConnecting ? "Connecting..." : 
                  "Chat unavailable"
                }
                disabled={!isConnected || !user}
                className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={editingMessageId ? handleSaveEdit : handleSendMessage}
              disabled={!message.trim() || !isConnected || !user}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title={editingMessageId ? "Save changes" : "Send message"}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};