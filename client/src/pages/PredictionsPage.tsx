import React, { useState } from 'react';
import { TrendingUp, Clock, Users, Trophy, Target, Activity, CheckCircle, XCircle, AlertCircle, BarChart3, Star, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export const PredictionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'created' | 'completed'>('active');

  const tabs = [
    { id: 'active', label: 'Active', count: 12, icon: Activity },
    { id: 'created', label: 'Created', count: 8, icon: Star },
    { id: 'completed', label: 'Completed', count: 24, icon: CheckCircle },
  ];

  const activePredictions = [
    {
      id: '1',
      title: 'Will Bitcoin reach $100k by end of 2024?',
      creator: 'CryptoGuru',
      category: 'crypto',
      position: { option: 'Yes', amount: 5000, stake: 2500 },
      currentOdds: 1.8,
      potentialReturn: 4500,
      timeLeft: '12d 5h',
      participants: 234,
      status: 'winning' as const,
      confidence: 78
    },
    {
      id: '2',
      title: 'Will Arsenal finish in top 4 this season?',
      creator: 'FootballFan',
      category: 'sports',
      position: { option: 'Yes', amount: 3000, stake: 1500 },
      currentOdds: 2.1,
      potentialReturn: 3150,
      timeLeft: '45d 12h',
      participants: 156,
      status: 'losing' as const,
      confidence: 42
    },
    {
      id: '3',
      title: 'Who will win the next Nigerian election?',
      creator: 'PoliticsWatcher',
      category: 'politics',
      position: { option: 'Candidate A', amount: 8000, stake: 4000 },
      currentOdds: 1.6,
      potentialReturn: 6400,
      timeLeft: '89d 3h',
      participants: 445,
      status: 'neutral' as const,
      confidence: 65
    }
  ];

  const createdPredictions = [
    {
      id: '4',
      title: 'Will it rain in Lagos next week?',
      category: 'weather',
      totalPool: 15000,
      participants: 89,
      status: 'open' as const,
      timeLeft: '6d 14h',
      engagement: { likes: 34, comments: 12, shares: 8 }
    },
    {
      id: '5',
      title: 'Next Big Brother Naija winner?',
      category: 'entertainment',
      totalPool: 45000,
      participants: 278,
      status: 'open' as const,
      timeLeft: '23d 8h',
      engagement: { likes: 156, comments: 89, shares: 34 }
    }
  ];

  const completedPredictions = [
    {
      id: '6',
      title: 'World Cup 2022 Winner?',
      result: 'won',
      payout: 12500,
      originalStake: 5000,
      roi: 150,
      settledDate: '2022-12-18'
    },
    {
      id: '7',
      title: 'US Elections 2024 Winner?',
      result: 'lost',
      payout: 0,
      originalStake: 3000,
      roi: -100,
      settledDate: '2024-11-06'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'active':
        return (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {activePredictions.map((prediction, index) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <ActivePredictionCard prediction={prediction} />
              </motion.div>
            ))}
          </motion.div>
        );
      case 'created':
        return (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {createdPredictions.map((prediction, index) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <CreatedPredictionCard prediction={prediction} />
              </motion.div>
            ))}
          </motion.div>
        );
      case 'completed':
        return (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {completedPredictions.map((prediction, index) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <CompletedPredictionCard prediction={prediction} />
              </motion.div>
            ))}
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="px-6 pt-24 pb-24 space-y-8 animate-fade-in">
      {/* Enhanced Header Section */}
      <motion.section 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Enhanced Stats Overview */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-green via-primary-green/90 to-deep-green p-8 text-white shadow-level-2">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/10" />
          </div>
          
          <motion.div 
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="body-lg font-bold text-white">Portfolio Overview</h2>
                <p className="caption text-white/80">Your prediction performance</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="live-counter text-3xl font-bold mb-2 text-white">$12.5K</div>
                <div className="caption text-white/80">Total Invested</div>
              </motion.div>
              <div className="w-px bg-white/20" />
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="live-counter text-3xl font-bold mb-2 text-white">$18.2K</div>
                <div className="caption text-white/80">Potential Return</div>
              </motion.div>
              <div className="w-px bg-white/20" />
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-3xl font-bold mb-2 text-white">+45%</div>
                <div className="caption text-white/80">ROI</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Enhanced Tab Navigation */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <div className="flex space-x-2 bg-cool-gray-100 p-2 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-green shadow-sm'
                    : 'text-cool-gray-600 hover:text-cool-gray-900'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  activeTab === tab.id 
                    ? 'bg-primary-green text-white' 
                    : 'bg-cool-gray-200 text-cool-gray-600'
                }`}>
                  {tab.count}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* Content */}
      <section>
        {renderContent()}
      </section>
    </div>
  );
};

// Enhanced Active Prediction Card Component
const ActivePredictionCard: React.FC<{ prediction: any }> = ({ prediction }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'winning': return 'text-success-green bg-green-50 border-success-green';
      case 'losing': return 'text-coral bg-red-50 border-coral';
      case 'neutral': return 'text-amber bg-yellow-50 border-amber';
      default: return 'text-cool-gray-600 bg-cool-gray-50 border-cool-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'winning': return <TrendingUp className="w-4 h-4" />;
      case 'losing': return <TrendingDown className="w-4 h-4" />;
      case 'neutral': return <Activity className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div 
      className="card-level-1 p-6 space-y-6 relative overflow-hidden group"
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Subtle background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white to-cool-gray-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="body-lg font-semibold text-cool-gray-900 line-clamp-2 mb-3">
              {prediction.title}
            </h3>
            <div className="flex items-center gap-2 text-cool-gray-600">
              <span className="caption">by {prediction.creator}</span>
              <span className="w-1 h-1 bg-cool-gray-300 rounded-full"></span>
              <span className="caption">{prediction.participants} participants</span>
            </div>
          </div>
          <motion.div 
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getStatusColor(prediction.status)}`}
            whileHover={{ scale: 1.05 }}
          >
            {getStatusIcon(prediction.status)}
            <span className="caption font-semibold capitalize">{prediction.status}</span>
          </motion.div>
        </div>

        {/* Enhanced Position Details */}
        <div className="bg-gradient-to-br from-cool-gray-50 to-cool-gray-100/50 rounded-2xl p-6 space-y-4 border border-cool-gray-100">
          <div className="flex items-center justify-between">
            <span className="body-small text-cool-gray-600">Your Position</span>
            <span className="body-small font-semibold text-cool-gray-900 px-3 py-1 bg-white rounded-lg shadow-sm">
              {prediction.position.option}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="caption text-cool-gray-600 mb-2">Invested</div>
              <div className="body-md font-bold text-cool-gray-900">
                {formatCurrency(prediction.position.stake)}
              </div>
            </div>
            <div className="text-center">
              <div className="caption text-cool-gray-600 mb-2">Potential Return</div>
              <div className="body-md font-bold text-success-green">
                {formatCurrency(prediction.potentialReturn)}
              </div>
            </div>
          </div>

          {/* Enhanced Confidence Meter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="caption text-cool-gray-600">Confidence Level</span>
              <span className="caption font-semibold text-cool-gray-900">{prediction.confidence}%</span>
            </div>
            <div className="progress-linear">
              <motion.div 
                className="progress-linear-fill" 
                initial={{ width: 0 }}
                animate={{ width: `${prediction.confidence}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-cool-gray-600">
            <Clock className="w-4 h-4" />
            <span className="caption">{prediction.timeLeft} left</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-cool-gray-50 rounded-lg">
            <span className="caption text-cool-gray-600">Current odds:</span>
            <span className="body-small font-semibold text-cool-gray-900">
              {prediction.currentOdds}x
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Created Prediction Card Component
const CreatedPredictionCard: React.FC<{ prediction: any }> = ({ prediction }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div 
      className="card-level-1 p-6 space-y-6 relative overflow-hidden group"
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="body-lg font-semibold text-cool-gray-900 line-clamp-2 mb-3">
            {prediction.title}
          </h3>
          <div className="flex items-center gap-4 text-cool-gray-600 caption">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{prediction.participants} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{prediction.timeLeft}</span>
            </div>
          </div>
        </div>
        <div className="badge success">
          {prediction.status}
        </div>
      </div>

      {/* Enhanced Pool Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-green to-deep-green p-6 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 right-2 w-16 h-16 rounded-full bg-white/30" />
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="caption opacity-90 mb-2">Total Pool</div>
            <div className="display-small font-bold">{formatCurrency(prediction.totalPool)}</div>
          </div>
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Trophy className="w-8 h-8 opacity-80" />
          </motion.div>
        </div>
      </div>

      {/* Enhanced Engagement Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Likes', value: prediction.engagement.likes, color: 'text-coral' },
          { label: 'Comments', value: prediction.engagement.comments, color: 'text-electric-blue' },
          { label: 'Shares', value: prediction.engagement.shares, color: 'text-purple' }
        ].map((stat, index) => (
          <motion.div 
            key={stat.label}
            className="text-center p-3 bg-cool-gray-50 rounded-xl"
            whileHover={{ scale: 1.05 }}
          >
            <div className={`body-md font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="caption text-cool-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button 
          className="btn-secondary flex-1"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          View Details
        </motion.button>
        <motion.button 
          className="btn-primary flex-1"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Manage
        </motion.button>
      </div>
    </motion.div>
  );
};

// Enhanced Completed Prediction Card Component
const CompletedPredictionCard: React.FC<{ prediction: any }> = ({ prediction }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isWin = prediction.result === 'won';

  return (
    <motion.div 
      className={`card-level-1 p-6 space-y-6 relative overflow-hidden border-l-4 ${
        isWin ? 'border-l-success-green bg-green-50/30' : 'border-l-coral bg-red-50/30'
      }`}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="body-lg font-semibold text-cool-gray-900 line-clamp-2 mb-3">
            {prediction.title}
          </h3>
          <div className="caption text-cool-gray-600">
            Settled on {formatDate(prediction.settledDate)}
          </div>
        </div>
        <motion.div 
          className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
            isWin ? 'bg-green-100 text-success-green' : 'bg-red-100 text-coral'
          }`}
          whileHover={{ scale: 1.05 }}
        >
          {isWin ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="caption font-semibold capitalize">{prediction.result}</span>
        </motion.div>
      </div>

      {/* Enhanced Result Details */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Staked', value: formatCurrency(prediction.originalStake), color: 'text-cool-gray-900' },
          { label: 'Payout', value: formatCurrency(prediction.payout), color: isWin ? 'text-success-green' : 'text-coral' },
          { label: 'ROI', value: `${prediction.roi > 0 ? '+' : ''}${prediction.roi}%`, color: prediction.roi > 0 ? 'text-success-green' : 'text-coral' }
        ].map((stat, index) => (
          <motion.div 
            key={stat.label}
            className="text-center p-4 bg-white rounded-xl shadow-sm"
            whileHover={{ scale: 1.05 }}
          >
            <div className={`body-md font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <div className="caption text-cool-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
