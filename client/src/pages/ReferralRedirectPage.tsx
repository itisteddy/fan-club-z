/**
 * ReferralRedirectPage
 * 
 * Handles incoming referral links (/r/:code)
 * Stores the referral code and redirects to the main app
 * Feature flag: VITE_REFERRALS_ENABLE=1
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { setRefCode, isReferralEnabled, resolveReferrerPreview, setReferrerPreview, type ReferrerPreview } from '@/lib/referral';
import { Gift, Loader2 } from 'lucide-react';

const ReferralRedirectPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [referrer, setReferrer] = React.useState<ReferrerPreview | null>(null);
  
  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true });
      return;
    }
    
    let cancelled = false;
    // Store the referral code if feature is enabled
    if (isReferralEnabled()) {
      setRefCode(code);
      console.log('[Referral] Code captured:', code);
      // Best-effort resolve so we can show “Invited by @username”
      void (async () => {
        const preview = await resolveReferrerPreview(code);
        if (cancelled) return;
        if (preview) {
          setReferrer(preview);
          setReferrerPreview(preview);
        }
      })();
    }
    
    // Determine redirect destination
    const nextPath = searchParams.get('next') || '/';
    
    // Preserve UTM parameters for analytics
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    
    const redirectUrl = new URL(nextPath, window.location.origin);
    
    // Add UTM params to redirect URL if present
    if (utmSource) redirectUrl.searchParams.set('utm_source', utmSource);
    if (utmMedium) redirectUrl.searchParams.set('utm_medium', utmMedium);
    if (utmCampaign) redirectUrl.searchParams.set('utm_campaign', utmCampaign);
    
    // Small delay for visual feedback, then redirect
    const timer = setTimeout(() => {
      navigate(redirectUrl.pathname + redirectUrl.search, { replace: true });
    }, 900);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, searchParams, navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      <div className="text-center px-4">
        {/* Animated gift icon */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <Gift className="w-10 h-10 text-white" />
          </div>
        </div>
        
        {/* Loading text */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to FanClubZ!
        </h1>
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">
          {referrer?.username
            ? <>You’ve been invited by <span className="font-semibold">@{referrer.username}</span>. Redirecting you to the app…</>
            : "You've been invited by a friend. Redirecting you to the app..."}
        </p>
        
        {/* Loading spinner */}
        <div className="flex items-center justify-center gap-2 text-emerald-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
};

export default ReferralRedirectPage;
