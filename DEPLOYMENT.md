# KryptoVault Deployment Guide

This guide covers multiple deployment options for the KryptoVault investment platform.

## Table of Contents
1. [Docker Deployment (Recommended)](#docker-deployment)
2. [Railway Deployment](#railway-deployment)
3. [Vercel + Railway Deployment](#vercel--railway-deployment)
4. [AWS EC2 Deployment](#aws-ec2-deployment)
5. [DigitalOcean Deployment](#digitalocean-deployment)

---

## Docker Deployment (Recommended)

The easiest way to deploy the full stack application.

### Prerequisites
- Docker and Docker Compose installed
- A server with at least 2GB RAM

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/kbornfas/kryptovault-website.git
   cd kryptovault-website
   ```

2. **Set up environment variables**
   ```bash
   cp .env.production.example .env.production
   nano .env.production  # Edit with your values
   ```

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Check the status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **Access your application**
   - Frontend: http://your-server-ip
   - Backend API: http://your-server-ip:3000

### Updating the Application
```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

---

## Railway Deployment

Railway makes it easy to deploy both frontend and backend.

### Backend Deployment on Railway

1. **Create a new project on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Add PostgreSQL database**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set DATABASE_URL

3. **Configure backend service**
   - Root Directory: `/Backend`
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `pnpm prisma migrate deploy && pnpm run start:prod`
   
4. **Set environment variables**
   ```
   JWT_SECRET=your_jwt_secret_here
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

5. **Generate domain**
   - Click "Settings" → "Generate Domain"
   - Note the URL for frontend configuration

### Frontend Deployment on Railway

1. **Add new service to same project**
   - Click "New" → "GitHub Repo"
   - Select same repository

2. **Configure frontend service**
   - Root Directory: `/frontend`
   - Build Command: `yarn install && yarn build`
   - Start Command: Use nginx or serve the dist folder

---

## Vercel + Railway Deployment

Best for static frontend (Vercel) + dynamic backend (Railway).

### Frontend on Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy frontend**
   ```bash
   cd frontend
   vercel
   ```

3. **Configure Vercel**
   - Framework Preset: Vite
   - Build Command: `yarn build`
   - Output Directory: `dist`
   - Install Command: `yarn install`

4. **Set environment variables in Vercel**
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```

### Backend on Railway
Follow the "Backend Deployment on Railway" steps above.

---

## AWS EC2 Deployment

For full control over your infrastructure.

### Steps

1. **Launch EC2 Instance**
   - Choose Ubuntu 22.04 LTS
   - Instance type: t3.medium (minimum)
   - Configure security groups (ports 80, 443, 22)

2. **Connect to your instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **Clone and deploy**
   ```bash
   git clone https://github.com/kbornfas/kryptovault-website.git
   cd kryptovault-website
   cp .env.production.example .env.production
   nano .env.production  # Edit with your values
   docker-compose up -d
   ```

5. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

---

## DigitalOcean Deployment

Similar to AWS but with simpler setup.

### Using DigitalOcean App Platform

1. **Create new app**
   - Go to DigitalOcean → Apps → Create App
   - Connect your GitHub repository

2. **Configure components**
   
   **Backend:**
   - Type: Web Service
   - Source Directory: `/Backend`
   - Build Command: `pnpm install && pnpm run build`
   - Run Command: `pnpm run start:prod`
   - HTTP Port: 3000
   
   **Database:**
   - Add PostgreSQL database
   - DigitalOcean will auto-configure DATABASE_URL
   
   **Frontend:**
   - Type: Static Site
   - Source Directory: `/frontend`
   - Build Command: `yarn build`
   - Output Directory: `dist`

3. **Set environment variables**
   - Add JWT_SECRET, NODE_ENV, etc.

4. **Deploy**
   - Click "Deploy"
   - Access via provided URLs

---

## Environment Variables Reference

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_super_secret_jwt_key
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
CRYPTO_API_KEY=optional_api_key
```

### Frontend
If using Vite environment variables, prefix with `VITE_`:
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## Post-Deployment

### Create Admin User
```bash
# Connect to your backend container
docker-compose exec backend sh

# Run Prisma Studio or create user via API
```

### Monitor Application
```bash
# View logs
docker-compose logs -f

# Check resource usage
docker stats
```

### Backup Database
```bash
# Backup
docker-compose exec postgres pg_dump -U kryptovault kryptovault > backup.sql

# Restore
docker-compose exec -T postgres psql -U kryptovault kryptovault < backup.sql
```

---

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Verify JWT_SECRET is set
- Check logs: `docker-compose logs backend`

### Frontend can't connect to backend
- Verify CORS_ORIGIN includes your frontend URL
- Check API proxy configuration in nginx.conf
- Ensure backend health check passes

### Database connection issues
- Wait for PostgreSQL to fully start (use health checks)
- Verify credentials
- Check network connectivity

---

## Security Checklist

- [ ] Change default passwords
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up regular database backups
- [ ] Enable rate limiting
- [ ] Keep dependencies updated
- [ ] Set up monitoring and alerts

---

## Support

For issues or questions, please open an issue on GitHub or contact support.
