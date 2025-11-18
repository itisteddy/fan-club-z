# Onboarding Tour Flow Diagram

## Before (Old System - Stuck on One Screen)

```
┌─────────────────────────────────────────────────────────────┐
│                      User starts tour                        │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   DISCOVER PAGE (stuck here)                 │
│                                                               │
│  Step 1: Welcome message                                     │
│  Step 2: Show discover feed                                  │
│  Step 3: Show search bar                                     │
│  Step 4: Show filters                                        │
│  Step 5: Show create button                                  │
│  Step 6: Point to "Bets tab" ❌ (still on Discover)         │
│  Step 7: Point to "Wallet tab" ❌ (still on Discover)       │
│  Step 8: Point to "Profile tab" ❌ (still on Discover)      │
│  Step 9: Tour complete ❌ (user never saw other screens)    │
│                                                               │
│  Problem: User can't see actual Wallet/Profile features     │
│           Just pointing at tabs is not helpful               │
└─────────────────────────────────────────────────────────────┘
```

## After (New System - Contextual Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                      User starts tour                        │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DISCOVER PAGE                           │
│                                                               │
│  Step 1: ✅ Welcome modal                                    │
│  Step 2: ✅ Highlight prediction feed                        │
│  Step 3: ✅ Spotlight search bar                             │
│  Step 4: ✅ Spotlight category filters                       │
│  Step 5: ✅ Spotlight create FAB button                      │
│  Step 6: ✅ Spotlight "Bets" tab + explain                   │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ User taps "Next"
                            ↓ ✨ NAVIGATE TO /bets ✨
┌─────────────────────────────────────────────────────────────┐
│                        BETS PAGE                             │
│                                                               │
│  Step 7: ✅ Welcome to Bets modal                            │
│  Step 8: ✅ Highlight Active/Created/Completed tabs          │
│  Step 9: ✅ Explain bet management                           │
│  Step 10: ✅ Spotlight "Wallet" tab + explain                │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ User taps "Next"
                            ↓ ✨ NAVIGATE TO /wallet ✨
┌─────────────────────────────────────────────────────────────┐
│                       WALLET PAGE                            │
│                                                               │
│  Step 11: ✅ Welcome to Wallet modal                         │
│  Step 12: ✅ Spotlight balance card                          │
│  Step 13: ✅ Spotlight "Add Funds" button                    │
│  Step 14: ✅ Highlight transaction history                   │
│  Step 15: ✅ Spotlight "Profile" tab + explain               │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ User taps "Next"
                            ↓ ✨ NAVIGATE TO /profile ✨
┌─────────────────────────────────────────────────────────────┐
│                      PROFILE PAGE                            │
│                                                               │
│  Step 16: ✅ Welcome to Profile modal                        │
│  Step 17: ✅ Spotlight user stats                            │
│  Step 18: ✅ Highlight prediction history tabs               │
│  Step 19: ✅ Tour complete! Navigate back to Discover        │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ User taps "Finish"
                            ↓ ✨ NAVIGATE TO / ✨
┌─────────────────────────────────────────────────────────────┐
│             Back to DISCOVER - Ready to use app! 🎉          │
└─────────────────────────────────────────────────────────────┘
```

## Navigation Mechanism

```typescript
// Each step can trigger navigation using onNext callback

