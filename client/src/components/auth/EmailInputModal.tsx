import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, Loader2, CheckCircle } from 'lucide-react';
import { FocusTrap, AriaUtils, KeyboardNavigation } from '../../utils/accessibility';

interface EmailInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  title?: string;
  description?: string;
  submitLabel?: string;
}

const EmailInputModal: React.FC<EmailInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Enter your email address',
  description = 'We\'ll send you a secure sign-in link.',
  submitLabel = 'Send Link'
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);
  const [modalId] = useState(() => AriaUtils.generateId('email-modal'));

  // Focus management and accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Reset state
      setEmail('');
      setError('');
      setIsSubmitting(false);
      setShowSuccess(false);
      
      // Initialize focus trap
      focusTrapRef.current = new FocusTrap(modalRef.current);
      focusTrapRef.current.activate();
      
      // Announce modal opening to screen readers
      AriaUtils.announce(`${title} dialog opened`);
      
      return () => {
        if (focusTrapRef.current) {
          focusTrapRef.current.deactivate();
          focusTrapRef.current = null;
        }
      };
    }
  }, [isOpen, title]);

  // Handle keyboard interactions
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      KeyboardNavigation.handleEscape(event, onClose);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(email.trim());
      setShowSuccess(true);
      // Auto-close after showing success for 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send email');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={showSuccess ? undefined : onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        aria-describedby={`${modalId}-description`}
        aria-live="polite"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 id={`${modalId}-title`} className="text-xl font-semibold text-gray-900">
              {showSuccess ? 'Check your email!' : title}
            </h2>
            <p id={`${modalId}-description`} className="text-sm text-gray-600 mt-1">
              {showSuccess ? `We sent a sign-in link to ${email}` : description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {showSuccess ? (
          // Success State
          <div className="p-6 text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sign-in link sent!
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Click the link in your email to sign in. The link will expire in 1 hour for security.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                <strong>Sent to:</strong> {email}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Didn't receive it? Check your spam folder or close this to try again.
            </p>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    ref={emailInputRef}
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-colors ${
                      error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
                    }`}
                    placeholder="your@email.com"
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-semibold transition-colors shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    {submitLabel}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        {!showSuccess && (
          <div className="px-6 pb-6">
            <p className="text-xs text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailInputModal;