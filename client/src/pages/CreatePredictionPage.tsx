import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, X, Calendar, DollarSign, Users, Settings, Sparkles, Check } from 'lucide-react';
import { usePredictionStore } from '../stores/predictionStore';

interface PredictionOption {
  id: string;
  label: string;
}

interface CreatePredictionPageProps {
  onNavigateBack?: () => void;
}

const CreatePredictionPage: React.FC<CreatePredictionPageProps> = ({ onNavigateBack }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { createPrediction } = usePredictionStore();
  
  // Use individual state variables instead of one large object to prevent re-renders
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('binary');
  const [options, setOptions] = useState<PredictionOption[]>([
    { id: '1', label: 'Yes' },
    { id: '2', label: 'No' }
  ]);
  const [entryDeadline, setEntryDeadline] = useState('');
  const [stakeMin, setStakeMin] = useState('100');
  const [stakeMax, setStakeMax] = useState('10000');
  const [settlementMethod, setSettlementMethod] = useState('manual');
  const [isPrivate, setIsPrivate] = useState(false);

  const categories = [
    { id: 'sports', label: 'Sports', icon: '⚽', gradient: 'from-orange-500 to-red-500' },
    { id: 'politics', label: 'Politics', icon: '🏛️', gradient: 'from-blue-500 to-indigo-500' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬', gradient: 'from-purple-500 to-pink-500' },
    { id: 'crypto', label: 'Crypto', icon: '₿', gradient: 'from-yellow-500 to-orange-500' },
    { id: 'tech', label: 'Technology', icon: '💻', gradient: 'from-green-500 to-teal-500' },
    { id: 'custom', label: 'Custom', icon: '⚡', gradient: 'from-gray-500 to-gray-600' },
  ];

  const predictionTypes = [
    {
      id: 'binary',
      label: 'Yes/No',
      description: 'Simple binary outcome prediction',
      icon: '🎯'
    },
    {
      id: 'multiple',
      label: 'Multiple Choice',
      description: 'Multiple possible outcomes',
      icon: '🎲'
    },
    {
      id: 'range',
      label: 'Range',
      description: 'Predict within a numerical range',
      icon: '📊'
    }
  ];

  const addOption = useCallback(() => {
    const newId = (options.length + 1).toString();
    setOptions(prev => [...prev, { id: newId, label: '' }]);
  }, [options.length]);

  const removeOption = useCallback((id: string) => {
    setOptions(prev => prev.filter(option => option.id !== id));
  }, []);

  const updateOption = useCallback((id: string, label: string) => {
    setOptions(prev => prev.map(option =>
      option.id === id ? { ...option, label } : option
    ));
  }, []);

  const validateStep = useCallback((stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(title.trim() && category);
      case 2:
        return !!(type && options.every(opt => opt.label.trim()));
      case 3:
        return !!(entryDeadline && stakeMin);
      default:
        return true;
    }
  }, [title, category, type, options, entryDeadline, stakeMin]);

  const handleNext = useCallback(() => {
    if (validateStep(step) && step < 3) {
      setStep(step + 1);
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      // Navigate back to previous page
      if (onNavigateBack) {
        onNavigateBack();
      }
    }
  }, [step, onNavigateBack]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(3)) {
      alert('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Validate form data
      if (!title.trim()) {
        throw new Error('Title is required');
      }
      if (!category) {
        throw new Error('Category is required');
      }
      if (!entryDeadline) {
        throw new Error('Entry deadline is required');
      }
      
      // Ensure deadline is in the future
      const deadline = new Date(entryDeadline);
      if (deadline <= new Date()) {
        throw new Error('Entry deadline must be in the future');
      }

      // Prepare prediction data
      const predictionData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category,
        type: type as 'binary' | 'multi_outcome' | 'pool',
        options: options
          .filter(opt => opt.label.trim()) // Only include options with labels
          .map(opt => ({
            id: opt.id,
            label: opt.label.trim(),
            totalStaked: 0,
            currentOdds: 2.0
          })),
        entryDeadline: deadline,
        stakeMin: Math.max(1, parseFloat(stakeMin) || 100),
        stakeMax: stakeMax ? Math.max(parseFloat(stakeMin) || 100, parseFloat(stakeMax)) : undefined,
        settlementMethod: settlementMethod as 'auto' | 'manual',
        isPrivate: isPrivate
      };

      // Validate options
      if (predictionData.options.length < 2) {
        throw new Error('At least 2 prediction options are required');
      }

      console.log('Creating prediction with data:', predictionData);

      // Create the prediction (this is now async and saves to Supabase)
      await createPrediction(predictionData);
      
      console.log('Prediction created successfully!');
      setSubmitSuccess(true);
      
      // Navigate back after success
      setTimeout(() => {
        // Reset form
        setStep(1);
        setTitle('');
        setDescription('');
        setCategory('');
        setType('binary');
        setOptions([
          { id: '1', label: 'Yes' },
          { id: '2', label: 'No' }
        ]);
        setEntryDeadline('');
        setStakeMin('100');
        setStakeMax('10000');
        setSettlementMethod('manual');
        setIsPrivate(false);
        setSubmitSuccess(false);
        setIsSubmitting(false);
        
        // Navigate back
        if (onNavigateBack) {
          onNavigateBack();
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create prediction:', error);
      alert(error instanceof Error ? error.message : 'Failed to create prediction. Please try again.');
      setIsSubmitting(false);
    }
  }, [validateStep, title, category, entryDeadline, description, type, options, stakeMin, stakeMax, settlementMethod, isPrivate, createPrediction, onNavigateBack]);

  // Success View
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 text-center shadow-2xl border border-green-200"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check size={32} className="text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Prediction Created!</h2>
          <p className="text-gray-600 mb-4">Your prediction has been successfully created and is now live.</p>
          <div className="text-sm text-green-600 font-medium">Redirecting to main feed...</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-700 to-teal-600" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-purple-600/10" />
        
        {/* Animated elements */}
        <div className="absolute top-0 right-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 px-6 pt-14 pb-8">
          <div className="flex items-center gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft size={20} />
            </motion.button>
            
            <div>
              <h1 className="text-3xl font-bold text-white">Create Prediction</h1>
              <p className="text-green-100">Step {step} of 3</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/20 rounded-full h-2 mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-4 pb-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-2xl p-6"
        >
          <AnimatePresence mode="wait" initial={false}>
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
                    <p className="text-gray-600">Tell us about your prediction</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prediction Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Will Bitcoin reach $100,000 by end of 2024?"
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide additional context and rules for your prediction..."
                      rows={4}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((cat) => (
                        <motion.button
                          key={cat.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setCategory(cat.id)}
                          className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                            category === cat.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 bg-white hover:border-green-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-r ${cat.gradient} rounded-xl flex items-center justify-center text-white text-lg`}>
                              {cat.icon}
                            </div>
                            <span className="font-semibold text-gray-900">{cat.label}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Prediction Setup */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <Settings size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Prediction Setup</h2>
                    <p className="text-gray-600">Configure your prediction options</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Prediction Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Prediction Type *
                    </label>
                    <div className="space-y-3">
                      {predictionTypes.map((predType) => (
                        <motion.button
                          key={predType.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            setType(predType.id);
                            if (predType.id === 'binary') {
                              setOptions([
                                { id: '1', label: 'Yes' },
                                { id: '2', label: 'No' }
                              ]);
                            } else if (predType.id === 'multiple') {
                              setOptions([
                                { id: '1', label: '' },
                                { id: '2', label: '' },
                                { id: '3', label: '' }
                              ]);
                            }
                          }}
                          className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                            type === predType.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">{predType.icon}</div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{predType.label}</h3>
                              <p className="text-sm text-gray-600">{predType.description}</p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  {(type === 'binary' || type === 'multiple') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Prediction Options *
                      </label>
                      <div className="space-y-3">
                        {options.map((option, index) => (
                          <div key={option.id} className="flex items-center gap-3">
                            <input
                              type="text"
                              value={option.label}
                              onChange={(e) => updateOption(option.id, e.target.value)}
                              placeholder={`Option ${index + 1}`}
                              className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200"
                            />
                            {type === 'multiple' && options.length > 2 && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeOption(option.id)}
                                className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 transition-colors"
                              >
                                <X size={18} />
                              </motion.button>
                            )}
                          </div>
                        ))}
                        
                        {type === 'multiple' && options.length < 6 && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={addOption}
                            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <Plus size={18} />
                            <span>Add Option</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Settings & Launch */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <DollarSign size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Settings & Launch</h2>
                    <p className="text-gray-600">Final configuration details</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Entry Deadline */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Entry Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      value={entryDeadline}
                      onChange={(e) => setEntryDeadline(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Stake Limits */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Minimum Stake (₦)
                      </label>
                      <input
                        type="number"
                        value={stakeMin}
                        onChange={(e) => setStakeMin(e.target.value)}
                        placeholder="100"
                        min="1"
                        className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Maximum Stake (₦)
                      </label>
                      <input
                        type="number"
                        value={stakeMax}
                        onChange={(e) => setStakeMax(e.target.value)}
                        placeholder="10000"
                        min={stakeMin || "1"}
                        className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Settlement Method */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Settlement Method
                    </label>
                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSettlementMethod('manual')}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                          settlementMethod === 'manual'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users size={16} className="text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Manual Settlement</h3>
                            <p className="text-sm text-gray-600">You resolve the prediction manually</p>
                          </div>
                        </div>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSettlementMethod('auto')}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                          settlementMethod === 'auto'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Settings size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Automatic Settlement</h3>
                            <p className="text-sm text-gray-600">Resolved automatically when possible</p>
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Private Prediction</h3>
                        <p className="text-sm text-gray-600">Only people with link can participate</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                          isPrivate ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <motion.div
                          animate={{ x: isPrivate ? 24 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </motion.button>

            {step < 3 ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                disabled={!validateStep(step)}
                className={`px-8 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                  validateStep(step)
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!validateStep(3) || isSubmitting}
                className={`px-8 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 ${
                  validateStep(3) && !isSubmitting
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Prediction'
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreatePredictionPage;