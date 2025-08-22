import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock, DollarSign, BarChart3, Settings, Trash2, Eye, Share2, Edit3, CheckCircle } from 'lucide-react';
import { usePredictionStore, ActivityItem, Participant } from '../../store/predictionStore';
import { useToast } from '../../hooks/use-toast';
import { ConfirmationModal } from './ConfirmationModal';

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

  const { 
    updatePrediction, 
    deletePrediction, 
    closePrediction, 
    fetchPredictionActivity, 
    fetchPredictionParticipants 
  } = usePredictionStore();
  const { toast } = useToast();

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

  const loadPredictionData = async () => {
    setLoading(true);
    try {
      const [activity, participants] = await Promise.all([
        fetchPredictionActivity(String(prediction.id)),
        fetchPredictionParticipants(String(prediction.id))
      ]);
      
      setActivityData(activity);
      setParticipantData(participants);
    } catch (error) {
      console.error('Failed to load prediction data:', error);
      toast({
        title: "Error",
        description: "Failed to load prediction data. Using cached information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleEditPrediction = async () => {
    try {
      // For now, show a simple prompt for title editing
      const newTitle = prompt('Enter new title:', prediction.title);
      if (newTitle && newTitle !== prediction.title) {
        setLoading(true);
        await updatePrediction(String(prediction.id), { title: newTitle });
        toast({
          title: "Success",
          description: "Prediction updated successfully!",
          variant: "default"
        });
        onClose();
      }
    } catch (error) {
      console.error('Failed to update prediction:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update prediction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrediction = async () => {
    setShowDeleteConfirmation(true);
  };

  const handleClosePrediction = async () => {
    if (window.confirm('Are you sure you want to close this prediction early? No new participants will be able to join.')) {
      try {
        setLoading(true);
        await closePrediction(String(prediction.id));
        toast({
          title: "Success",
          description: "Prediction closed successfully!",
          variant: "default"
        });
        onClose();
      } catch (error) {
        console.error('Failed to close prediction:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to close prediction",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSharePrediction = () => {
    const predictionUrl = `${window.location.origin}/predictions/${prediction.id}`;
    navigator.clipboard.writeText(predictionUrl);
    toast({
      title: "Link Copied",
      description: "Prediction link copied to clipboard!",
      variant: "default"
    });
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      
      // Update prediction settings via API
      await updatePrediction(String(prediction.id), {
        is_private: !publicVisibility,
        // Add other settings as needed
      });
      
      toast({
        title: "Settings Saved",
        description: "Your prediction settings have been updated.",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const OverviewTab = () => {
    const totalPool = prediction.pool_total || prediction.totalPool || 0;
    const participantCount = prediction.participant_count || prediction.participants || 0;
    const creatorFee = prediction.creator_fee_percentage || prediction.yourCut || 3.5;
    const projectedEarnings = (totalPool * creatorFee) / 100;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total Pool</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">${totalPool.toLocaleString()}</div>
            <div className="text-sm text-blue-600">Your cut: {creatorFee}%</div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Participants</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{participantCount}</div>
            <div className="text-sm text-green-600">Active predictors</div>
          </div>
          
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Time Remaining</span>
            </div>
            <div className="text-xl font-bold text-amber-900">{prediction.timeRemaining}</div>
            <div className="text-sm text-amber-600">Until prediction closes</div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Your Earnings</span>
            </div>
            <div className="text-xl font-bold text-purple-900">${projectedEarnings.toLocaleString()}</div>
            <div className="text-sm text-purple-600">Current projected</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-500">Loading activity...</span>
              </div>
            ) : activityData.length > 0 ? (
              activityData.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'participant_joined' || activity.type === 'multiple_participants' 
                        ? 'bg-blue-100' 
                        : 'bg-green-100'
                    }`}>
                      {activity.type === 'participant_joined' || activity.type === 'multiple_participants' ? (
                        <Users className="w-4 h-4 text-blue-600" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                    </div>
                  </div>
                  {activity.amount && (
                    <span className="text-sm text-green-600 font-medium">+${activity.amount.toLocaleString()}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Prediction Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-close prediction</p>
              <p className="text-sm text-gray-500">Automatically close when time expires</p>
            </div>
            <div 
              className={`relative inline-block w-10 h-6 cursor-pointer transition-colors duration-200 rounded-full ${
                autoClose ? 'bg-green-500' : 'bg-gray-300'
              }`}
              onClick={() => setAutoClose(!autoClose)}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${
                autoClose ? 'transform translate-x-4' : 'transform translate-x-0'
              } mt-1 ml-1`}></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email notifications</p>
              <p className="text-sm text-gray-500">Get notified of new participants</p>
            </div>
            <div 
              className={`relative inline-block w-10 h-6 cursor-pointer transition-colors duration-200 rounded-full ${
                emailNotifications ? 'bg-green-500' : 'bg-gray-300'
              }`}
              onClick={() => setEmailNotifications(!emailNotifications)}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${
                emailNotifications ? 'transform translate-x-4' : 'transform translate-x-0'
              } mt-1 ml-1`}></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Public visibility</p>
              <p className="text-sm text-gray-500">Show in public prediction feeds</p>
            </div>
            <div 
              className={`relative inline-block w-10 h-6 cursor-pointer transition-colors duration-200 rounded-full ${
                publicVisibility ? 'bg-green-500' : 'bg-gray-300'
              }`}
              onClick={() => setPublicVisibility(!publicVisibility)}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${
                publicVisibility ? 'transform translate-x-4' : 'transform translate-x-0'
              } mt-1 ml-1`}></div>
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <motion.button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {savingSettings ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Save Settings
              </>
            )}
          </motion.button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Advanced Actions</h3>
        
        <div className="space-y-3">
          <motion.button
            onClick={handleEditPrediction}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              <Edit3 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Edit prediction</p>
                <p className="text-sm text-gray-500">Modify title, description, or settings</p>
              </div>
            </div>
          </motion.button>
          
          <motion.button
            onClick={handleClosePrediction}
            disabled={loading || prediction.status !== 'open'}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-gray-900">Close early</p>
                <p className="text-sm text-gray-500">Stop accepting new participants</p>
              </div>
            </div>
          </motion.button>
          
          <motion.button
            onClick={handleDeletePrediction}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Delete prediction</p>
                <p className="text-sm text-red-600">Permanently remove this prediction</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );

  const ParticipantsTab = () => {
    const participantCount = prediction.participant_count || prediction.participants || 0;
    const totalPool = prediction.pool_total || prediction.totalPool || 0;

    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Participants Overview</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{participantCount}</div>
              <div className="text-sm text-gray-600">Total Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalPool.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Pool</div>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-500">Loading participants...</span>
              </div>
            ) : participantData.length > 0 ? (
              participantData.map((participant, index) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      index === 0 ? 'bg-blue-100 text-blue-600' :
                      index === 1 ? 'bg-green-100 text-green-600' :
                      index === 2 ? 'bg-purple-100 text-purple-600' :
                      index === 3 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">@{participant.username}</p>
                      <p className="text-sm text-gray-500">Joined {participant.timeAgo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${participant.amount.toLocaleString()}</p>
                    <p className={`text-sm ${participant.option === 'Yes' ? 'text-green-600' : 'text-red-600'}`}>
                      {participant.option}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No participants yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 truncate">
                    Manage Prediction
                  </h2>
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {prediction.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <motion.button
                    onClick={handleSharePrediction}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Share2 className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'settings' && <SettingsTab />}
                {activeTab === 'participants' && <ParticipantsTab />}
              </div>
            </div>
          </motion.div>

          {/* Delete Confirmation */}
          <ConfirmationModal
            isOpen={showDeleteConfirmation}
            onClose={() => setShowDeleteConfirmation(false)}
            onConfirm={async () => {
              try {
                setConfirmLoading(true);
                await deletePrediction(String(prediction.id));
                toast({
                  title: 'Prediction deleted',
                  description: 'Removed from Discover and My Bets. Lists refreshed.',
                  variant: 'default',
                });
                setShowDeleteConfirmation(false);
                onClose();
              } catch (error) {
                console.error('Failed to delete prediction:', error);
                toast({
                  title: 'Delete failed',
                  description: error instanceof Error ? error.message : 'Please try again.',
                  variant: 'destructive',
                });
              } finally {
                setConfirmLoading(false);
              }
            }}
            title="Delete prediction?"
            message="This action cannot be undone. The prediction will be removed from public lists."
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            isLoading={confirmLoading}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default ManagePredictionModal;
