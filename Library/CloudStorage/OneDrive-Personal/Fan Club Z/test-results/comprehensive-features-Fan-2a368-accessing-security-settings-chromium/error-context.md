# Page snapshot

```yaml
- dialog "Security Settings":
  - heading "Security Settings" [level=2]:
    - img
    - text: Security Settings
  - img
  - heading "Change Password" [level=3]
  - text: Current Password
  - textbox "Enter current password"
  - button:
    - img
  - text: New Password
  - textbox "Enter new password"
  - button:
    - img
  - text: Confirm New Password
  - textbox "Confirm new password"
  - button:
    - img
  - button "Update Password"
  - img
  - heading "Two-Factor Authentication" [level=3]
  - button "Enable"
  - paragraph: Add an extra layer of security to your account by enabling two-factor authentication.
  - img
  - paragraph: Two-factor authentication requires a mobile device with an authenticator app.
  - img
  - heading "Account Security" [level=3]
  - paragraph: Login History
  - paragraph: "Last login: Today at 2:30 PM"
  - button "View"
  - paragraph: Active Sessions
  - paragraph: 1 active session
  - button "Manage"
  - button "Close":
    - img
    - text: Close
```