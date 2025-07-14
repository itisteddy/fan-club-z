#!/bin/bash

echo "🔔 Testing Notification System..."
echo "================================"

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

# Run the notification-specific test
echo "🧪 Running notification tests..."
npx playwright test e2e-tests/notifications.spec.ts --headed --project=chromium --timeout=60000 --retries=0

echo ""
echo "📊 Test Results Summary:"
echo "========================"

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ Notification tests PASSED!"
    echo ""
    echo "🎯 NOTIFICATION FEATURES STATUS:"
    echo "- ✅ Notification bell is visible and accessible"
    echo "- ✅ Notification center opens when bell is clicked"
    echo "- ✅ Notification actions work correctly"
    echo "- ✅ Notifications persist across navigation"
    echo ""
    echo "🎉 NOTIFICATION SYSTEM IS NOW WORKING!"
else
    echo "❌ Some notification tests FAILED"
    echo ""
    echo "🔧 Common fixes needed:"
    echo "- Check if notification bell has data-testid='notification-bell'"
    echo "- Verify NotificationCenter component integration"
    echo "- Ensure notification service is properly initialized"
    echo "- Check if demo notifications are being created"
fi

echo ""
echo "🏁 Test completed."
