# Railway Backend Deployment Script

Write-Host "Railway Backend Deployment Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
try {
    $railwayVersion = railway --version 2>&1
    Write-Host "Railway CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "Railway CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @railway/cli
    Write-Host "Railway CLI installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Deployment Options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Deploy via Railway Dashboard (Recommended)" -ForegroundColor White
Write-Host "  2. Deploy via Railway CLI" -ForegroundColor White
Write-Host "  3. View Documentation" -ForegroundColor White
Write-Host "  4. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1-4)"

if ($choice -eq "1") {
        Write-Host ""
        Write-Host "🌐 Opening Railway Dashboard..." -ForegroundColor Cyan
        Start-Process "https://railway.app/new"
        Write-Host ""
        Write-Host "📝 Follow these steps:" -ForegroundColor Yellow
        Write-Host "  1. Sign in with GitHub" -ForegroundColor White
        Write-Host "  2. Click 'Deploy from GitHub repo'" -ForegroundColor White
        Write-Host "  3. Select 'kryptovault-website'" -ForegroundColor White
        Write-Host "  4. Set Root Directory to '/Backend'" -ForegroundColor White
        Write-Host "  5. Add PostgreSQL database (New → Database → PostgreSQL)" -ForegroundColor White
        Write-Host "  6. Set environment variables:" -ForegroundColor White
        Write-Host "       NODE_ENV=production" -ForegroundColor Gray
        Write-Host "       PORT=3000" -ForegroundColor Gray
        Write-Host "       JWT_SECRET=<generate secure key>" -ForegroundColor Gray
        Write-Host "       CORS_ORIGIN=https://kbornfas.github.io" -ForegroundColor Gray
        Write-Host "  7. Generate Domain (Settings → Networking)" -ForegroundColor White
        Write-Host "  8. Copy your backend URL!" -ForegroundColor White
        Write-Host ""
        Write-Host "Full guide: RAILWAY-DEPLOY.md" -ForegroundColor Cyan
}
elseif ($choice -eq "2") {
        Write-Host ""
        Write-Host "🔐 Logging in to Railway..." -ForegroundColor Cyan
        railway login
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Logged in successfully!" -ForegroundColor Green
            Write-Host ""
            
            Set-Location Backend
            
            Write-Host "🚀 Initializing Railway project..." -ForegroundColor Cyan
            railway init
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "📦 Adding PostgreSQL database..." -ForegroundColor Cyan
                railway add
                
                Write-Host ""
                Write-Host "🔧 Setting environment variables..." -ForegroundColor Cyan
                
                # Generate secure JWT secret
                $jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
                
                railway variables set NODE_ENV=production
                railway variables set PORT=3000
                railway variables set JWT_SECRET=$jwtSecret
                railway variables set CORS_ORIGIN=https://kbornfas.github.io
                
                Write-Host "✅ Environment variables set" -ForegroundColor Green
                Write-Host ""
                Write-Host "🚀 Deploying to Railway..." -ForegroundColor Cyan
                railway up
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Host "🎉 Deployment successful!" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "Opening Railway dashboard..." -ForegroundColor Cyan
                    railway open
                    Write-Host ""
                    Write-Host "📝 Next steps:" -ForegroundColor Yellow
                    Write-Host "  1. Copy your backend URL from Railway dashboard" -ForegroundColor White
                    Write-Host "  2. Add to GitHub secrets as VITE_API_URL" -ForegroundColor White
                    Write-Host "  3. Push your code to deploy frontend" -ForegroundColor White
                }
            }
            
            Set-Location ..
        }
}
elseif ($choice -eq "3") {
        Write-Host ""
        Write-Host "📚 Opening documentation..." -ForegroundColor Cyan
        if (Test-Path "RAILWAY-DEPLOY.md") {
            code "RAILWAY-DEPLOY.md"
        } else {
            Write-Host "Documentation not found" -ForegroundColor Red
        }
}
elseif ($choice -eq "4") {
        Write-Host ""
        Write-Host "Goodbye!" -ForegroundColor Cyan
        exit 0
}
else {
        Write-Host ""
        Write-Host "Invalid option" -ForegroundColor Red
}

Write-Host ""
Write-Host ""
Write-Host "Useful Links:" -ForegroundColor Cyan
Write-Host "  Railway Dashboard: https://railway.app/dashboard" -ForegroundColor White
Write-Host "  Documentation: RAILWAY-DEPLOY.md" -ForegroundColor White
Write-Host "  Railway Docs: https://docs.railway.app" -ForegroundColor White
Write-Host ""
