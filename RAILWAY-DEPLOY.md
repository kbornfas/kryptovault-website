# 🚂 Railway Backend Deployment Guide

## Step-by-Step Railway Setup

### Prerequisites
- Railway CLI installed ✅
- GitHub account connected
- Backend code ready

---

## Option 1: Deploy via Railway Dashboard (Recommended for First Time)

### 1. Sign Up & Connect GitHub

1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"**
3. Sign in with GitHub
4. Authorize Railway to access your repositories

### 2. Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`kryptovault-website`** repository
4. Railway will detect it's a monorepo

### 3. Configure Backend Service

After project creation:

1. Click **"Add Service"** or it may auto-detect
2. Select **"Backend"** folder as the root directory
3. Click on the service to configure it

**Service Settings:**
- **Root Directory**: `/Backend`
- **Build Command**: (auto-detected from package.json)
- **Start Command**: (auto-detected from package.json)

If needed, manually set:
```json
Build: pnpm install && pnpm prisma generate && pnpm run build
Start: pnpm prisma migrate deploy && pnpm run start:prod
```

### 4. Add PostgreSQL Database

1. In your project, click **"New"** → **"Database"**
2. Select **"PostgreSQL"**
3. Railway automatically:
   - Creates the database
   - Sets `DATABASE_URL` environment variable
   - Connects it to your backend service

### 5. Set Environment Variables

Click on your backend service → **"Variables"** tab

Add these variables:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=generate_a_secure_32_character_minimum_secret_key
CORS_ORIGIN=https://kbornfas.github.io
```

**Generate secure JWT_SECRET:**
```powershell
# Run this in PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 6. Generate Public Domain

1. Go to **Settings** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the URL (e.g., `backend-production-abc123.up.railway.app`)
5. **Save this URL** - you'll need it for frontend!

### 7. Deploy

Railway automatically deploys! Check:
- **Deployments** tab for build logs
- **Logs** tab for runtime logs
- **Metrics** for performance

### 8. Verify Deployment

Test your backend:
```powershell
# Check health endpoint
curl https://your-backend-url.up.railway.app/api
```

---

## Option 2: Deploy via Railway CLI

### 1. Login to Railway

```powershell
railway login
```

This opens your browser for authentication.

### 2. Navigate to Backend

```powershell
cd Backend
```

### 3. Initialize Railway Project

```powershell
# Link to existing project or create new
railway init
```

Select:
- Create new project, or
- Link to existing project

### 4. Add PostgreSQL

```powershell
railway add --database postgres
```

### 5. Set Environment Variables

```powershell
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=your_secure_secret_here
railway variables set CORS_ORIGIN=https://kbornfas.github.io
```

### 6. Deploy

```powershell
railway up
```

Railway will:
- Build your application
- Run migrations
- Start the server

### 7. Open Dashboard

```powershell
railway open
```

This opens your project in the Railway dashboard.

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set by Railway |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | 32+ character string |
| `CORS_ORIGIN` | Allowed frontend URLs | `https://kbornfas.github.io` |

---

## Post-Deployment Tasks

### 1. Get Your Backend URL

From Railway Dashboard:
- Go to your backend service
- Settings → Networking → Domains
- Copy the generated domain

### 2. Update Frontend

Add to GitHub repository secrets:
1. Go to **GitHub.com** → Your repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
   - Name: `VITE_API_URL`
   - Value: `https://your-backend-url.up.railway.app`

### 3. Update CORS for Custom Domain (Later)

When you set up custom domain:
```powershell
railway variables set CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com,https://kbornfas.github.io
```

### 4. Enable Health Checks (Optional)

Railway automatically monitors your service. To add custom health check:

In `Backend/src/main.ts`, ensure you have:
```typescript
app.get('/health', (req, res) => res.send('OK'));
```

---

## Monitoring & Maintenance

### View Logs

**Dashboard:**
- Logs tab in your service

**CLI:**
```powershell
railway logs
```

### Check Deployments

**Dashboard:**
- Deployments tab shows all builds

**CLI:**
```powershell
railway status
```

### Restart Service

**CLI:**
```powershell
railway restart
```

### Redeploy

**CLI:**
```powershell
railway up --detach
```

---

## Troubleshooting

### Build Fails

1. Check build logs in Railway dashboard
2. Verify `package.json` scripts are correct
3. Ensure Prisma schema is valid

**Common fixes:**
```powershell
# Regenerate Prisma client locally
cd Backend
pnpm prisma generate

# Test build locally
pnpm run build
```

### Database Connection Issues

1. Verify `DATABASE_URL` is set (auto-set by Railway)
2. Check Prisma schema is correct
3. Run migrations manually:

```powershell
railway run pnpm prisma migrate deploy
```

### CORS Errors

Update `CORS_ORIGIN` to include your frontend URL:
```powershell
railway variables set CORS_ORIGIN=https://kbornfas.github.io,https://your-backend-url.up.railway.app
```

### Port Issues

Railway sets `PORT` automatically. Ensure your `main.ts` uses:
```typescript
const port = process.env.PORT || 3000;
```

---

## Cost & Limits

### Free Tier (Hobby Plan)
- **$5 USD credit/month**
- Typical usage: $2-3/month for backend + database
- Unlimited projects
- Automatic SSL
- Custom domains

### Usage Estimates
- **Backend**: ~$1-2/month
- **PostgreSQL**: ~$1/month
- **Total**: Well within free tier!

---

## Security Best Practices

### 1. Rotate JWT Secret Regularly

```powershell
# Generate new secret
railway variables set JWT_SECRET=new_secure_secret_here

# Restart service
railway restart
```

### 2. Restrict CORS

Only allow your frontend domains:
```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Enable Rate Limiting

Already configured in your NestJS backend!

### 4. Database Backups

Railway automatically backs up PostgreSQL databases.

Manual backup:
```powershell
railway run pg_dump > backup.sql
```

---

## Quick Commands Reference

```powershell
# Login
railway login

# Check status
railway status

# View logs
railway logs

# Set variable
railway variables set KEY=value

# Deploy
railway up

# Open dashboard
railway open

# Run command in Railway environment
railway run <command>

# Link to project
railway link

# Restart service
railway restart
```

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Get backend URL
3. ✅ Add `VITE_API_URL` to GitHub secrets
4. ✅ Push frontend to GitHub
5. ✅ Your site goes live!

---

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Project Issues**: Check deployment logs first

---

**Your backend will be live at:**
`https://your-project-name.up.railway.app`

🚂 Happy deploying!
