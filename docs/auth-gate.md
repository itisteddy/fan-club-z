# Auth Gate Architecture - Fan Club Z v2.0.77

## Overview

Fan Club Z implements a **content-first authentication architecture** that allows users to browse and view content without authentication, while gating write actions behind a seamless auth sheet.

## Core Principles

1. **Content-First**: Public pages load immediately without auth barriers
2. **Action-Gated**: Write actions trigger auth sheet when user is not authenticated
3. **Resume-After-Auth**: Actions resume automatically after successful authentication
4. **No Route Blocking**: No pages are completely blocked behind authentication

## Architecture Components

### 1. AuthSheetProvider

The central provider that manages auth sheet state and provides context to the entire app.

```typescript
interface AuthSheetContextType {
  isOpen: boolean;
  openAuth: (options: { reason: string; returnTo?: string; actionData?: any }) => void;
  closeAuth: () => void;
  reason: string;
  returnTo: string | null;
  actionData: any;
}
```

### 2. withAuthGate Hook

A higher-order function that wraps actions with authentication gating:

```typescript
const withAuthGate = <T extends any[]>(
  actionName: string,
  actionFn: (...args: T) => void | Promise<void>
) => {
  return (...args: T) => {
    const { isAuthenticated } = useAuthStore();
    const { openAuth } = useAuthSheet();
    const [location] = useLocation();

    if (!isAuthenticated) {
      openAuth({
        reason: actionName,
        returnTo: location,
        actionData: {
          resumeAction: () => actionFn(...args)
        }
      });
      return;
    }

    actionFn(...args);
  };
};
```

### 3. ProtectedRoute Component

For routes that require authentication (wallet, profile):

```typescript
const ProtectedRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback }) => {
  const { isAuthenticated } = useAuthStore();
  const { openAuth } = useAuthSheet();
  const [location] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      openAuth({
        reason: 'wallet', // or 'profile'
        returnTo: location
      });
    }
  }, [isAuthenticated, openAuth, location]);

  if (!isAuthenticated) {
    return fallback || <LoadingSpinner message="Redirecting to sign in..." />;
  }

  return <>{children}</>;
};
```

## Route Classification

### Public Routes (No Auth Required)
- `/` - Discover page
- `/discover` - Discover page
- `/prediction/:id` - Prediction details
- `/profile/:userId` - Other users' profiles

### Protected Routes (Auth Required)
- `/predictions` - My predictions
- `/create` - Create prediction
- `/profile` - My profile
- `/wallet` - Wallet

## Action Gating Examples

### Place Prediction
```typescript
const handleSubmitInternal = async () => {
  // Validation logic
  // Place prediction logic
};

const handleSubmit = withAuthGate('place_prediction', handleSubmitInternal);
```

### Comment Submission
```typescript
const handleSubmitCommentInternal = async () => {
  // Comment submission logic
};

const handleSubmitComment = withAuthGate('comment', handleSubmitCommentInternal);
```

### Like Action
```typescript
const handleLikeInternal = async () => {
  // Like toggle logic
};

const handleLike = withAuthGate('like', handleLikeInternal);
```

## Resume-After-Auth Flow

1. **User Action**: User clicks "Place Prediction" while not authenticated
2. **Auth Gate**: `withAuthGate` detects no auth and opens auth sheet
3. **State Preservation**: Action data and return URL are stored
4. **Authentication**: User signs in via auth sheet
5. **Resume**: After successful auth, the original action is automatically executed
6. **Navigation**: User is returned to the intended location

## Auth Sheet Messages

The auth sheet shows contextual messages based on the action:

- `place_prediction`: "Sign in to place your prediction"
- `comment`: "Sign in to add a comment"
- `reply`: "Sign in to reply"
- `like`: "Sign in to like this prediction"
- `follow`: "Sign in to follow this user"
- `wallet`: "Sign in to access your wallet"
- `profile`: "Sign in to view your profile"

## Implementation Checklist

### ✅ Completed
- [x] AuthSheetProvider implementation
- [x] withAuthGate hook
- [x] Content-first routing in App.tsx
- [x] PlacePredictionModal auth gating
- [x] CommentsModal auth gating
- [x] Like button auth gating
- [x] ProtectedRoute for wallet/profile
- [x] Service worker version detection
- [x] Version.json for cache busting

### 🔄 In Progress
- [ ] Follow button auth gating (if exists)
- [ ] UI consistency improvements
- [ ] Production verification

## Benefits

1. **Better UX**: Users can browse content immediately
2. **Higher Conversion**: Reduced friction for content discovery
3. **Seamless Auth**: Actions resume automatically after sign-in
4. **Mobile Optimized**: Sheet-based auth works well on mobile
5. **Deep Linking**: Public URLs work without authentication

## Migration Notes

- Removed global `AuthGuard` that blocked all routes
- Replaced with `AuthInitializer` that only shows loading during initial auth check
- All write actions now use `withAuthGate` instead of inline auth checks
- Service worker cache version bumped to prevent stale auth gates
