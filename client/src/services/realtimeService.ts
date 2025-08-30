import { supabase } from '../lib/supabase';
import { usePredictionStore } from '../store/predictionStore';
import { useUnifiedCommentStore } from '../store/unifiedCommentStore';
import { useLikeStore } from '../store/likeStore';
import toast from 'react-hot-toast';

export interface RealtimeUpdate {
  type: 'prediction_update' | 'comment_added' | 'like_toggled' | 'settlement_completed';
  data: any;
  timestamp: string;
}

class RealtimeService {
  private subscriptions: Map<string, any> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupConnection();
  }

  private setupConnection() {
    if (this.isConnected) return;

    console.log('🔗 Setting up real-time connection...');
    
    // Subscribe to prediction updates
    this.subscribeToPredictions();
    
    // Subscribe to comment updates
    this.subscribeToComments();
    
    // Subscribe to like updates
    this.subscribeToLikes();
    
    // Subscribe to settlement updates
    this.subscribeToSettlements();

    this.isConnected = true;
  }

  private subscribeToPredictions() {
    const subscription = supabase
      .channel('prediction_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions'
        },
        (payload) => {
          console.log('📊 Real-time prediction update:', payload);
          this.handlePredictionUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prediction_entries'
        },
        (payload) => {
          console.log('📊 Real-time prediction entry update:', payload);
          this.handlePredictionEntryUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('📊 Prediction subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0;
        }
      });

    this.subscriptions.set('predictions', subscription);
  }

  private subscribeToComments() {
    const subscription = supabase
      .channel('comment_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          console.log('💬 Real-time comment added:', payload);
          this.handleCommentAdded(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          console.log('💬 Real-time comment updated:', payload);
          this.handleCommentUpdated(payload);
        }
      )
      .subscribe((status) => {
        console.log('💬 Comment subscription status:', status);
      });

    this.subscriptions.set('comments', subscription);
  }

  private subscribeToLikes() {
    const subscription = supabase
      .channel('like_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prediction_likes'
        },
        (payload) => {
          console.log('❤️ Real-time like update:', payload);
          this.handleLikeUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('❤️ Like subscription status:', status);
      });

    this.subscriptions.set('likes', subscription);
  }

  private subscribeToSettlements() {
    const subscription = supabase
      .channel('settlement_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'predictions',
          filter: 'status=eq.settled'
        },
        (payload) => {
          console.log('🏆 Real-time settlement:', payload);
          this.handleSettlementUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('🏆 Settlement subscription status:', status);
      });

    this.subscriptions.set('settlements', subscription);
  }

  private handlePredictionUpdate(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'UPDATE') {
      // Update prediction in store
      const predictionStore = usePredictionStore.getState();
      predictionStore.updatePrediction(newRecord);
      
      // Show toast for significant changes
      if (newRecord.pool_total !== oldRecord.pool_total) {
        toast.success(`💰 Pool updated: $${newRecord.pool_total.toLocaleString()}`, {
          duration: 3000,
          position: 'top-center'
        });
      }
      
      if (newRecord.participant_count !== oldRecord.participant_count) {
        toast.success(`👥 ${newRecord.participant_count} participants now`, {
          duration: 3000,
          position: 'top-center'
        });
      }
    }
  }

  private handlePredictionEntryUpdate(payload: any) {
    const { eventType, new: newRecord } = payload;
    
    if (eventType === 'INSERT') {
      // New prediction entry - update counts
      const predictionStore = usePredictionStore.getState();
      predictionStore.refreshPrediction(newRecord.prediction_id);
      
      toast.success('🎯 New prediction placed!', {
        duration: 2000,
        position: 'top-center'
      });
    }
  }

  private handleCommentAdded(payload: any) {
    const { new: newComment } = payload;
    
    // Add comment to store
    const commentStore = useUnifiedCommentStore.getState();
    commentStore.addCommentFromRealtime(newComment);
    
    // Show toast notification
    toast.success(`💬 New comment from ${newComment.user?.username || 'Anonymous'}`, {
      duration: 3000,
      position: 'top-center'
    });
  }

  private handleCommentUpdated(payload: any) {
    const { new: updatedComment } = payload;
    
    // Update comment in store
    const commentStore = useUnifiedCommentStore.getState();
    commentStore.updateCommentFromRealtime(updatedComment);
  }

  private handleLikeUpdate(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Update like count in prediction store
    const predictionStore = usePredictionStore.getState();
    predictionStore.updatePredictionLikeCount(newRecord.prediction_id, eventType === 'INSERT' ? 1 : -1);
    
    // Update like store
    const likeStore = useLikeStore.getState();
    if (eventType === 'INSERT') {
      likeStore.addLikeFromRealtime(newRecord.prediction_id, newRecord.user_id);
    } else if (eventType === 'DELETE') {
      likeStore.removeLikeFromRealtime(newRecord.prediction_id, newRecord.user_id);
    }
  }

  private handleSettlementUpdate(payload: any) {
    const { new: settledPrediction } = payload;
    
    // Update prediction in store
    const predictionStore = usePredictionStore.getState();
    predictionStore.updatePrediction(settledPrediction);
    
    // Show settlement notification
    toast.success(`🏆 "${settledPrediction.title}" has been settled!`, {
      duration: 5000,
      position: 'top-center',
      icon: '🏆'
    });
  }

  public disconnect() {
    console.log('🔌 Disconnecting real-time service...');
    
    this.subscriptions.forEach((subscription, key) => {
      supabase.removeChannel(subscription);
      console.log(`🔌 Disconnected from ${key} channel`);
    });
    
    this.subscriptions.clear();
    this.isConnected = false;
  }

  public reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.disconnect();
      this.setupConnection();
      this.reconnectAttempts++;
    }, this.reconnectDelay * (this.reconnectAttempts + 1));
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService();

// Export for use in components
export const useRealtimeService = () => {
  return {
    disconnect: () => realtimeService.disconnect(),
    reconnect: () => realtimeService.reconnect(),
    getStatus: () => realtimeService.getConnectionStatus()
  };
};
