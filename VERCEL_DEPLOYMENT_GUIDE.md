# VERCEL DEPLOYMENT CONFIGURATION GUIDE
# Complete setup for secure-gate-react-deploy.vercel.app

## 🚀 QUICK DEPLOYMENT STEPS

### 1. Push Updates to GitHub
```bash
git add .
git commit -m "Configure production deployment settings"
git push origin main
```

### 2. Configure Vercel Environment Variables
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

**Frontend Variables:**
```
REACT_APP_API_URL = https://secure-gate-react-deploy.vercel.app
REACT_APP_BASE_URL = https://secure-gate-react-deploy.vercel.app
NODE_ENV = production
```

**Backend Variables:**
```
NODE_ENV = production
DATABASE_URL = [Your database connection string]
JWT_SECRET = [Generate 32+ character secret]
JWT_REFRESH_SECRET = [Generate 32+ character secret]  
SESSION_SECRET = [Generate 32+ character secret]
FRONTEND_URL = https://secure-gate-react-deploy.vercel.app
CORS_ORIGIN = https://secure-gate-react-deploy.vercel.app
```

**Email Variables (After Mailgun setup):**
```
EMAIL_PROVIDER = mailgun
MAILGUN_API_KEY = [Your Mailgun API key]
MAILGUN_DOMAIN = [Your Mailgun domain]
MAILGUN_BASE_URL = https://api.mailgun.net
EMAIL_FROM = noreply@[your-mailgun-domain]
EMAIL_FROM_NAME = Secure Gate Access
```

### 3. Redeploy
After adding environment variables, trigger a new deployment:
- Push a small change to GitHub, or
- Use Vercel dashboard "Redeploy" button

## 🔧 CURRENT ISSUES TO ADDRESS

### Issue 1: Backend Deployment
**Problem**: Current setup might not properly deploy the Node.js backend
**Solution**: 
1. Create separate Vercel project for backend, or
2. Use Vercel's full-stack configuration in vercel.json

### Issue 2: Database Connection
**Problem**: No production database configured
**Solution**: 
1. Set up Vercel Postgres addon, or
2. Use external database service (Neon, Supabase, etc.)

### Issue 3: Domain Routing
**Problem**: Frontend and backend need proper routing
**Solution**: Configure vercel.json for API routing

## 📋 IMMEDIATE ACTION ITEMS

1. **Test Current Deployment**: Visit https://secure-gate-react-deploy.vercel.app
2. **Check Console**: Look for API connection errors
3. **Setup Database**: Configure production database
4. **Configure Mailgun**: Follow Mailgun production setup
5. **Test Full Flow**: Complete registration → email → login flow

## 🎯 TESTING CHECKLIST

Once configured, test these features:
- [ ] Homepage loads
- [ ] Registration form submits
- [ ] Email notifications sent
- [ ] OTP verification works
- [ ] Login functionality
- [ ] Dashboard access
- [ ] Visitor management
- [ ] SMS notifications (Africa's Talking)

## 🔐 SECURITY NOTES

- All secrets should be stored in Vercel environment variables
- Enable HTTPS enforcement
- Configure proper CORS origins
- Set up monitoring and logging
- Test rate limiting functionality

## 📞 NEXT STEPS AFTER BASIC SETUP

1. **Custom Domain**: Add your own domain in Vercel
2. **SSL Certificate**: Automatic with Vercel
3. **Performance**: Monitor Core Web Vitals
4. **Analytics**: Set up monitoring
5. **Backup**: Configure database backups
