# Fan Club Z - Configuration Guide

## 🎯 Overview

This guide explains the centralized configuration system implemented for Fan Club Z, designed to make environment management and deployment easier.

## 📁 Configuration Files

### Frontend (Client)
- **`client/src/lib/config.ts`** - Centralized configuration loader
- **`client/env.example`** - Example environment variables
- **`client/.env.local`** - Local development environment (create this)

### Backend (Server)
- **`server/src/config.ts`** - Centralized configuration loader
- **`server/env.example`** - Example environment variables
- **`server/.env`** - Local development environment (create this)

## 🔧 Setup Instructions

### 1. Frontend Setup

1. **Copy the example file:**
   ```bash
   cd client
   cp env.example .env.local
   ```

2. **Edit `.env.local` with your values:**
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:5001/api
   VITE_BASE_URL=http://localhost:3000
   VITE_SERVER_PORT=5001
   
   # Feature Flags
   VITE_DEMO_MODE=true
   VITE_ENABLE_NOTIFICATIONS=true
   
   # External Services
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

### 2. Backend Setup

1. **Copy the example file:**
   ```bash
   cd server
   cp env.example .env
   ```

2. **Edit `.env` with your values:**
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5001
   HOST=0.0.0.0
   
   # Database Configuration
   DATABASE_URL=postgresql://postgres:password@localhost:5432/fanclubz
   
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   
   # CORS Configuration
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   
   # Feature Flags
   ENABLE_DEMO_MODE=true
   ENABLE_NOTIFICATIONS=true
   ```

## 🌍 Environment Variables

### Frontend Variables (VITE_ prefix required)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | Auto-detected | No |
| `VITE_BASE_URL` | Frontend base URL | Auto-detected | No |
| `VITE_SERVER_PORT` | Backend server port | 5001 | No |
| `VITE_DEMO_MODE` | Enable demo mode | true | No |
| `VITE_ENABLE_NOTIFICATIONS` | Enable notifications | true | No |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | null | No |
| `VITE_APP_NAME` | Application name | "Fan Club Z" | No |
| `VITE_APP_VERSION` | Application version | "1.0.0" | No |

### Backend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | "development" | No |
| `PORT` | Server port | 5001 | No |
| `HOST` | Server host | "0.0.0.0" | No |
| `DATABASE_URL` | Database connection string | - | **Yes** |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `JWT_EXPIRES_IN` | JWT expiration time | "24h" | No |
| `CORS_ORIGINS` | Allowed CORS origins | Auto-detected | No |
| `ENABLE_DEMO_MODE` | Enable demo mode | true | No |
| `ENABLE_NOTIFICATIONS` | Enable notifications | true | No |
| `APP_NAME` | Application name | "Fan Club Z" | No |
| `APP_VERSION` | Application version | "1.0.0" | No |

## 🚀 Environment-Specific Configurations

### Development
```env
# Frontend (.env.local)
VITE_DEMO_MODE=true
VITE_API_URL=http://localhost:5001/api

# Backend (.env)
NODE_ENV=development
ENABLE_DEMO_MODE=true
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Staging
```env
# Frontend (.env.staging)
VITE_DEMO_MODE=false
VITE_API_URL=https://staging-api.fanclubz.app/api

# Backend (.env.staging)
NODE_ENV=staging
ENABLE_DEMO_MODE=false
CORS_ORIGINS=https://staging.fanclubz.app
```

### Production
```env
# Frontend (.env.production)
VITE_DEMO_MODE=false
VITE_API_URL=https://api.fanclubz.app/api

# Backend (.env.production)
NODE_ENV=production
ENABLE_DEMO_MODE=false
CORS_ORIGINS=https://fanclubz.app,https://www.fanclubz.app
```

## 🔒 Security Best Practices

### 1. Never Commit Secrets
- **✅ Good:** Use `.env` files (already in `.gitignore`)
- **❌ Bad:** Hardcode secrets in source code
- **❌ Bad:** Commit `.env` files to git

### 2. Use Strong Secrets
```env
# ✅ Good - Use a strong, random secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# ❌ Bad - Weak, predictable secret
JWT_SECRET=secret123
```

### 3. Environment-Specific Secrets
- Use different secrets for each environment
- Rotate secrets regularly in production
- Use secret management services (AWS Secrets Manager, etc.)

## 🔄 Migration Guide

### From Old Configuration

**Before (hardcoded):**
```typescript
// Old way - hardcoded values
const API_URL = 'http://localhost:5001/api'
const JWT_SECRET = 'fan-club-z-secret-key'
```

**After (environment-driven):**
```typescript
// New way - centralized config
import { config } from './config'

const API_URL = config.apiUrl
const JWT_SECRET = config.jwtSecret
```

### Benefits of New System

1. **Easy Environment Switching**
   - Change one file to switch environments
   - No code changes needed

2. **Security**
   - No secrets in source code
   - Environment-specific secrets

3. **Deployment Ready**
   - Works with cloud platforms
   - Supports CI/CD pipelines

4. **Team Collaboration**
   - Clear documentation of required variables
   - Example files for easy setup

## 🐛 Troubleshooting

### Common Issues

1. **"Configuration validation failed"**
   - Check that required environment variables are set
   - Verify `.env` files exist and are properly formatted

2. **"Cannot find name 'config'"**
   - Ensure you're importing from the correct path
   - Check that the config file exists

3. **"VITE_ variables not working"**
   - Verify variables are prefixed with `VITE_`
   - Restart the development server after changes

4. **"Database connection failed"**
   - Check `DATABASE_URL` format
   - Verify database is running and accessible

### Debug Configuration

**Frontend:**
```typescript
import { config, validateConfig } from './lib/config'

// Validate configuration
validateConfig()

// Log current config (development only)
if (config.isDevelopment) {
  console.log('Frontend Config:', config)
}
```

**Backend:**
```typescript
import { config, validateConfig } from './config'

// Validate configuration
validateConfig()

// Log current config (development only)
if (config.nodeEnv === 'development') {
  console.log('Backend Config:', config)
}
```

## 📋 Checklist

### Setup Checklist
- [ ] Copied `env.example` to `.env` (backend)
- [ ] Copied `env.example` to `.env.local` (frontend)
- [ ] Set `DATABASE_URL` to your database
- [ ] Set `JWT_SECRET` to a strong secret
- [ ] Configured `CORS_ORIGINS` for your domains
- [ ] Set feature flags as needed
- [ ] Tested configuration validation

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use production database URL
- [ ] Set strong, unique `JWT_SECRET`
- [ ] Configure production CORS origins
- [ ] Set `ENABLE_DEMO_MODE=false`
- [ ] Configure Stripe keys (if using payments)
- [ ] Set up monitoring and logging
- [ ] Test all functionality

## 🎯 Next Steps

1. **Test the configuration** by running both frontend and backend
2. **Set up different environments** (staging, production)
3. **Integrate with your deployment platform** (Vercel, Heroku, AWS, etc.)
4. **Set up CI/CD** to use environment variables
5. **Monitor and rotate secrets** regularly

---

**Need help?** Check the troubleshooting section or create an issue in the repository. 