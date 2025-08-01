# Fan Club Z - Development & Deployment Workflow

## Current Setup
- **Frontend**: Vercel (fanclubz-version-2-0.vercel.app)
- **Backend**: Render (fan-club-z.onrender.com) 
- **Database**: Supabase
- **Repository**: GitHub

## Recommended Development Workflow

### 1. Branch Strategy
```
main (production)
├── development (staging)
├── feature/improvement-name
└── hotfix/urgent-fix-name
```

### 2. Development Process

#### For New Features:
```bash
# 1. Start from development branch
git checkout development
git pull origin development

# 2. Create feature branch
git checkout -b feature/ui-improvements
# or
git checkout -b feature/new-prediction-flow

# 3. Make changes and commit
git add .
git commit -m "feat: improve prediction card UI"

# 4. Push and create PR
git push origin feature/ui-improvements
# Create PR to development branch (not main)
```

#### For Hotfixes:
```bash
# 1. Create hotfix from main
git checkout main
git checkout -b hotfix/critical-bug-fix

# 2. Fix and commit
git add .
git commit -m "fix: resolve prediction submission error"

# 3. Push and create PR to both development and main
git push origin hotfix/critical-bug-fix
```

### 3. Deployment Environments

#### Production (Current)
- **Branch**: `main`
- **Frontend**: fanclubz-version-2-0.vercel.app
- **Backend**: fan-club-z.onrender.com
- **Deploy**: Manual merge to main

#### Staging (Recommended Setup)
- **Branch**: `development`
- **Frontend**: fanclubz-staging.vercel.app
- **Backend**: fan-club-z-staging.onrender.com
- **Deploy**: Auto-deploy on push to development

#### Feature Testing
- **Branch**: feature/*
- **Frontend**: Vercel preview deployments
- **Backend**: Use staging backend
- **Deploy**: Auto-deploy on PR creation

## Quick Commands

### Start Development
```bash
npm run dev
```

### Test Build Locally
```bash
npm run build
npm run check-build
```

### Quick Save Work
```bash
npm run save-work "your commit message"
```

### Deploy to Staging (after setup)
```bash
git push origin development
```

### Deploy to Production
```bash
# Via PR merge to main, or:
git checkout main
git merge development
git push origin main
```

## Environment Variables
- Production: Set in Vercel/Render dashboards
- Development: Use .env.development
- Local: Use .env.local

## Testing Strategy
1. **Local Testing**: `npm run dev`
2. **Staging Testing**: Push to development branch
3. **Production Testing**: Merge to main after staging approval
