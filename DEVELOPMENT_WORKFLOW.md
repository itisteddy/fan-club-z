# Fan Club Z - Development Workflow Guide

## 🎯 Overview
This guide ensures proper development workflow with separate development and production environments.

## 🌿 Branch Strategy

### **Development Branch (`development`)**
- **Purpose**: Active development and testing
- **Deployment**: Development environment
- **URL**: Development-specific Vercel deployment
- **Safety**: Safe to experiment and break things

### **Main Branch (`main`)**
- **Purpose**: Production-ready code
- **Deployment**: Production environment
- **URL**: https://app.fanclubz.app
- **Safety**: Must be stable and tested

## 🚀 Development Workflow

### **1. Starting Development Work**
```bash
# Always start from development branch
git checkout development
git pull origin development
```

### **2. Making Changes**
```bash
# Make your changes
# Test locally
npm run dev

# Commit changes to development
git add .
git commit -m "feat: your feature description"
git push origin development
```

### **3. Deploying to Development**
```bash
# Use the development deployment script
./deploy-dev.sh
```

### **4. Testing in Development Environment**
- Test all features thoroughly
- Ensure no breaking changes
- Get feedback from team/stakeholders

### **5. Promoting to Production**
```bash
# Switch to main branch
git checkout main

# Merge development into main
git merge development

# Deploy to production
./deploy-production.sh
```

## 📋 Deployment Scripts

### **Development Deployment**
```bash
./deploy-dev.sh
```
- ✅ Checks you're on development branch
- ✅ Pulls latest changes
- ✅ Verifies no uncommitted changes
- ✅ Deploys to development environment

### **Production Deployment**
```bash
./deploy-production.sh
```
- ✅ Checks you're on main branch
- ✅ Pulls latest changes
- ✅ Verifies no uncommitted changes
- ✅ Deploys to production environment

## 🔒 Safety Measures

### **Branch Protection**
- **Development**: Safe to experiment
- **Main**: Must be stable and tested

### **Deployment Safety**
- Scripts prevent wrong-branch deployments
- Uncommitted changes are blocked
- Automatic environment variable management

### **Environment Separation**
- **Development**: Uses development environment variables
- **Production**: Uses production environment variables

## 🛠️ Quick Commands

### **Check Current Branch**
```bash
git branch --show-current
```

### **Switch to Development**
```bash
git checkout development
```

### **Switch to Main**
```bash
git checkout main
```

### **View Deployment Status**
```bash
vercel ls
```

## 📝 Best Practices

1. **Always work on development branch** for new features
2. **Test thoroughly** before merging to main
3. **Use descriptive commit messages**
4. **Deploy to development first** for testing
5. **Only merge to main** when ready for production
6. **Use deployment scripts** to prevent mistakes

## 🚨 Emergency Procedures

### **If you accidentally deploy from wrong branch**
1. Immediately stop the deployment if possible
2. Check which environment was affected
3. Rollback if necessary
4. Fix the issue and redeploy correctly

### **If development environment is broken**
1. Check the development branch
2. Fix the issue locally
3. Test thoroughly
4. Redeploy to development

### **If production environment is broken**
1. Check the main branch
2. Identify the issue
3. Fix and test on development first
4. Merge to main and redeploy

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review the deployment scripts
3. Check Vercel dashboard for deployment status
4. Contact the development team

---

**Remember**: Development branch is for experimenting, Main branch is for production-ready code! 🎯
