# Frontend Deployment Guide (Netlify)

## 🚀 Quick Deployment Steps

### 1. Connect to Netlify

1. Go to https://app.netlify.com/
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub**
4. Select your repository: `Ray-Njoroge12/secure_gate_react_deploy`
5. Configure build settings:
   - **Base directory**: `secure-gate-access/client`
   - **Build command**: `npm run build`
   - **Publish directory**: `secure-gate-access/client/build`

### 2. Set Environment Variables

In Netlify Dashboard → **Site settings** → **Environment variables**:

```
REACT_APP_API_URL=https://secure-gate-api.onrender.com
REACT_APP_WS_URL=wss://secure-gate-api.onrender.com
REACT_APP_VERSION=1.0.0
CI=false
```

### 3. Trigger Deploy

After setting environment variables:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**

---

## 🔧 Backend CORS Configuration

Make sure your Render backend has the CORS origin set to your Netlify URL:

```
CORS_ORIGIN=https://your-site-name.netlify.app
```

After your Netlify site is deployed, update this to match the actual URL.

---

## ✅ Verify Connection

After both frontend and backend are deployed:

1. Open your Netlify URL in a browser
2. Open browser DevTools (F12) → Network tab
3. The app should make requests to `https://secure-gate-api.onrender.com`
4. Check for any CORS errors

### Test Registration Flow

1. Navigate to the registration page
2. Fill in the form
3. Check that the API call goes to the Render backend
4. Verify the response is successful

---

## 🔄 Auto-Deploy

Both Render and Netlify will auto-deploy when you push to the `main` branch.

---

## 🐛 Troubleshooting

### CORS Errors
If you see CORS errors:
1. Check `CORS_ORIGIN` on Render matches your Netlify URL exactly
2. Make sure there's no trailing slash
3. Redeploy the backend after changing CORS settings

### API Connection Failed
1. Check `REACT_APP_API_URL` is set correctly in Netlify
2. Verify the backend is running: `curl https://secure-gate-api.onrender.com/api/health`
3. Check browser console for specific errors

### Build Failures
1. Check Netlify build logs
2. Ensure `CI=false` is set (prevents treating warnings as errors)
3. Verify Node version is 18+ in build settings
