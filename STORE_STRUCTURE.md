# Fan Club Z Store Structure

## Current Store Organization

All stores are located in `client/src/store/` with the following structure:

### Core Stores
- `authStore.ts` - Authentication and user management
- `walletStore.ts` - Wallet balances and transactions (database-driven)
- `predictionStore.ts` - Predictions and betting functionality
- `clubStore.ts` - Club management and membership
- `notificationStore.ts` - In-app notifications
- `settlementStore.ts` - Prediction settlement system

### Import Pattern
All components should import from `../store/[storeName]`:

```typescript
// ✅ CORRECT
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { usePredictionStore } from '../store/predictionStore';

// ❌ WRONG - Don't use old stores directory
import { useAuthStore } from '../stores/authStore';
```

### Key Principles
1. **Single Source of Truth**: Each store has one file in `client/src/store/`
2. **Database-Driven**: All stores fetch from Supabase, no hardcoded data
3. **Consistent Imports**: All components use the same import pattern
4. **No Duplicates**: No backup files or duplicate store implementations

### Migration History
- ✅ Removed `client/src/stores/` directory (old location)
- ✅ Deleted all backup files and duplicate stores
- ✅ Updated all import statements to use correct paths
- ✅ Verified all stores are database-driven

### Verification Checklist
When making changes to stores:
- [ ] All imports use `../store/` path
- [ ] No hardcoded data in stores
- [ ] All stores fetch from Supabase
- [ ] No backup files created
- [ ] Build passes without errors
- [ ] All components use consistent store imports
