# Supabase Password Reset Configuration Guide

## Problem: Reset Link Expiring Too Quickly

If your password reset links are expiring too quickly, you need to configure the expiration time in Supabase Dashboard.

---

## Solution: Increase Token Expiration Time

### Step 1: Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Select your project: **Asaan Zindagi**
3. Go to **Authentication** → **URL Configuration**

### Step 2: Configure Redirect URLs

1. **Site URL**: Set to your app URL
   - Development: `http://localhost:8080`
   - Production: Your production URL

2. **Redirect URLs**: Add these URLs:
   - `http://localhost:8080/reset-password`
   - `http://localhost:8080/**` (for development)
   - Your production URL + `/reset-password` (for production)

### Step 3: Configure Email Templates (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Find **"Reset Password"** template
3. The expiration time is controlled by Supabase's default settings

### Step 4: Check JWT Settings (If Available)

1. Go to **Settings** → **API**
2. Look for **JWT Settings** or **Token Expiration**
3. Default password reset token expiration is usually **1 hour**

**Note**: Supabase doesn't allow changing password reset token expiration directly in the dashboard. The default is typically 1 hour.

---

## Alternative: Handle Expiration Better in Code

The code has been updated to:
- Check token expiration before using it
- Show a clear error message if expired
- Redirect to forgot password page to request a new link

---

## Testing Tips

1. **Request reset link immediately after receiving email**
2. **Click the link as soon as you receive it**
3. **Complete the reset process quickly**

If links are still expiring too quickly:
- Check your email delivery time (some email providers delay)
- Request a new link if the current one expires
- The system will guide you to request a new link if expired

---

## Current Default Behavior

- **Token Expiration**: 1 hour (Supabase default)
- **Session Handling**: Improved to handle expiration gracefully
- **User Experience**: Clear error messages and redirect to request new link

---

## Need Longer Expiration?

If you need longer than 1 hour, you may need to:
1. Contact Supabase support
2. Use a custom email service with longer expiration
3. Implement a custom password reset flow

For most use cases, 1 hour should be sufficient if users click the link promptly after receiving the email.

