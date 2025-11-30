# Fan Club Z - Feature Changelog

**Version:** 2.0.78  
**Last Updated:** January 2025  
**Purpose:** Comprehensive record of all major features currently in production

---

## 📋 Table of Contents

- [v2.0 - Core Platform](#v20---core-platform)
- [v2.1 - Wallet & Payments](#v21---wallet--payments)
- [v2.2 - Social Features](#v22---social-features)
- [v2.3 - Enhanced UX](#v23---enhanced-ux)
- [v2.4 - OG Badges & Referrals](#v24---og-badges--referrals)
- [Feature Status](#feature-status)

---

## v2.0 - Core Platform

### Authentication & User Management
- **Email Authentication**
  - Email/password sign-up and sign-in
  - Magic link authentication (passwordless)
  - Email verification flow
  - Session persistence across page refreshes
  - Secure session management via Supabase Auth

- **OAuth Integration**
  - Google OAuth sign-in
  - PKCE flow for secure authentication
  - Deep linking support for mobile OAuth
  - Custom tab authentication for mobile apps
  - Automatic session restoration after OAuth redirect

- **User Profiles**
  - User profile pages with avatar, username, and bio
  - View other users' profiles
  - Profile statistics (predictions created, bets placed, win rate)
  - User activity history
  - Profile editing capabilities

### Prediction System
- **Prediction Creation**
  - Create binary predictions with custom options
  - Add prediction title, description, and images
  - Set prediction categories (Sports, Pop Culture, Politics, etc.)
  - Set closing dates and settlement criteria
  - Image upload and management
  - SEO-friendly slug generation for predictions

- **Prediction Discovery**
  - Discover page with infinite scroll
  - Filter predictions by category
  - Search functionality
  - Sort by trending, newest, closing soon
  - Prediction cards with key information
  - Responsive grid layout

- **Prediction Details**
  - Full prediction view with all details
  - Betting interface with option selection
  - Real-time odds calculation
  - Current bet distribution visualization
  - Prediction creator information
  - Settlement criteria display

- **Betting System**
  - Place bets on predictions
  - Multiple betting options per prediction
  - Real-time balance checking
  - Escrow lock system for bet funds
  - Atomic bet placement with idempotency
  - Bet history tracking

- **Settlement System**
  - Creator-controlled settlement
  - Manual settlement with outcome selection
  - Automatic payout calculation
  - Settlement validation system
  - Dispute resolution mechanism
  - Refund capability for disputed predictions

- **Dispute Resolution**
  - Users can dispute settlement outcomes
  - Creator can accept, revise, or reject disputes
  - Automatic refunds for accepted disputes
  - Dispute status tracking
  - Settlement validation records

### Leaderboards
- **Unified Leaderboard System**
  - Overall leaderboard (total winnings)
  - Win rate leaderboard
  - Referral leaderboard (active referrals count)
  - Category-specific leaderboards
  - User rankings with badges
  - Real-time leaderboard updates

---

## v2.1 - Wallet & Payments

### Crypto Wallet Integration
- **Base Sepolia Network**
  - USDC token support (ERC-20)
  - Wallet connection via WalletConnect
  - MetaMask integration
  - Coinbase Wallet integration
  - Multi-wallet support

- **Deposit System**
  - On-chain deposit detection
  - Automatic balance updates
  - Deposit transaction tracking
  - Real-time deposit notifications
  - Deposit history in activity feed

- **Withdrawal System**
  - Withdraw USDC to connected wallet
  - On-chain withdrawal transactions
  - Withdrawal confirmation flow
  - Withdrawal history tracking

- **Escrow System**
  - Escrow contract integration
  - Automatic escrow lock creation for bets
  - Escrow balance tracking
  - Available vs reserved balance separation
  - Escrow reconciliation system

### Wallet Features
- **Wallet Page**
  - Wallet USDC balance display
  - Escrow balance (total, available, reserved)
  - Transaction activity feed
  - Deposit/withdraw actions
  - Wallet connection management
  - Auto-refresh every 10 seconds

- **Transaction History**
  - Complete transaction log
  - Transaction type indicators (deposit, withdraw, lock, unlock, bet, payout)
  - Timestamp and amount display
  - Transaction status tracking
  - Infinite scroll for history

- **Balance Management**
  - Real-time balance updates
  - Multi-source balance aggregation
  - Available-to-stake calculation
  - Insufficient funds handling
  - Balance validation before transactions

---

## v2.2 - Social Features

### Comments System
- **Comment Threading**
  - Add comments to predictions
  - Reply to comments (nested threads)
  - Edit own comments
  - Delete own comments
  - Comment pagination and infinite scroll
  - Real-time comment updates

- **Comment Interactions**
  - Like/unlike comments
  - Comment like counts
  - Comment author badges (OG badges, creator badges)
  - Comment timestamps
  - User avatars in comments

- **Comment UI**
  - Clean, mobile-optimized comment cards
  - Comment composer with character limits
  - Comment overflow menus
  - Comment loading states
  - Empty state handling

### Social Engagement
- **Prediction Likes**
  - Like/unlike predictions
  - Like count display
  - Like state persistence

- **Sharing**
  - Share predictions via native share sheet
  - Share to social media platforms
  - Shareable prediction links
  - Referral link sharing

---

## v2.3 - Enhanced UX

### Navigation & Layout
- **Mobile-First Design**
  - Bottom navigation bar
  - Stable navigation with safe area support
  - Mobile-optimized layouts
  - Touch-friendly interactions
  - Responsive design for all screen sizes

- **Scroll Management**
  - Custom scroll restoration on back navigation
  - Scroll to top on forward navigation
  - Scroll position preservation for Discover page
  - Smooth scroll behavior
  - Browser history integration

- **Page Transitions**
  - Smooth page transitions
  - Loading states for all pages
  - Error boundaries
  - Page-level error handling

### Onboarding
- **User Onboarding**
  - Multi-step onboarding tour
  - Context-aware navigation
  - Feature discovery prompts
  - Onboarding completion tracking
  - Skip/complete options

### Progressive Web App (PWA)
- **PWA Features**
  - Install prompt for mobile devices
  - Offline support
  - App-like experience
  - Service worker integration
  - PWA manifest configuration

- **Mobile App Features**
  - Deep linking support
  - Native app integration
  - Push notification support (infrastructure ready)
  - App state management

### Notifications
- **In-App Notifications**
  - Toast notifications for actions
  - Success/error message display
  - Notification center (infrastructure ready)
  - Real-time notification updates

---

## v2.4 - OG Badges & Referrals

### OG Badges System
- **Badge Tiers**
  - Gold badges (first 25 users)
  - Silver badges (next 100 users)
  - Bronze badges (next 500 users)
  - Member number assignment
  - Badge assignment date tracking

- **Badge Display**
  - Badge display on profile pages
  - Badge display in comments (author chips)
  - Badge tooltips with member number and join date
  - Animated badge components
  - Multiple badge size variants

- **Badge Features**
  - Admin badge assignment
  - Badge backfill for existing users
  - Badge removal capability
  - Badge statistics and counts
  - Badge tier gradients and styling

### Referral System
- **Referral Links**
  - Unique referral code generation
  - Shareable referral links
  - Referral link tracking
  - One-tap copy functionality
  - Native share integration

- **Referral Tracking**
  - Click tracking for referral links
  - Attribution on user sign-up
  - Active referral counting
  - Referral statistics (signups, active referrals)
  - Referral leaderboard integration

- **Referral Features**
  - Referral redirect page (`/r/:code`)
  - Referral code capture from URLs
  - Automatic referral attribution on login
  - Referral success celebrations
  - Milestone celebrations (5, 10, 25, 50, 100 referrals)

- **Referral UI**
  - Profile referral section
  - Referral stats display
  - Referral link sharing modal
  - Referral success toasts
  - Referral leaderboard tab

---

## Feature Status

### ✅ Active Features
All features listed above are currently active and in production.

### 🔧 Feature Flags
Some features can be toggled via environment variables:
- `VITE_BADGES_OG_ENABLE` - OG Badges feature
- `VITE_REFERRALS_ENABLE` - Referrals feature
- `BADGES_OG_ENABLE` - Server-side badges API
- `REFERRAL_ENABLE` - Server-side referrals API

### 📝 Notes
- **Version Tracking**: Version numbers are read from `package.json` and not hardcoded
- **Database**: All features use Supabase (PostgreSQL) as the database
- **Backend**: Express.js API server deployed on Render
- **Frontend**: React application deployed on Vercel
- **Blockchain**: Base Sepolia testnet for crypto features
- **Authentication**: Supabase Auth for all authentication flows

---

## Future Updates

When new features are added or existing features are removed, update this changelog with:
- **Date** of change
- **Version** number
- **Feature name** and description
- **Status** (Added, Removed, Modified)

---

**Maintenance Guidelines:**
- Only include features that exist in production
- Remove features from this list when they are deprecated/removed
- Update version numbers with each deployment
- Keep entries organized chronologically
- Document feature flags and their purposes
