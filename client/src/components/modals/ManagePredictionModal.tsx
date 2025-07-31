import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock, DollarSign, BarChart3, Settings, Trash2, Eye, Share2, Edit3 } from 'lucide-react';

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'participants', label: 'Participants', icon: Users }
  ];

  const handleClose = () => {
    onClose();
  };

  const handleEditPrediction = () => {
    console.log('Edit prediction:', prediction.id);
    // TODO: Implement edit functionality
    alert('Edit functionality will be implemented soon!');
  };

  const handleDeletePrediction = () => {
    console.log('Delete prediction:', prediction.id);
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to delete this prediction? This action cannot be undone.')) {
      // TODO: Implement delete functionality
      alert('Prediction deleted successfully!');
      onClose();
    }
  };

  const handleClosePrediction = () => {
    console.log('Close prediction early:', prediction.id);
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to close this prediction early? No new participants will be able to join.')) {
      // TODO: Implement close early functionality
      alert('Prediction closed early successfully!');
      onClose();
    }
  };

  const handleSharePrediction = () => {
    console.log('Share prediction:', prediction.id);
    // Open share modal or copy link
    navigator.clipboard.writeText(`https://fanclubz.com/prediction/${prediction.id}`);
    alert('Prediction link copied to clipboard!');
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Pool</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">₦{prediction.totalPool.toLocaleString()}</div>
          <div className="text-sm text-blue-600">Your cut: {prediction.yourCut}%</div>
        </div>
        
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Participants</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{prediction.participants}</div>
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
          <div className="text-xl font-bold text-purple-900">₦{(prediction.totalPool * prediction.yourCut / 100).toLocaleString()}</div>
          <div className="text-sm text-purple-600">Current projected</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">New participant joined</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">+₦50</span>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Large prediction placed</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">+₦200</span>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">3 new participants</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">+₦150</span>
          </div>
        </div>
      </div>
    </div>
  );

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
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Advanced Actions</h3>
        
        <div className="space-y-3">
          <motion.button
            onClick={handleEditPrediction}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
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
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
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
            className="w-full flex items-center justify-between p-3 text-left hover:bg-red-50 rounded-lg transition-colors"
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

  const ParticipantsTab = () => (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Participants Overview</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{prediction.participants}</div>
            <div className="text-sm text-gray-600">Total Participants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">₦{prediction.totalPool.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Pool</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600">
                A
              </div>
              <div>
                <p className="font-medium text-gray-900">@alice_trader</p>
                <p className="text-sm text-gray-500">Joined 2 hours ago</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">₦150</p>
              <p className="text-sm text-green-600">Yes</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center font-semibold text-green-600">
                B
              </div>
              <div>
                <p className="font-medium text-gray-900">@bet_master</p>
                <p className="text-sm text-gray-500">Joined 4 hours ago</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">₦200</p>
              <p className="text-sm text-red-600">No</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-semibold text-purple-600">
                C
              </div>
              <div>
                <p className="font-medium text-gray-900">@crypto_fan</p>
                <p className="text-sm text-gray-500">Joined 6 hours ago</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">₦75</p>
              <p className="text-sm text-green-600">Yes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
        </>
      )}
    </AnimatePresence>
  );
};

export default ManagePredictionModal;
