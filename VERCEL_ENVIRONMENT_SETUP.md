# 🔧 Vercel Environment & Branch Setup Guide

## **Current Issue**
Your development environment is showing the `main` branch instead of the `development` branch. This is because Vercel needs proper environment variable configuration for each branch.

## **Solution: Environment Variables in Vercel Dashboard**

### **Step 1: Configure Environment Variables**

Go to your Vercel dashboard: https://vercel.com/dashboard

#### **For `fan-club-z-dev` Project:**

1. **Click on:** `fan-club-z-dev` project
2. **Go to:** Settings → Environment Variables
3. **Add these variables:**

#### **Development Environment (development branch):**
```
Name: VITE_ENVIRONMENT
Value: development
Environment: Development

Name: VITE_DEBUG
Value: true
Environment: Development
```

#### **Preview Environment (staging branch):**
```
Name: VITE_ENVIRONMENT
Value: staging
Environment: Preview

Name: VITE_DEBUG
Value: false
Environment: Preview
```

#### **Production Environment (main branch):**
```
Name: VITE_ENVIRONMENT
Value: production
Environment: Production

Name: VITE_DEBUG
Value: false
Environment: Production
```

### **Step 2: Branch Deployment Configuration**

Vercel automatically deploys based on Git branches:
- **`development` branch** → Development environment (with debug enabled)
- **`staging` branch** → Preview environment (staging)
- **`main` branch** → Production environment (no debug)

### **Step 3: Test the Setup**

#### **Test Development Environment:**
```bash
# Make sure you're on development branch
git checkout development

# Make a change and deploy
echo "// Test change" >> client/src/App.tsx
git add .
git commit -m "test: development environment"
git push origin development
```

#### **Test Production Environment:**
```bash
# Switch to main branch
git checkout main

# Deploy to production
npm run deploy:production
```

## **Expected Results**

### **Development Environment (`development` branch):**
- **URL:** https://fan-club-z-dev.vercel.app (or custom domain)
- **Environment:** `development`
- **Debug:** `enabled`
- **Features:** Debug info, development tools

### **Staging Environment (`staging` branch):**
- **URL:** https://fan-club-z-dev.vercel.app (or custom domain)
- **Environment:** `staging`
- **Debug:** `disabled`
- **Features:** Production-like, no debug info

### **Production Environment (`main` branch):**
- **URL:** https://fan-club-z-dev.vercel.app (or custom domain)
- **Environment:** `production`
- **Debug:** `disabled`
- **Features:** No test tags, no debug info

## **Verification Steps**

1. **Check Environment Variables:**
   - Go to Vercel dashboard → Project Settings → Environment Variables
   - Verify each environment has the correct variables

2. **Check Branch Linking:**
   - Go to Vercel dashboard → Project Settings → Git
   - Verify branch deployments are configured

3. **Test Deployments:**
   - Deploy from each branch
   - Check the environment variables are applied correctly

## **Custom Domain Setup**

After environment variables are configured:

### **For Development:**
- Domain: `dev.fanclubz.app`
- Branch: `development`
- Environment: `development`

### **For Staging:**
- Domain: `staging.fanclubz.app`
- Branch: `staging`
- Environment: `staging`

### **For Production:**
- Domain: `app.fanclubz.app`
- Branch: `main`
- Environment: `production`

## **Troubleshooting**

### **If development still shows main branch:**
1. Check environment variables are set correctly
2. Verify you're pushing to the `development` branch
3. Check Vercel deployment logs

### **If environment variables don't work:**
1. Redeploy after adding variables
2. Check variable names match exactly
3. Verify environment selection is correct

### **If custom domains don't work:**
1. Wait for DNS propagation (24-48 hours)
2. Check DNS records are correct
3. Verify domain configuration in Vercel

## **Next Steps**

1. ✅ Set up environment variables in Vercel dashboard
2. ✅ Test development deployment
3. ✅ Test staging deployment
4. ✅ Test production deployment
5. ⏳ Configure custom domains
6. ⏳ Set up DNS records

---

**Important:** Environment variables must be set in the Vercel dashboard, not in the vercel.json file, for branch-specific deployments to work correctly. 