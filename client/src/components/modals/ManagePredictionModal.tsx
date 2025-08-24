import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock, DollarSign, BarChart3, Settings, Trash2, Eye, Share2, Edit3, CheckCircle, Loader2, Gavel, AlertTriangle } from 'lucide-react';
import { usePredictionStore, ActivityItem, Participant } from '../../store/predictionStore';
import { useToast } from '../../hooks/use-toast';
import { useAuthStore } from '../../store/authStore';
import { ConfirmationModal } from './ConfirmationModal';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../../config';
import SettlementModal from './SettlementModal';
import DisputeResolutionModal from './DisputeResolutionModal';

interface ManagePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: {
    id: number | string;
    title: string;
    category: string;
    totalPool: number;
    participants: number;
    timeRemaining: string;
    yourCut: number;
    status: string;
    description?: string;
    pool_total?: number;
    participant_count?: number;
    creator_fee_percentage?: number;
    entry_deadline?: string;
    options?: any[];
  };
}

const ManagePredictionModal: React.FC<ManagePredictionModalProps> = ({
  isOpen,
  onClose,
  prediction
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [publicVisibility, setPublicVisibility] = useState(true);
  const [autoClose, setAutoClose] = useState(true);
  const [activityData, setActivityData] = useState<ActivityItem[]>([]);
  const [participantData, setParticipantData] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDisputeResolution, setShowDisputeResolution] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [predictionData, setPredictionData] = useState(prediction);

  // Update predictionData when prediction prop changes
  useEffect(() => {
    setPredictionData(prediction);
  }, [prediction]);

  const { 
    updatePrediction, 
    deletePrediction, 
    closePrediction, 
    fetchPredictionActivity, 
    fetchPredictionParticipants,
    fetchPredictionById,
    refreshPredictions,
    fetchUserCreatedPredictions,
    fetchUserPredictionEntries
  } = usePredictionStore();
  
  const { user } = useAuthStore();

  // Helper function to determine if prediction can be settled
  const canSettle = (pred: any) => {
    // Can settle if prediction is closed, ended, or if it's past the deadline
    if (pred.status === 'closed' || pred.status === 'ended') return true;
    
    // Check if deadline has passed for open predictions
    const deadline = pred.entry_deadline || pred.timeRemaining;
    if (deadline) {
      if (typeof deadline === 'string' && deadline.includes('Ended')) return true;
      if (pred.entry_deadline) {
        const isPastDeadline = new Date(pred.entry_deadline) <= new Date();
        return pred.status === 'open' && isPastDeadline;
      }
    }
    
    return false;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'participants', label: 'Participants', icon: Users }
  ];

  // Load real data when modal opens
  useEffect(() => {
    if (isOpen && prediction.id) {
      loadPredictionData();
    }
  }, [isOpen, prediction.id]);

  const loadPredictionData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading prediction data for modal:', prediction.id);
      
      // Ensure we have the full prediction data with options
      const fullPrediction = await fetchPredictionById(String(prediction.id));
      
      if (fullPrediction?.options?.length) {
        console.log('🔄 ManagePredictionModal: Updated prediction with', fullPrediction.options.length, 'options');
        // Force update the prediction object with all data from API
        Object.assign(prediction, fullPrediction);
        // Update state to force re-render of all components
        setPredictionData({ ...fullPrediction });
      } else {
        console.warn('⚠️ ManagePredictionModal: No options found for prediction:', prediction.id);
        // Try to fetch again with a delay
        setTimeout(async () => {
          const retryPrediction = await fetchPredictionById(String(prediction.id));
          if (retryPrediction?.options?.length) {
            console.log('🔄 Retry successful: Found', retryPrediction.options.length, 'options');
            Object.assign(prediction, retryPrediction);
            setPredictionData({ ...retryPrediction });
          }
        }, 1000);
      }
      
      const [activity, participants] = await Promise.all([
        fetchPredictionActivity(String(prediction.id)).catch(err => {
          console.warn('Failed to fetch activity:', err);
          return [];
        }),
        fetchPredictionParticipants(String(prediction.id)).catch(err => {
          console.warn('Failed to fetch participants:', err);
          return [];
        })
      ]);
      
      setActivityData(activity);
      setParticipantData(participants);
      console.log('✅ Modal data loaded successfully');
    } catch (error) {
      console.error('Failed to load prediction data:', error);
      toast.error('Failed to load prediction data. Using cached information.');
    } finally {
      setLoading(false);
    }
  }, [prediction.id, fetchPredictionActivity, fetchPredictionParticipants, fetchPredictionById]);

  // Comprehensive data refresh after any operation
  const refreshAllData = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 Refreshing all prediction data...');
      
      await Promise.all([
        refreshPredictions(true), // Force refresh main predictions
        fetchUserCreatedPredictions(user.id), // Refresh user's created predictions
        fetchUserPredictionEntries(user.id), // Refresh user's prediction entries
        loadPredictionData() // Refresh modal-specific data
      ]);
      
      console.log('✅ All prediction data refreshed');
    } catch (error) {
      console.error('❌ Error refreshing prediction data:', error);
    }
  }, [user?.id, refreshPredictions, fetchUserCreatedPredictions, fetchUserPredictionEntries, loadPredictionData]);

  const handleClose = useCallback(async () => {
    console.log('❌ Closing modal and triggering data refresh');
    
    // Trigger a comprehensive refresh before closing
    await refreshAllData();
    
    // Small delay to ensure state updates are processed
    setTimeout(() => {
    onClose();
    }, 100);
  }, [onClose, refreshAllData]);

  const handleEditPrediction = () => {
    setEditTitle(prediction.title);
    setShowEditModal(true);
  };

  const confirmEditPrediction = async () => {
    if (!editTitle.trim() || editTitle === prediction.title) {
      setShowEditModal(false);
      return;
    }

    try {
      setUpdating(true);
      console.log('🔧 Updating prediction title:', prediction.id);
      
      await updatePrediction(String(prediction.id), { title: editTitle.trim() });
      
      // Refresh all data after successful update
      await refreshAllData();
      
      toast.success('Prediction updated successfully!');
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update prediction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update prediction');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePrediction = async () => {
    setShowDeleteConfirmation(true);
  };

  const handleClosePrediction = () => {
    setShowCloseModal(true);
  };

  const confirmClosePrediction = async () => {
    try {
      setUpdating(true);
      console.log('🔒 Closing prediction:', prediction.id);
      
      await closePrediction(String(prediction.id));
      
      // Refresh all data after successful close
      await refreshAllData();
      
      // Update the prediction object to reflect the new status
      Object.assign(prediction, { status: 'closed' });
      
      toast.success('Prediction closed successfully! You can now settle it.');
      setShowCloseModal(false);
      // Don't close the modal - let user access settlement
    } catch (error) {
      console.error('Failed to close prediction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to close prediction');
    } finally {
      setUpdating(false);
    }
  };

  const handleSharePrediction = async () => {
    try {
      const predictionUrl = `${window.location.origin}/predictions/${prediction.id}`;
      const shareText = `Check out this prediction: ${prediction.title}`;
      
      // Try native sharing first (mobile devices)
      if (navigator.share) {
        try {
          await navigator.share({
            title: prediction.title,
            text: shareText,
            url: predictionUrl,
          });
          return;
        } catch (shareError) {
          // User cancelled or sharing failed, fall back to clipboard
          console.log('Native sharing cancelled or failed:', shareError);
        }
      }
      
      // Fallback to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${predictionUrl}`);
        toast.success('Link copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = `${shareText}\n${predictionUrl}`;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('Link copied to clipboard!');
        } catch (execError) {
          toast.error('Failed to copy link. Please copy manually.');
          console.error('execCommand failed:', execError);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Error sharing prediction:', error);
      toast.error('Failed to share prediction');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      console.log('⚙️ Saving prediction settings:', prediction.id);
      
      // Update prediction settings via API
      await updatePrediction(String(prediction.id), {
        is_private: !publicVisibility,
        // Add other settings as needed
      });
      
      // Refresh data after successful settings update
      await refreshAllData();
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const confirmDeletePrediction = async () => {
    try {
      setConfirmLoading(true);
      console.log('🗑️ Deleting prediction:', prediction.id);
      
      await deletePrediction(String(prediction.id));
      
      // Refresh all data after successful deletion
      await refreshAllData();
      
      toast.success('Prediction deleted successfully!');
      setShowDeleteConfirmation(false);
      handleClose();
    } catch (error) {
      console.error('Failed to delete prediction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete prediction');
    } finally {
      setConfirmLoading(false);
    }
  };

  const OverviewTab = () => {
    const totalPool = prediction.pool_total || prediction.totalPool || 0;
    const participantCount = prediction.participant_count || prediction.participants || 0;
    const creatorFee = prediction.creator_fee_percentage || prediction.yourCut || 0;
    const estimatedEarnings = (totalPool * creatorFee) / 100;

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Total Pool</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${totalPool.toLocaleString()}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Participants</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{participantCount}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Your Cut</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{creatorFee}%</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Est. Earnings</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${estimatedEarnings.toLocaleString()}</p>
          </div>
        </div>

        {/* Action Buttons - Redesigned with better spacing and UX */}
        <div className="space-y-4">
          {/* Primary Actions Row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              onClick={handleEditPrediction}
              disabled={updating || loading}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: updating || loading ? 1 : 1.02 }}
              whileTap={{ scale: updating || loading ? 1 : 0.98 }}
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit3 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              <span>Edit Details</span>
            </motion.button>

            <motion.button
              onClick={handleSharePrediction}
              disabled={updating || loading}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: updating || loading ? 1 : 1.02 }}
              whileTap={{ scale: updating || loading ? 1 : 0.98 }}
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Share</span>
            </motion.button>
          </div>

          {/* Secondary Actions Row */}
          <div className="flex gap-4">
            <motion.button
              onClick={handleClosePrediction}
              disabled={updating || loading || prediction.status !== 'open'}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold shadow-lg transition-all duration-200 group ${
                prediction.status !== 'open' 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-xl'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={{ scale: (updating || loading || prediction.status !== 'open') ? 1 : 1.02 }}
              whileTap={{ scale: (updating || loading || prediction.status !== 'open') ? 1 : 0.98 }}
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              <span>{prediction.status === 'open' ? 'Close Early' : 'Already Closed'}</span>
            </motion.button>

            {/* Settle Button - Show for closed predictions or ended predictions */}
            <motion.button
              onClick={() => setShowSettlementModal(true)}
              disabled={updating || loading || !canSettle(prediction)}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group border-2 border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300/30"
              whileHover={{ scale: (updating || loading || !canSettle(prediction)) ? 1 : 1.02 }}
              whileTap={{ scale: (updating || loading || !canSettle(prediction)) ? 1 : 0.98 }}
            >
              <Gavel className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Settle</span>
            </motion.button>
          </div>
        </div>

        {/* Dispute Management - Show if prediction has disputes */}
        {prediction.status === 'disputed' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900">⚠️ Settlement Disputed</h3>
                <p className="text-red-700">Participants have disputed your settlement. Review and resolve.</p>
              </div>
            </div>
            <motion.button
              onClick={() => setShowDisputeResolution(true)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🔍 Manage Disputes
            </motion.button>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
            {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading activity...</span>
              </div>
            ) : activityData.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activityData.map((activity, index) => (
                <div key={`activity-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-semibold text-emerald-600">
                      ${activity.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
            ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No activity yet</p>
              </div>
            )}
        </div>
      </div>
    );
  };

  const SettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prediction Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Public Visibility</h4>
              <p className="text-sm text-gray-500">Allow anyone to find and join this prediction</p>
            </div>
            <button
              onClick={() => setPublicVisibility(!publicVisibility)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                publicVisibility ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  publicVisibility ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-500">Receive updates about this prediction via email</p>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailNotifications ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Auto Close</h4>
              <p className="text-sm text-gray-500">Automatically close when deadline is reached</p>
            </div>
            <button
              onClick={() => setAutoClose(!autoClose)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoClose ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoClose ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            </div>
          </div>
        </div>

      <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-t border-gray-100 p-4 flex items-center justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          <span>Save Settings</span>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2">Delete Prediction</h4>
          <p className="text-sm text-red-700 mb-4">
            This action cannot be undone. This will permanently delete the prediction and all associated data.
          </p>
          <button
            onClick={handleDeletePrediction}
            disabled={updating || loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Prediction
          </button>
        </div>
      </div>
    </div>
  );

  const ParticipantsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Participants ({participantData.length})
        </h3>
        
            {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading participants...</span>
              </div>
            ) : participantData.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {participantData.map((participant, index) => (
              <div key={`participant-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600">
                      {participant.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">@{participant.username}</p>
                    <p className="text-xs text-gray-500">
                      Chose: {participant.option} • {participant.timeAgo}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  ${participant.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No participants yet</p>
          </div>
        )}
        </div>
      </div>
    );

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Manage Prediction</h2>
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">{prediction.title}</p>
                </div>
              <button
                    onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              </div>

            {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
            <div className="p-6 pb-40 max-h-[calc(90vh-200px)] overflow-y-auto" style={{ paddingBottom: 'max(10rem, env(safe-area-inset-bottom))' }}>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'settings' && <SettingsTab />}
                {activeTab === 'participants' && <ParticipantsTab />}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          onConfirm={confirmDeletePrediction}
          title="Delete Prediction"
          message="Are you sure you want to delete this prediction? This action cannot be undone and all participant data will be lost."
          confirmText="Delete"
          variant="danger"
          isLoading={confirmLoading}
        />
      )}

      {/* Edit Title Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Prediction Title</h3>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter new title..."
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={confirmEditPrediction}
                disabled={updating || !editTitle.trim() || editTitle === prediction.title}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Close Early Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Close Prediction Early</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to close this prediction early? No new participants will be able to join once closed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={confirmClosePrediction}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Closing...' : 'Close Early'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettlementModal && (
        <SettlementModal
          isOpen={showSettlementModal}
          onClose={() => setShowSettlementModal(false)}
          prediction={{
            ...predictionData,
            id: String(predictionData.id),
            creator_id: user?.id || '',
            type: 'multi_outcome' as const,
            stake_min: 1,
            settlement_method: 'manual' as const,
            is_private: false,
            platform_fee_percentage: 2.5,
            club_id: undefined,
            image_url: undefined,
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            creator: {
              id: user?.id || '',
              username: user?.username || '',
              full_name: user?.full_name || '',
              avatar_url: user?.avatar_url || null
            },
            options: prediction.options || [],
            pool_total: prediction.pool_total || prediction.totalPool || 0,
            participant_count: prediction.participant_count || prediction.participants || 0,
            entry_deadline: prediction.entry_deadline || new Date().toISOString()
          } as any}
          onSettlementComplete={refreshAllData}
        />
      )}

      {/* Dispute Resolution Modal */}
      {showDisputeResolution && (
        <DisputeResolutionModal
          isOpen={showDisputeResolution}
          onClose={() => setShowDisputeResolution(false)}
          predictionId={String(prediction.id)}
          predictionTitle={prediction.title}
          onResolutionComplete={refreshAllData}
        />
      )}
    </>
  );
};

export default ManagePredictionModal; 