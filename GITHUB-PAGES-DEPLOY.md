# GitHub Pages + Railway Deployment Guide

## Overview
- **Frontend**: GitHub Pages (Free, Static)
- **Backend**: Railway (Free tier available)
- **Database**: Railway PostgreSQL (Included)

## 🚀 Quick Deploy Steps

### Part 1: Deploy Backend to Railway

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `kryptovault-website` repository
   - Select "Backend" folder as root directory

3. **Add PostgreSQL Database**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-sets `DATABASE_URL`

4. **Configure Backend Service**
   ```
   Root Directory: /Backend
   Build Command: pnpm install && pnpm prisma generate && pnpm run build
   Start Command: pnpm prisma migrate deploy && pnpm run start:prod
   ```

5. **Set Environment Variables**
   Go to Variables tab and add:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your_super_secret_jwt_key_min_32_chars
   CORS_ORIGIN=https://kbornfas.github.io
   ```

6. **Generate Domain**
   - Go to Settings → Generate Domain
   - Copy the URL (e.g., `https://kryptovault-backend.up.railway.app`)
   - **Save this URL - you'll need it for frontend!**

7. **Deploy**
   - Railway auto-deploys on push
   - Check logs for any errors

### Part 2: Configure Frontend for GitHub Pages

1. **Update API URL in GitHub Secrets**
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VITE_API_URL`
   - Value: Your Railway backend URL (from step 6 above)
   - Example: `https://kryptovault-backend.up.railway.app`

2. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: "GitHub Actions"
   - Save

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Configure GitHub Pages deployment"
   git push origin master
   ```

4. **Wait for Deployment**
   - Go to Actions tab
   - Watch the deployment workflow
   - Once complete, your site will be at:
     `https://kbornfas.github.io/kryptovault-website/`

### Part 3: Setup Custom Domain (Namecheap)

1. **Add CNAME File**
   Create `frontend/public/CNAME` with your domain:
   ```
   yourdomain.com
   ```

2. **Configure DNS at Namecheap**
   Go to Namecheap → Domain List → Manage → Advanced DNS

   Add these records:
   ```
   Type    Host    Value                           TTL
   CNAME   @       kbornfas.github.io             Automatic
   CNAME   www     kbornfas.github.io             Automatic
   ```

3. **Update GitHub Pages Settings**
   - Go to repo Settings → Pages
   - Custom domain: `yourdomain.com`
   - Check "Enforce HTTPS"

4. **Update CORS in Railway**
   - Go to Railway → Your Backend → Variables
   - Update `CORS_ORIGIN` to: `https://yourdomain.com`
   - Redeploy

5. **Update Vite Config**
   Remove the base path since you're using custom domain:
   ```typescript
   // In frontend/vite.config.ts
   base: '/', // Change from '/kryptovault-website/'
   ```

### Part 4: Update Backend CORS

Update Railway environment variables:
```
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## 📍 Your URLs

After deployment:
- **Frontend (GitHub Pages)**: https://kbornfas.github.io/kryptovault-website/
- **Frontend (Custom Domain)**: https://yourdomain.com
- **Backend API (Railway)**: https://your-app.up.railway.app
- **Database**: Managed by Railway

## 🔄 Updating Your Site

### Frontend Updates
```bash
git add .
git commit -m "Update frontend"
git push origin master
```
GitHub Actions automatically rebuilds and deploys.

### Backend Updates
```bash
git add .
git commit -m "Update backend"
git push origin master
```
Railway automatically rebuilds and deploys.

## 💰 Cost

- **GitHub Pages**: FREE (Public repos)
- **Railway**: 
  - Free tier: $5 credit/month
  - Backend + DB uses ~$2-3/month
  - Should stay within free tier

## 🔒 Security Notes

1. **Set Strong Secrets**
   - Generate secure JWT_SECRET: `openssl rand -base64 32`
   - Never commit `.env` files

2. **HTTPS is Automatic**
   - GitHub Pages provides SSL
   - Railway provides SSL

3. **CORS Configuration**
   - Only allow your domain
   - Update when domain changes

## 🐛 Troubleshooting

### Frontend Issues
- Check GitHub Actions logs
- Verify `VITE_API_URL` secret is set
- Check browser console for errors

### Backend Issues
- Check Railway logs
- Verify all environment variables are set
- Check database connection

### CORS Errors
- Verify `CORS_ORIGIN` matches frontend URL exactly
- Include both `yourdomain.com` and `www.yourdomain.com`

### Custom Domain Not Working
- Wait 24-48 hours for DNS propagation
- Verify CNAME record is correct
- Check GitHub Pages settings

## 📊 Monitoring

### Railway Dashboard
- View logs
- Monitor resource usage
- Check deployment status

### GitHub Actions
- View build logs
- Check deployment history
- Monitor workflow runs

## 🆘 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Check GitHub Actions logs
3. Verify environment variables
4. Check DNS settings at Namecheap

---

**Your site will be live at:**
- `https://kbornfas.github.io/kryptovault-website/` (GitHub Pages)
- `https://yourdomain.com` (Custom domain, after DNS setup)

Backend API: `https://your-railway-url.up.railway.app`
