# Simple Railway Deployment Guide

Write-Host "Railway Backend Deployment" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Quick Steps to Deploy:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Go to railway.app and sign in with GitHub" -ForegroundColor White
Write-Host ""

Write-Host "2. Click 'New Project' then 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host ""

Write-Host "3. Select your 'kryptovault-website' repository" -ForegroundColor White
Write-Host ""

Write-Host "4. Add PostgreSQL database:" -ForegroundColor White
Write-Host "   - Click 'New' -> 'Database' -> 'PostgreSQL'" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Configure backend service:" -ForegroundColor White
Write-Host "   - Root Directory: /Backend" -ForegroundColor Gray
Write-Host ""

Write-Host "6. Set environment variables:" -ForegroundColor White
Write-Host "   NODE_ENV=production" -ForegroundColor Gray
Write-Host "   PORT=3000" -ForegroundColor Gray
Write-Host "   JWT_SECRET=(generate secure 32+ char string)" -ForegroundColor Gray
Write-Host "   CORS_ORIGIN=https://kbornfas.github.io" -ForegroundColor Gray
Write-Host ""

Write-Host "7. Generate domain (Settings -> Networking -> Generate Domain)" -ForegroundColor White
Write-Host ""

Write-Host "8. Copy your backend URL and save it!" -ForegroundColor White
Write-Host ""

Write-Host "Opening Railway..." -ForegroundColor Cyan
Start-Process "https://railway.app/new"

Write-Host ""
Write-Host "For detailed instructions, see: RAILWAY-DEPLOY.md" -ForegroundColor Cyan
Write-Host ""
