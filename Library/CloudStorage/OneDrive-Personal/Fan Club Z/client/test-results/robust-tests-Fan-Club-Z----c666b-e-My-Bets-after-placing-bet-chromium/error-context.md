# Page snapshot

```yaml
- text: Z
- heading "Welcome to Fan Club Z" [level=1]
- paragraph: Sign in to your account
- button "Continue with Apple":
  - img
  - text: Continue with Apple
- button "Continue with Google":
  - img
  - text: Continue with Google
- text: or Email Address
- img
- textbox "Email Address"
- text: Password
- img
- textbox "Password"
- button:
  - img
- button "Forgot password?"
- button "Sign In"
- paragraph:
  - text: Don't have an account?
  - link "Sign up":
    - /url: /auth/register
    - button "Sign up"
```