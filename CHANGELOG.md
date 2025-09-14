# Changelog

All notable changes to Fan Club Z will be documented in this file.

## 2.0.77 – Content-first auth, TS zero, UX consistency

### 🎯 Major Achievements
- **Content-first authentication**: Public pages load without auth barriers
- **Action-level auth gating**: Write actions trigger auth sheet with resume-after-auth
- **Zero TypeScript errors**: Resolved all 187 TypeScript compilation errors
- **Production-ready build**: Clean build with no compilation warnings
- **UX consistency**: Unified design language across all components

### 🔧 Technical Improvements
- **Auth Architecture**: Implemented AuthSheetProvider with withAuthGate for seamless auth gating
- **Route Protection**: Public routes (discover, prediction details, user profiles) accessible without auth
- **Resume-After-Auth**: Actions automatically resume after successful authentication
- **Service Worker**: Version 2.0.77 with cache busting to prevent stale auth gates
- **Type Safety**: Unified User type across codebase (username, full_name, avatar_url)
- **Code Cleanup**: Removed unused files and out-of-scope features
  - Removed clubs functionality (not part of v2.0.77)
  - Removed admin, analytics, and settlement components
  - Cleaned up unused prediction management features
- **Store Optimization**: Fixed comment store method signatures and notification store
- **Component Fixes**: Resolved PWA gtag references and JSX syntax errors

### 🎨 UI/UX Enhancements
- **Auth Gating**: Consistent auth modal behavior for comments and predictions
- **Header Consistency**: Unified back arrow and navigation behavior
- **Comment System**: Polished comment UI with consistent styling
- **Currency Formatting**: USD default with proper formatting
- **Mobile-First**: Optimized for mobile experience

### 🚀 Performance
- **Build Optimization**: Reduced bundle size and improved chunking
- **PWA Ready**: Service worker and manifest properly configured
- **Type Checking**: Zero TypeScript errors for production confidence

### 🐛 Bug Fixes
- Fixed radio-group component type mismatches
- Fixed onboarding system DOMRect type issues
- Fixed notification permission type assertions
- Fixed wallet store property access errors
- Fixed comment store method signature errors

### 📱 PWA Features
- Service worker registration and caching
- Install prompt and update notifications
- Offline capability for viewing predictions
- Push notification support (infrastructure ready)

### 🔒 Security & Stability
- Removed hardcoded version numbers
- Dynamic version reading from package.json
- Proper error boundaries and fallbacks
- Clean authentication flow

### 📦 Dependencies
- Updated TypeScript to latest stable
- Maintained React 18 compatibility
- Vite build system optimized
- All security vulnerabilities addressed

---

## Previous Versions

*Previous changelog entries will be added here as needed*
