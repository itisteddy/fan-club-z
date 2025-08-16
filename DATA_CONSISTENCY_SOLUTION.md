# UNIFIED DATA CONSISTENCY FIX

## Problem: Two Data Sources Causing Inconsistency

### Current Architecture Issues:
1. **PredictionCard** → uses `useCommentStore()` + `useLikeStore()` → **Supabase direct**
2. **Comment Components** → use `useComments()` hooks → **API endpoints**
3. **Result**: Different counts shown in different parts of UI

## Solution: Unified API-First Approach

### Strategy:
- **Remove direct Supabase calls** from client stores
- **Centralize all data through API endpoints**
- **Ensure consistent response formats**

## Implementation Steps:

### 1. Update Comment/Like Stores to Use API Instead of Supabase

#### A. Update `likeStore.ts` to use API endpoints:
```typescript
// Change from Supabase direct calls to API calls
toggleLike: async (predictionId: string) => {
  const response = await apiClient.post(`/v2/predictions/${predictionId}/like`);
  // Update local state based on API response
}
```

#### B. Update `commentStore.ts` to use API endpoints:
```typescript
// Change from Supabase direct calls to API calls  
getCommentCount: (predictionId: string) => {
  // Get from API-fetched data instead of direct Supabase query
}
```

### 2. Ensure Server API Returns Consistent Formats

#### A. Fix comments-fixed.ts response format:
```json
{
  "success": true,
  "comments": [...],
  "total": 5,
  "hasMore": false
}
```

#### B. Fix predictions.ts likes endpoint:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likes_count": 15
  }
}
```

### 3. Update PredictionCard to Use Unified Data

#### A. Replace store calls with API-derived data:
```typescript
// Instead of:
const commentCount = getCommentCount(prediction.id);

// Use:
const { data: commentsData } = useComments(prediction.id, 1, 1);
const commentCount = commentsData?.pagination?.total || 0;
```

## Files to Modify:

1. `client/src/store/likeStore.ts` - Remove Supabase, use API
2. `client/src/store/commentStore.ts` - Remove Supabase, use API  
3. `client/src/components/PredictionCard.tsx` - Use API-derived data
4. `server/src/routes/comments-fixed.ts` - Ensure consistent format
5. `server/src/routes/predictions.ts` - Ensure consistent format

## Expected Result:

✅ **Single source of truth**: All data through API endpoints
✅ **Consistent counts**: Same data shown everywhere  
✅ **Real persistence**: Data saved to database via server
✅ **No more demo mode**: Production-ready data handling

This will resolve the "Community Engagement shows 0 comments but Comments section shows Comments (1)" issue permanently.
