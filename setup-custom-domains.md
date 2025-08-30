# 🌐 Custom Domain Setup Guide for Fan Club Z

## **Current Setup Analysis**

From your Vercel dashboard, I can see:
- ✅ Main app deployed: `fan-club-z` project
- ✅ `fanclubz.app` already associated with production
- ✅ Branch linking: `main` → Production deployment

## **Recommended Domain Structure**

| Environment | Domain | Vercel Project | Git Branch | Purpose |
|-------------|--------|----------------|------------|---------|
| **Landing Page** | `fanclubz.app` / `www.fanclubz.app` | `fanclubz-landing` | - | Marketing & entry point |
| **Production App** | `app.fanclubz.app` | `fan-club-z` | `main` | Main application |
| **Staging App** | `staging.fanclubz.app` | `fan-club-z` | `staging` | Testing environment |
| **Development App** | `dev.fanclubz.app` | `fan-club-z` | `development` | Development environment |

## **Step-by-Step Setup**

### **Step 1: Configure Vercel Projects**

#### **For Main App (`fan-club-z` project):**

1. **Go to Vercel Dashboard:** https://vercel.com/dashboard
2. **Click on:** `fan-club-z` project
3. **Go to:** Settings → Domains
4. **Add these domains:**
   - `app.fanclubz.app` (for production)
   - `staging.fanclubz.app` (for staging)
   - `dev.fanclubz.app` (for development)

#### **For Landing Page (`fanclubz-landing` project):**

1. **Go to Vercel Dashboard:** https://vercel.com/dashboard
2. **Click on:** `fanclubz-landing` project
3. **Go to:** Settings → Domains
4. **Add these domains:**
   - `fanclubz.app`
   - `www.fanclubz.app`

### **Step 2: Configure DNS Records**

Add these records to your domain registrar (where you purchased `fanclubz.app`):

```
Type    Name               Value
A       @                  76.76.19.36
CNAME   www               cname.vercel-dns.com
CNAME   app               cname.vercel-dns.com
CNAME   staging           cname.vercel-dns.com
CNAME   dev               cname.vercel-dns.com
```

### **Step 3: Branch Linking Verification**

Ensure your deployments are linked to the correct branches:

- **Development:** `development` branch → `dev.fanclubz.app`
- **Staging:** `staging` branch → `staging.fanclubz.app`
- **Production:** `main` branch → `app.fanclubz.app`

## **Environment-Specific Configurations**

### **Development Environment**
- **Environment:** `development`
- **Debug:** `enabled`
- **Branch:** `development`
- **Domain:** `dev.fanclubz.app`

### **Staging Environment**
- **Environment:** `staging`
- **Debug:** `disabled`
- **Branch:** `staging`
- **Domain:** `staging.fanclubz.app`

### **Production Environment**
- **Environment:** `production`
- **Debug:** `disabled` (no test tags)
- **Branch:** `main`
- **Domain:** `app.fanclubz.app`

## **Deployment Commands**

```bash
# Development deployment
npm run deploy:dev

# Staging deployment
npm run deploy:staging

# Production deployment
npm run deploy:production
```

## **Expected URLs After Setup**

- **Landing Page:** https://fanclubz.app
- **Production App:** https://app.fanclubz.app
- **Staging App:** https://staging.fanclubz.app
- **Development App:** https://dev.fanclubz.app

## **Testing the Setup**

1. **Landing Page:** Should show marketing content with "Launch App" button
2. **Production App:** Should show live application (no debug info)
3. **Staging App:** Should show testing environment
4. **Development App:** Should show development environment with debug info

## **Troubleshooting**

### **If domains don't work:**
1. Check DNS propagation (can take 24-48 hours)
2. Verify DNS records are correct
3. Check Vercel domain configuration

### **If wrong environment shows:**
1. Verify branch linking in Vercel
2. Check deployment scripts
3. Ensure correct vercel.json is used

## **Security Headers (Optional)**

Add these headers in Vercel dashboard → Settings → Domains → Headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

**Next Steps:**
1. Follow the Vercel dashboard steps above
2. Configure DNS records at your domain registrar
3. Test each environment
4. Update landing page links to point to `app.fanclubz.app` 