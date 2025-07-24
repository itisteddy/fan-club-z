// Fan Club Z - Quick Onboarding Fix
// Copy and paste this into your browser console to fix onboarding issues

console.log('🔧 Fan Club Z - Onboarding Fix');
console.log('=============================');

try {
  // Set multiple completion indicators
  localStorage.setItem('onboarding_completed', 'true');
  localStorage.setItem('onboarding_completed_at', new Date().toISOString());
  
  // Set compliance status
  const complianceStatus = {
    ageVerified: true,
    privacyAccepted: true,
    termsAccepted: true,
    responsibleGamblingAcknowledged: true,
    completedAt: new Date().toISOString(),
    version: '1.0',
    userAgent: navigator.userAgent,
    completedSteps: ['terms', 'privacy', 'responsible'],
    manuallyFixed: true,
    fixedAt: new Date().toISOString()
  };
  localStorage.setItem('compliance_status', JSON.stringify(complianceStatus));
  
  // Update auth store if it exists
  const authState = localStorage.getItem('fan-club-z-auth');
  if (authState) {
    try {
      const parsed = JSON.parse(authState);
      if (parsed.state) {
        parsed.state.onboardingCompleted = true;
        localStorage.setItem('fan-club-z-auth', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Could not update auth store, but other methods set');
    }
  }
  
  console.log('✅ Onboarding marked as complete!');
  console.log('🔄 Please refresh the page to see changes');
  
  // Automatically refresh the page after 2 seconds
  setTimeout(() => {
    console.log('🔄 Refreshing page...');
    window.location.reload();
  }, 2000);
  
} catch (error) {
  console.error('❌ Error fixing onboarding:', error);
  console.log('Please try refreshing the page and running this again');
}