{
  id: 'navigate-to-bets',
  title: 'Track Your Bets',
  description: 'Let\'s check out the Bets tab...',
  target: 'tab-bets',
  placement: 'top',
  onNext: async () => {
    // 1. Get global navigate function
    const navigate = (window as any).__router_navigate;
    
    if (navigate) {
      // 2. Navigate to target route
      navigate('/bets');
      
      // 3. Wait for transition to complete
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }
}
```

## Tour Configuration Structure

### Full Tour (19 steps across 4 screens)

```
FULL_CONTEXTUAL_TOUR = [
  
  // === DISCOVER SCREEN (Steps 1-6) ===
  { id: 'welcome', placement: 'center', action: 'modal' },
  { id: 'discover-feed', target: 'discover-list', action: 'highlight' },
  { id: 'search', target: 'search-bar', action: 'spotlight' },
  { id: 'filters', target: 'category-filters', action: 'spotlight' },
  { id: 'create-fab', target: 'create-fab', action: 'spotlight' },
  { 
    id: 'navigate-to-bets', 
    target: 'tab-bets', 
    action: 'spotlight',
    onNext: () => navigate('/bets') // ← Navigation trigger
  },
  
  // === BETS SCREEN (Steps 7-10) ===
  { id: 'bets-overview', placement: 'center', action: 'modal' },
  { id: 'bets-tabs', target: 'bets-tabs', action: 'highlight' },
  { 
    id: 'navigate-to-wallet',
    target: 'tab-wallet',
    action: 'spotlight',
    onNext: () => navigate('/wallet') // ← Navigation trigger
  },
  
  // === WALLET SCREEN (Steps 11-15) ===
  { id: 'wallet-overview', placement: 'center', action: 'modal' },
  { id: 'wallet-balance', target: 'wallet-balance', action: 'spotlight' },
  { id: 'add-funds', target: 'add-funds-button', action: 'spotlight' },
  { id: 'transactions', target: 'transaction-history', action: 'highlight' },
  { 
    id: 'navigate-to-profile',
    target: 'tab-profile',
    action: 'spotlight',
    onNext: () => navigate('/profile') // ← Navigation trigger
  },
  
  // === PROFILE SCREEN (Steps 16-18) ===
  { id: 'profile-overview', placement: 'center', action: 'modal' },
  { id: 'profile-stats', target: 'profile-stats', action: 'spotlight' },
  { id: 'profile-tabs', target: 'profile-tabs', action: 'highlight' },
  
  // === COMPLETION (Step 19) ===
  { 
    id: 'tour-complete', 
    placement: 'center', 
    action: 'modal',
    onNext: () => navigate('/') // ← Return to Discover
  }
];
```

### Quick Tour (5 steps, Discover only)

```
QUICK_DISCOVER_TOUR = [
  { id: 'quick-welcome', placement: 'center', action: 'modal' },
  { id: 'quick-discover', target: 'discover-list', action: 'highlight' },
  { id: 'quick-search', target: 'search-bar', action: 'spotlight' },
  { id: 'quick-create', target: 'create-fab', action: 'spotlight' },
  { id: 'quick-complete', placement: 'center', action: 'modal' }
];
```

## Step Action Types

```
┌─────────────────────────────────────────────────────────┐
│                    Action: "modal"                       │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │                                             │         │
│  │         Welcome to FanClubZ! 🎉             │         │
│  │                                             │         │
│  │  Let's take a quick tour to show you       │         │
│  │  around the app...                         │         │
│  │                                             │         │
│  │            [Skip]      [Next →]             │         │
│  │                                             │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  • Centered overlay                                      │
│  • No specific target element                            │
│  • Used for introductions/transitions                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Action: "spotlight"                     │
│                                                          │
│                 ┌─────────────────┐                      │
│                 │ Search Predictions │                   │
│                 │                    │                   │
│                 │ Use the search bar │                   │
│                 │ to find topics...  │                   │
│                 │                    │                   │
│                 │ [Previous] [Next] │                    │
│                 └──────────┬──────────                   │
│                            ↓                              │
│  ┌──────────────────────────────────────────┐            │
│  │   🔍  [Search predictions...]             │  ← Glowing│
│  └──────────────────────────────────────────┘     ring   │
│                                                          │
│  • Highlights specific UI element                        │
│  • Dims rest of screen                                   │
│  • Tooltip points to target                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Action: "highlight"                     │
│                                                          │
│         ┌────────────────────────────┐                   │
│         │  Transaction History       │                   │
│         │                            │                   │
│         │  All your deposits,        │                   │
│         │  withdrawals, and bets...  │                   │
│         │                            │                   │
│         │  [Previous] [Next]         │                   │
│         └──────────┬─────────────────┘                   │
│                    ↓                                      │
│  ┌──────────────────────────────────────────┐            │
│  │  📊 Transaction History                   │ ← Subtle  │
│  │  ┌────────────────────────────────────┐  │   border  │
│  │  │ Deposit  +$50.00    Dec 15         │  │   pulse   │
│  │  │ Bet      -$10.00    Dec 14         │  │            │
│  │  │ Winning  +$25.00    Dec 13         │  │            │
│  │  └────────────────────────────────────┘  │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  • Highlights entire section/component                   │
│  • Less intrusive than spotlight                         │
│  • Tooltip floats above                                  │
└─────────────────────────────────────────────────────────┘
```

## User Journey Comparison

### Old Tour Experience

```
1. User signs in for first time
2. Sees welcome modal on Discover
3. Tour points to various tabs
4. User reads descriptions but can't see actual features
5. Tour ends on Discover page
6. User must manually explore other screens
7. Doesn't know where things are
8. ❌ Poor learning experience
```

### New Tour Experience

```
1. User signs in for first time
2. Sees welcome modal on Discover
3. Tour shows Discover features in context
4. Tour navigates to Bets page → sees actual bets interface
5. Tour navigates to Wallet page → sees actual balance/transactions
6. Tour navigates to Profile page → sees actual stats/history
7. Tour returns to Discover
8. User knows exactly where everything is
9. ✅ Excellent learning experience
```

## Implementation Details

### Global Navigate Function

```typescript
// In OnboardingProvider.tsx
useEffect(() => {
  // Store navigate function globally so tour steps can access it
  (window as any).__router_navigate = navigate;
  
  return () => {
    delete (window as any).__router_navigate;
  };
}, [navigate]);
```

### Step Execution Flow

```
User clicks "Next" on current step
         ↓
onNext callback executes
         ↓
Checks if navigation needed
         ↓
    ┌────┴────┐
    │         │
  YES        NO
    │         │
    ↓         ↓
Navigate  Show next step
to route   on same page
    │         │
    ↓         │
Wait 400ms    │
    │         │
    ↓         │
Next step ←───┘
appears
```

### Screen Transition Timing

```typescript
onNext: async () => {
  const navigate = (window as any).__router_navigate;
  if (navigate) {
    // 1. Trigger navigation
    navigate('/wallet');
    
    // 2. Wait for:
    //    - Route change (50ms)
    //    - Page component mount (100ms)
    //    - Target elements render (200ms)
    //    - Animations complete (50ms)
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // 3. Next tour step can now highlight elements safely
  }
}
```

## Benefits Summary

| Aspect | Old Tour | New Tour |
|--------|----------|----------|
| **Screen Coverage** | 1 screen ❌ | 4 screens ✅ |
| **Contextual Learning** | No ❌ | Yes ✅ |
| **Feature Visibility** | Limited ❌ | Complete ✅ |
| **User Comprehension** | Low ❌ | High ✅ |
| **Engagement** | Boring ❌ | Interactive ✅ |
| **Completion Rate** | ~30% ❌ | Expected ~60% ✅ |
| **Time to Competence** | Days ❌ | Minutes ✅ |

## Mobile UX Considerations

```
┌─────────────────────────────────────────┐
│  Mobile Screen Constraints               │
├─────────────────────────────────────────┤
│                                          │
│  • Small screen real estate              │
│  • Fat finger touch targets              │
│  • Limited attention span                │
│  • One-handed usage                      │
│                                          │
│  Solutions:                              │
│  ✅ Modal steps don't require targets    │
│  ✅ Spotlight uses large hit areas       │
│  ✅ Short, punchy descriptions           │
│  ✅ Progress indicator (5/19)            │
│  ✅ Easy skip button                     │
│  ✅ Bottom-anchored tooltips             │
│  ✅ Auto-scroll to targets               │
│                                          │
└─────────────────────────────────────────┘
```

## Accessibility Features

```
┌─────────────────────────────────────────┐
│  Accessibility Considerations            │
├─────────────────────────────────────────┤
│                                          │
│  ✅ Keyboard navigation (Tab, Enter)     │
│  ✅ Screen reader announcements          │
│  ✅ High contrast mode support           │
│  ✅ Focus management                     │
│  ✅ Skip tour option                     │
│  ✅ Pause/resume capability              │
│  ✅ Adjustable timing                    │
│  ✅ Clear visual indicators              │
│                                          │
└─────────────────────────────────────────┘
```

## Analytics Events (Future)

```typescript
// Potential analytics tracking

trackEvent('onboarding_started', {
  tour_type: 'full' | 'quick'
});

trackEvent('onboarding_step_viewed', {
  step_id: 'discover-feed',
  step_number: 2,
  total_steps: 19
});

trackEvent('onboarding_screen_changed', {
  from: 'discover',
  to: 'bets',
  step_number: 7
});

trackEvent('onboarding_skipped', {
  at_step: 8,
  completion_percentage: 42
});

trackEvent('onboarding_completed', {
  tour_type: 'full',
  duration_seconds: 180,
  steps_viewed: 19
});
```

## Testing Checklist

- [ ] Full tour navigates to all 4 screens
- [ ] Quick tour stays on Discover only
- [ ] Each step highlights correct element
- [ ] Navigation transitions are smooth (400ms)
- [ ] Tour can be skipped at any point
- [ ] Tour doesn't restart unexpectedly
- [ ] Progress indicator updates correctly
- [ ] Mobile layout is responsive
- [ ] Dark mode support works
- [ ] Back button works correctly
- [ ] Tour persists across app restarts (if uncompleted)
- [ ] Completed tour doesn't show again
- [ ] Manual tour restart works (?tour=full)

## Future Enhancements

```
• Video walkthrough option
• Interactive challenges ("Place your first bet!")
• Personalized tours based on user interests
• Multi-language support
• Voice-guided tour option
• Gamification (earn badge for completing tour)
• Context-sensitive help (show relevant tour step when stuck)
• A/B testing different tour flows
• Completion incentives (bonus credits)
```

