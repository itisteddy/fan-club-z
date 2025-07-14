#!/bin/bash

echo "🔧 Setting up diagnostic environment..."

# Make diagnostic scripts executable
chmod +x quick-react-test.sh
chmod +x diagnose-runtime-errors.sh

echo "✅ Diagnostic scripts are now executable"
echo ""
echo "🚀 Next steps:"
echo "1. Run: ./quick-react-test.sh (30 seconds)"
echo "2. If issues found, run: ./diagnose-runtime-errors.sh (2-3 minutes)"
echo ""
echo "📋 The quick test will identify the Babel parser error and show you exactly which file has the syntax issue."
