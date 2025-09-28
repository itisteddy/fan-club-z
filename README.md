# Fan Club Z v2.0 - Social Predictions Platform

## 🚨 Production Freeze Mode

**Current Status**: Deployment freeze active on branch `release/production-freeze`

- **Rollback Tag**: `v2.0.77-freeze`
- **Only deployment configuration changes permitted**
- **All application code changes are blocked by CI**

## Quick Start (Development)

```bash
# Clone and install dependencies
pnpm install

# Start development servers
cd server && pnpm dev  # Backend on :3001
cd client && pnpm dev  # Frontend on :5177
```

## Environment Setup

### Development (.env)

```bash
# API Configuration
VITE_API_BASE=/api

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags
VITE_IMAGES_FEATURE_FLAG=false
VITE_IMAGES_PROVIDER=none
```

### Production

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete production deployment guide.

**Required Production Variables**:
- `VITE_API_BASE=/api`
- `VITE_IMAGES_FEATURE_FLAG=false` 
- `VITE_IMAGES_PROVIDER=none`
- `VITE_SUPABASE_URL` (set in hosting dashboard)
- `VITE_SUPABASE_ANON_KEY` (set in hosting dashboard)

## Architecture

- **Frontend**: Vite + React + TypeScript (client/)
- **Backend**: Node.js + Express + Supabase (server/)
- **Database**: Supabase PostgreSQL
- **Hosting**: Vercel (frontend) + Render (backend)

## Deployment

### Production Freeze Guardrails

```bash
# Check for freeze violations
cd client && node scripts/enforce-freeze.mjs

# Run full preflight check
pnpm clean && pnpm lint && pnpm typecheck && pnpm build
```

### Allowed Files During Freeze

- `vercel.json`, `render.yaml` - hosting configuration
- `.github/workflows/` - CI/CD pipelines
- `client/src/config/env.schema.ts` - environment validation only
- `README.md`, `docs/` - documentation
- `client/scripts/enforce-freeze.mjs` - deployment tools

### Forbidden During Freeze

- `client/src/pages/`, `client/src/components/` - UI components
- `client/src/stores/`, `client/src/auth/` - business logic
- `client/package.json` - no dependency changes
- Any routing, providers, or application logic

## Scripts

```bash
# Development
pnpm dev          # Start both frontend and backend
pnpm build        # Build production assets
pnpm test         # Run test suite

# Deployment Safety
pnpm preflight    # Full pre-deployment check
node client/scripts/enforce-freeze.mjs  # Freeze violation check
node client/scripts/check-duplicates.mjs # Duplicate file check

# Database
cd server && pnpm db:setup    # Initialize database with sample data
cd server && pnpm db:migrate  # Run migrations
```

## Key Features

- **Content-First Auth**: Browse predictions without login, auth required for actions
- **Real-Time Comments**: Supabase-powered commenting system
- **Mobile-First UI**: Responsive design optimized for mobile devices
- **Progressive Web App**: PWA support with offline capabilities
- **Error Boundaries**: Graceful error handling throughout the app

## Technology Stack

### Frontend
- **Vite 4** - Fast build tooling
- **React 18** - UI framework with Suspense
- **TypeScript 5** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **React Router 6** - Client-side routing

### Backend
- **Node.js 20** - Runtime environment
- **Express** - Web framework
- **Supabase** - Database and authentication
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens

### Deployment
- **Vercel** - Frontend hosting with edge functions
- **Render** - Backend hosting
- **Supabase** - Database hosting and auth
- **GitHub Actions** - CI/CD pipeline

## Contributing

**During Production Freeze**: Only deployment configuration changes accepted.

**Normal Development**:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment process
- [API Documentation](server/README.md) - Backend API reference
- [Component Library](client/src/components/README.md) - UI components

## Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Documentation**: Check `docs/` directory for detailed guides
- **Emergency**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for rollback procedures

## License

Private - Fan Club Z proprietary software

---

**Version**: v2.0.77-freeze  
**Last Updated**: Production Freeze Deployment  
**Status**: ✅ Ready for Production Deployment
