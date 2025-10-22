# 🎉 GitHub Pages Deployment - Quick Start

Your KryptoVault website is now configured for **FREE** deployment!

## 📦 What's Been Set Up

✅ GitHub Actions workflow for automatic deployment  
✅ Vite configured for GitHub Pages  
✅ Railway backend configuration  
✅ Custom domain support (Namecheap)  
✅ Environment variable handling  
✅ API endpoint configuration  

## 🚀 Deploy in 3 Steps

### Step 1: Deploy Backend (5 minutes)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `kryptovault-website`
4. Add PostgreSQL database (click "New" → "Database" → "PostgreSQL")
5. Configure backend service:
   - Root Directory: `/Backend`
   - Set these environment variables:
     ```
     NODE_ENV=production
     PORT=3000
     JWT_SECRET=your_super_secret_key_min_32_characters_long
     CORS_ORIGIN=https://kbornfas.github.io
     ```
6. Click "Generate Domain" and **copy the URL** (e.g., `https://your-app.up.railway.app`)

### Step 2: Deploy Frontend (3 minutes)

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
   - Name: `VITE_API_URL`
   - Value: Your Railway URL from Step 1
3. Go to Settings → Pages
   - Source: Select "GitHub Actions"
4. Push your code:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin master
   ```
5. Wait 2-3 minutes for deployment
6. Access your site at: `https://kbornfas.github.io/kryptovault-website/`

### Step 3: Custom Domain (Optional, 5 minutes)

1. **Create CNAME file:**
   ```bash
   # Create frontend/public/CNAME with your domain
   echo "yourdomain.com" > frontend/public/CNAME
   ```

2. **Configure DNS at Namecheap:**
   - Go to Namecheap → Domain List → Manage → Advanced DNS
   - Add records:
     ```
     Type    Host    Value                   TTL
     CNAME   @       kbornfas.github.io     Automatic
     CNAME   www     kbornfas.github.io     Automatic
     ```

3. **Update GitHub Pages:**
   - Settings → Pages → Custom domain: `yourdomain.com`
   - Check "Enforce HTTPS"

4. **Update CORS in Railway:**
   - Add to environment variables:
     ```
     CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
     ```

5. **Update vite config** for custom domain:
   ```typescript
   // Change in frontend/vite.config.ts
   base: '/',  // Instead of '/kryptovault-website/'
   ```

6. **Push changes:**
   ```bash
   git add .
   git commit -m "Add custom domain"
   git push origin master
   ```

## 📍 Your URLs

| Service | URL |
|---------|-----|
| Frontend (GitHub Pages) | `https://kbornfas.github.io/kryptovault-website/` |
| Frontend (Custom Domain) | `https://yourdomain.com` |
| Backend API (Railway) | `https://your-app.up.railway.app` |
| Database | Managed by Railway |

## 💰 Cost: $0/month

- **GitHub Pages**: FREE (unlimited for public repos)
- **Railway**: FREE tier includes $5 credit/month (enough for your backend + database)

## 🔄 Auto-Deploy

Both services auto-deploy when you push to GitHub:

```bash
# Make changes, then:
git add .
git commit -m "Your changes"
git push origin master
```

- Frontend: GitHub Actions rebuilds automatically (2-3 min)
- Backend: Railway rebuilds automatically (3-5 min)

## 🛠️ Quick Setup Script

Run this to configure everything:

```powershell
.\setup-github-pages.ps1
```

## 📚 Full Documentation

- [Complete Guide](GITHUB-PAGES-DEPLOY.md)
- [Troubleshooting](#troubleshooting)
- [Railway Setup](#railway-setup)

## 🐛 Troubleshooting

### Frontend not loading?
- Check GitHub Actions tab for build errors
- Verify `VITE_API_URL` secret is set correctly
- Check browser console for errors

### Backend errors?
- Check Railway logs
- Verify all environment variables are set
- Ensure DATABASE_URL is automatically set by Railway

### CORS errors?
- Update Railway `CORS_ORIGIN` to match your frontend URL exactly
- Include both root and www domains if using custom domain

### Custom domain not working?
- Wait 24-48 hours for DNS propagation
- Verify CNAME record at Namecheap
- Check GitHub Pages settings

## 🎯 Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Configure GitHub secrets
3. ✅ Push to GitHub
4. ✅ Wait for deployment
5. ✅ Access your live site!

Optional:
- Set up custom domain
- Configure monitoring
- Add more features

---

**Need Help?** Check [GITHUB-PAGES-DEPLOY.md](GITHUB-PAGES-DEPLOY.md) for detailed instructions.

**Your site will be live at:**  
`https://kbornfas.github.io/kryptovault-website/`

🚀 Happy deploying!
