import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, X, Calendar, DollarSign, Users, Settings, Sparkles, Check, Globe, Clock, Shield, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { usePredictionStore } from '../store/predictionStore';
import { useSettlementStore } from '../store/settlementStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { scrollToTop } from '../utils/scroll';
import { SourcePill } from '../components/settlement/SourcePill';
import { RulePreview } from '../components/settlement/RulePreview';
import UnifiedHeader from '../components/layout/UnifiedHeader';
import { openAuthGate } from '../auth/authGateAdapter';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { useCategories } from '../hooks/useCategories';
import { CategorySelector } from '../components/prediction/CategorySelector';
import { uploadPredictionCoverImage, COVER_IMAGE_ACCEPT } from '@/lib/predictionCoverImage';

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
  const { user: storeUser, isAuthenticated: storeIsAuthenticated } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const currentUser = sessionUser ?? storeUser ?? null;
  const isAuthenticated = !!sessionUser || storeIsAuthenticated;
  const navigate = useNavigate();
  
  // Draft persistence key
  const DRAFT_KEY = 'fcz_create_prediction_draft';
  const [hasDraft, setHasDraft] = useState(false);

  // Scroll to top when component mounts (UI/UX best practice)
  useEffect(() => {
    scrollToTop({ delay: 200 });
  }, []);

  // Use individual state variables instead of one large object to prevent re-renders
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null); // Changed to categoryId (UUID)
  const [type, setType] = useState('binary');
  const [options, setOptions] = useState<PredictionOption[]>([
    { id: '1', label: 'Yes' },
    { id: '2', label: 'No' }
  ]);
  const [entryDeadline, setEntryDeadline] = useState('');
  const [stakeMin, setStakeMin] = useState('1');
  const [stakeMax, setStakeMax] = useState('1000');
  const [settlementMethod, setSettlementMethod] = useState('manual');
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Settlement configuration state
  const [primarySource, setPrimarySource] = useState<any>(null);
  const [backupSource, setBackupSource] = useState<any>(null);
  const [ruleText, setRuleText] = useState('');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [contingencies, setContingencies] = useState({
    postponed: 'auto_void' as 'auto_void' | 'extend_lock' | 'keep_open',
    source_down: 'use_backup' as 'use_backup' | 'pause_and_escalate'
  });

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  // Restore draft from sessionStorage
  const restoreDraft = useCallback(() => {
    const draftStr = sessionStorage.getItem(DRAFT_KEY);
    if (!draftStr) return false;
    
    try {
      const draft = JSON.parse(draftStr);
      setTitle(draft.title || '');
      setDescription(draft.description || '');
      // Support both legacy category (slug) and new categoryId (UUID)
      if (draft.categoryId) {
        setCategoryId(draft.categoryId);
      } else {
        setCategoryId(null); // CategorySelector will auto-select general
      }
      setType(draft.type || 'binary');
      setOptions(draft.options || [{ id: '1', label: 'Yes' }, { id: '2', label: 'No' }]);
      setEntryDeadline(draft.entryDeadline || '');
      setStakeMin(draft.stakeMin || '1');
      setStakeMax(draft.stakeMax || '1000');
      setSettlementMethod(draft.settlementMethod || 'manual');
      setIsPrivate(draft.isPrivate || false);
      setPrimarySource(draft.primarySource || null);
      setBackupSource(draft.backupSource || null);
      setRuleText(draft.ruleText || '');
      setTimezone(draft.timezone || 'Africa/Lagos');
      setContingencies(draft.contingencies || {
        postponed: 'auto_void',
        source_down: 'use_backup'
      });
      if (draft.step) setStep(draft.step);
      return true;
    } catch (error) {
      console.error('Failed to restore draft:', error);
      return false;
    }
  }, []);

  // Save draft to sessionStorage
  const saveDraft = useCallback(() => {
    const draft = {
      title,
      description,
      categoryId, // Save categoryId instead of category slug
      type,
      options,
      entryDeadline,
      stakeMin,
      stakeMax,
      settlementMethod,
      isPrivate,
      primarySource,
      backupSource,
      ruleText,
      timezone,
      contingencies,
      step
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setHasDraft(true);
  }, [title, description, categoryId, type, options, entryDeadline, stakeMin, stakeMax, settlementMethod, isPrivate, primarySource, backupSource, ruleText, timezone, contingencies, step]);

  // Discard draft
  const discardDraft = useCallback(() => {
    sessionStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  }, []);

  // Auto-resume draft after successful auth
  useEffect(() => {
    if (isAuthenticated && currentUser && hasDraft) {
      const draftStr = sessionStorage.getItem(DRAFT_KEY);
      if (draftStr) {
        // Small delay to ensure auth state is fully settled
        const timer = setTimeout(() => {
          const restored = restoreDraft();
          if (restored) {
            toast.success('Draft restored! You can continue creating your prediction.');
            // If we were on step 4, the user can now submit manually
            // The form will be pre-filled and ready
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, currentUser, hasDraft, restoreDraft]);


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
        return !!(title.trim() && categoryId);
      case 2:
        return !!(type && options.every(opt => opt.label.trim()));
      case 3:
        return !!(entryDeadline && stakeMin);
      case 4:
        return true; // Preview step is always valid
      default:
        return true;
    }
  }, [title, categoryId, type, options, entryDeadline, stakeMin]);

  const handleNext = useCallback(() => {
    if (validateStep(step) && step < 4) {
      setStep(step + 1);
      // Scroll to top when advancing to next step
      scrollToTop({ delay: 150 });
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
      // Scroll to top when going back to previous step
      scrollToTop({ delay: 150 });
    } else {
      // Navigate back to previous page
      if (onNavigateBack) {
        onNavigateBack();
      }
    }
  }, [step, onNavigateBack]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(4)) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Validate form data
      if (!title.trim()) {
        throw new Error('Title is required');
      }
      if (!categoryId) {
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

      // Check authentication - if not authenticated, save draft and open auth gate
      if (!isAuthenticated || !currentUser?.id) {
        // Save draft to sessionStorage
        saveDraft();
        
        // Open auth gate
        const result = await openAuthGate({
          intent: 'create_prediction',
          payload: { step: 4 }
        });
        
        if (result.status === 'success') {
          // Auth successful - draft will be restored by useEffect above
          // and form will auto-submit if on step 4
          return;
        } else {
          // User cancelled or error - don't proceed
          setIsSubmitting(false);
          if (result.status === 'cancel') {
            toast('Sign in cancelled. Your draft has been saved.');
          }
          return;
        }
      }

      let coverImageUrl: string | undefined;
      if (coverImageFile && currentUser?.id) {
        try {
          toast.loading('Uploading image…', { id: 'cover-upload' });
          const result = await uploadPredictionCoverImage(coverImageFile, currentUser.id, undefined);
          coverImageUrl = result.coverImageUrl;
          toast.dismiss('cover-upload');
        } catch (err) {
          toast.dismiss('cover-upload');
          const msg = err instanceof Error ? err.message : 'Upload failed';
          toast.error(msg);
          setIsSubmitting(false);
          return;
        }
      }

      const predictionData: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId,
        type: type as 'binary' | 'multi_outcome' | 'pool',
        options: options
          .filter(opt => opt.label.trim())
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
        isPrivate: isPrivate,
        creatorId: currentUser.id
      };
      if (coverImageUrl) predictionData.imageUrl = coverImageUrl;

      if (predictionData.options.length < 2) {
        throw new Error('At least 2 prediction options are required');
      }

      console.log('Creating prediction with data:', predictionData);

      const createdPrediction = await createPrediction(predictionData);
      
      console.log('Prediction created successfully!', createdPrediction);
      
      // Create settlement configuration if automatic settlement is selected
      if (settlementMethod === 'auto' && createdPrediction) {
        try {
          const { createSettlementConfig } = useSettlementStore.getState();
          await createSettlementConfig(createdPrediction.id, {
            method: 'web',
            primary_source_id: primarySource?.id,
            backup_source_id: backupSource?.id,
            rule_text: ruleText || `Check if ${title} by ${entryDeadline}`,
            timezone: timezone,
            contingencies: contingencies
          });
          console.log('Settlement configuration created successfully!');
        } catch (error) {
          console.error('Failed to create settlement configuration:', error);
          // Don't fail the prediction creation if settlement config fails
        }
      }
      
      // Clear draft after successful submission
      sessionStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      
      toast.success('🎉 Prediction created successfully!');
      setSubmitSuccess(true);
      
      // Navigate to Discover after success
      setTimeout(() => {
        // Reset form
        setStep(1);
        setTitle('');
        setDescription('');
        setCategoryId(null);
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
        setCoverImageFile(null);
        if (coverImagePreviewUrl) URL.revokeObjectURL(coverImagePreviewUrl);
        setCoverImagePreviewUrl(null);

        // Navigate to Discover using react-router-dom
        // Use replace: true to prevent going back to the success screen
        navigate('/discover', { replace: true });
      }, 2000);
    } catch (error) {
      console.error('Failed to create prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create prediction. Please try again.';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  }, [validateStep, title, categoryId, entryDeadline, description, type, options, stakeMin, stakeMax, settlementMethod, isPrivate, isAuthenticated, currentUser, createPrediction, navigate, saveDraft, coverImageFile, coverImagePreviewUrl]);

  // Success View
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-100 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 text-center shadow-2xl border border-teal-200"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
            className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check size={32} className="text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Prediction Created!</h2>
          <p className="text-gray-600 mb-4">Your prediction has been successfully created and is now live.</p>
          <div className="text-sm text-teal-600 font-medium">Redirecting to Discover...</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-20 create-prediction-page">
      {/* Unified Header */}
      <UnifiedHeader
        title="Create Prediction"
        subtitle={`Step ${step} of 4`}
        showLogo={false}
        showBack={true}
        onBack={handleBack}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-b-0"
      />

      {/* Progress bar */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 pb-4">
        <div className="bg-white/20 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>

      {/* Resume Draft Banner */}
      {hasDraft && !isAuthenticated && (
        <div className="px-6 pt-4 pb-2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 flex-1">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">Resume draft?</p>
                <p className="text-xs text-amber-700">You have a saved draft from a previous session.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={restoreDraft}
                className="px-4 py-2 text-sm font-semibold text-amber-900 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
              >
                Resume
              </button>
              <button
                onClick={discardDraft}
                className="px-4 py-2 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                Discard
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-teal-600 rounded-2xl flex items-center justify-center">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
                    <p className="text-gray-600">Tell us about your prediction</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Title */}
                  <div className="input-container">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prediction Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Will Bitcoin reach $100,000 by end of 2024?"
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="textarea-container">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide additional context and rules for your prediction..."
                      rows={4}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none"
                    />
                  </div>

                  {/* Category - Chip selector (consistent with DiscoverPage) */}
                  <div className="form-section">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category *
                    </label>
                    <CategorySelector
                      value={categoryId}
                      onChange={setCategoryId}
                      categories={categories}
                      isLoading={categoriesLoading}
                    />
                  </div>

                  {/* Cover image (optional) */}
                  <div className="form-section">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cover image (optional)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      If you skip, we&apos;ll use a random image.
                    </p>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept={COVER_IMAGE_ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverImageFile(file);
                          setCoverImagePreviewUrl(URL.createObjectURL(file));
                        }
                        e.target.value = '';
                      }}
                    />
                    {!coverImageFile ? (
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        className="w-full p-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
                      >
                        <ImageIcon className="w-10 h-10" />
                        <span className="font-medium">Choose image</span>
                        <span className="text-xs">JPEG, PNG or WebP, max 5 MB</span>
                      </button>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 aspect-video bg-gray-100">
                        <img
                          src={coverImagePreviewUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImageFile(null);
                            if (coverImagePreviewUrl) URL.revokeObjectURL(coverImagePreviewUrl);
                            setCoverImagePreviewUrl(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
                          className={`motion-button w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
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
                            <div className="input-container flex-1">
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) => updateOption(option.id, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200"
                              />
                            </div>
                            {type === 'multiple' && options.length > 2 && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeOption(option.id)}
                                className="motion-button w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 transition-colors"
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
                            className="motion-button w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
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
                  <div className="input-container">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Entry Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      value={entryDeadline}
                      onChange={(e) => setEntryDeadline(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Stake Limits */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="input-container">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Minimum Stake ($)
                      </label>
                      <input
                        type="number"
                        value={stakeMin}
                        onChange={(e) => setStakeMin(e.target.value)}
                        placeholder="100"
                        min="1"
                        className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="input-container">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Maximum Stake ($)
                      </label>
                      <input
                        type="number"
                        value={stakeMax}
                        onChange={(e) => setStakeMax(e.target.value)}
                        placeholder="100000"
                        min={stakeMin || "1"}
                        className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:outline-none transition-all duration-200"
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
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 bg-white hover:border-teal-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Users size={16} className="text-teal-600" />
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
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 bg-white hover:border-teal-300'
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
                          isPrivate ? 'bg-teal-500' : 'bg-gray-300'
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

            {/* Step 4: Preview & Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Check size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Preview & Confirm</h2>
                    <p className="text-gray-600">Review your prediction before publishing</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Prediction Preview Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Prediction Preview</h3>
                    
                    {/* Title */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                      <p className="text-lg font-semibold text-gray-900">{title}</p>
                    </div>

                    {/* Description */}
                    {description && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                        <p className="text-gray-700">{description}</p>
                      </div>
                    )}

                    {/* Category */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {categoryId ? categories.find(cat => cat.id === categoryId)?.label || 'Unknown' : 'Not selected'}
                      </span>
                    </div>

                    {/* Options */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-2">Options</label>
                      <div className="space-y-2">
                        {options.map((option, index) => (
                          <div key={option.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-600">Option {index + 1}:</span>
                            <span className="font-semibold text-gray-900">{option.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Stake Limits</label>
                        <p className="text-gray-900">${stakeMin} - ${stakeMax}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Deadline</label>
                        <p className="text-gray-900">{new Date(entryDeadline).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Settlement</label>
                        <p className="text-gray-900 capitalize">{settlementMethod}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Privacy</label>
                        <p className="text-gray-900">{isPrivate ? 'Private' : 'Public'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Message */}
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={20} className="text-teal-600" />
                      <div>
                        <h4 className="font-semibold text-teal-800">Ready to Publish</h4>
                        <p className="text-sm text-teal-700">Your prediction looks good! Click "Create Prediction" to publish it.</p>
                      </div>
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

            {step < 4 ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                disabled={!validateStep(step)}
                className={`px-8 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                  validateStep(step)
                    ? 'bg-gradient-to-r from-purple-500 to-teal-600 text-white shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {step === 3 ? 'Preview' : 'Continue'}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!validateStep(4) || isSubmitting}
                className={`px-8 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 ${
                  validateStep(4) && !isSubmitting
                    ? 'bg-gradient-to-r from-purple-500 to-teal-600 text-white shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30'
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