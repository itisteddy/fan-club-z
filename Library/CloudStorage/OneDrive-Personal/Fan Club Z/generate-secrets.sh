#!/bin/bash

echo "🔐 Generating secure JWT secrets for production..."

echo "JWT_SECRET:"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

echo ""
echo "JWT_REFRESH_SECRET:"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

echo ""
echo "✅ Copy these secrets and update your .env.production file"
echo "⚠️  Keep these secrets secure and never commit them to version control!"
