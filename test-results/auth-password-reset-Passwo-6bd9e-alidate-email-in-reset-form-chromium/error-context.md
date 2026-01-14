# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Skip to main content" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e6]:
    - generic [ref=e7]:
      - img [ref=e9]
      - heading "Reset Password" [level=1] [ref=e11]
      - paragraph [ref=e12]: Enter your email and we'll send you a reset link
    - generic [ref=e14]:
      - generic [ref=e17]:
        - textbox "Email Address" [ref=e18]:
          - /placeholder: ""
        - generic: Email Address*
      - generic [ref=e19]:
        - button "Send Reset Link" [disabled]:
          - generic:
            - generic: Send Reset Link
        - button "Back to Sign In" [ref=e20] [cursor=pointer]
    - paragraph [ref=e22]: 💡 Press Ctrl + Enter to sign in
```