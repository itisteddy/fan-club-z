import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock, DollarSign, BarChart3, Settings, Trash2, Eye, Share2, Edit3, CheckCircle, Loader2 } from 'lucide-react';
import { usePredictionStore, ActivityItem, Participant } from '../../store/predictionStore';
import { useToast } from '../../hooks/use-toast';
import { useAuthStore } from '../../store/authStore';
import { ConfirmationModal } from './ConfirmationModal';
import { toast } from 'react-hot-toast';

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

  const { 
    updatePrediction, 
    deletePrediction, 
    closePrediction, 
    fetchPredictionActivity, 
    fetchPredictionParticipants,
    refreshPredictions,
    fetchUserCreatedPredictions,
    fetchUserPredictionEntries
  } = usePredictionStore();
  
  const { user } = useAuthStore();

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
  }, [prediction.id, fetchPredictionActivity, fetchPredictionParticipants]);

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

  const handleEditPrediction = async () => {
    try {
      // For now, show a simple prompt for title editing
      const newTitle = prompt('Enter new title:', prediction.title);
      if (newTitle && newTitle !== prediction.title) {
        setUpdating(true);
        console.log('🔧 Updating prediction title:', prediction.id);
        
        await updatePrediction(String(prediction.id), { title: newTitle });
        
        // Refresh all data after successful update
        await refreshAllData();
        
        toast.success('Prediction updated successfully!');
        handleClose();
      }
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

  const handleClosePrediction = async () => {
    if (window.confirm('Are you sure you want to close this prediction early? No new participants will be able to join.')) {
      try {
        setUpdating(true);
        console.log('🔒 Closing prediction:', prediction.id);
        
        await closePrediction(String(prediction.id));
        
        // Refresh all data after successful close
        await refreshAllData();
        
        toast.success('Prediction closed successfully!');
        handleClose();
      } catch (error) {
        console.error('Failed to close prediction:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to close prediction');
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleSharePrediction = () => {
    const predictionUrl = `${window.location.origin}/prediction/${prediction.id}`;
    navigator.clipboard.writeText(predictionUrl);
    toast.success('Link copied to clipboard!');
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
              <DollarSign className="w-4 h-4 text-green-600" />
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
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Est. Earnings</span>
            </div>
            <p className="text-2xl font-bold text-green-600">${estimatedEarnings.toLocaleString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleEditPrediction}
            disabled={updating || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
            Edit
          </button>
          
          <button
            onClick={handleClosePrediction}
            disabled={updating || loading || prediction.status !== 'open'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Close Early
          </button>
          
          <button
            onClick={handleSharePrediction}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

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
                    <span className="text-sm font-semibold text-green-600">
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

      <div className="flex gap-3">
        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Save Settings
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
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
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
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
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
    </>
  );
};

export default ManagePredictionModal;