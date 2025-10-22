# KryptoVault Deployment Script for Windows
Write-Host "🚀 KryptoVault Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "⚠️  .env.production not found. Creating from example..." -ForegroundColor Yellow
    Copy-Item ".env.production.example" ".env.production"
    Write-Host ""
    Write-Host "📝 Please edit .env.production with your production values:" -ForegroundColor Yellow
    Write-Host "   - Set a strong DB_PASSWORD"
    Write-Host "   - Set a strong JWT_SECRET (32+ characters)"
    Write-Host "   - Set your FRONTEND_URL"
    Write-Host ""
    Read-Host "Press Enter when you're ready to continue"
}

Write-Host ""
Write-Host "🏗️  Building Docker images..." -ForegroundColor Cyan
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services. Please check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Checking service status..." -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Your application is now running:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Database: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "📝 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs:        docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop services:    docker-compose down" -ForegroundColor White
Write-Host "   Restart services: docker-compose restart" -ForegroundColor White
Write-Host "   Update app:       git pull; docker-compose up -d --build" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Set up SSL/HTTPS for production"
Write-Host "   2. Configure your firewall"
Write-Host "   3. Set up regular backups"
Write-Host "   4. Create an admin user"
Write-Host ""
