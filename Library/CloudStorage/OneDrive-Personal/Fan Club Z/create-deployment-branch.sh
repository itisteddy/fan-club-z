#!/bin/bash

echo "🚀 Creating deployment branch for Fan Club Z..."

# Navigate to project root
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"

# Create deployment branch
git checkout -b deployment

# Add all files
git add .

# Commit changes
git commit -m "Prepare for production deployment"

# Push to origin
git push origin deployment

echo "✅ Deployment branch created and pushed!"
