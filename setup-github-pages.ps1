# GitHub Pages + Railway Deployment Setup

Write-Host "🚀 Setting up GitHub Pages + Railway Deployment" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "frontend") -or -not (Test-Path "Backend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Deployment Checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend (Railway):" -ForegroundColor Cyan
Write-Host "  1. Sign up at https://railway.app" -ForegroundColor White
Write-Host "  2. Create new project from GitHub" -ForegroundColor White
Write-Host "  3. Add PostgreSQL database" -ForegroundColor White
Write-Host "  4. Set environment variables (see GITHUB-PAGES-DEPLOY.md)" -ForegroundColor White
Write-Host "  5. Copy your Railway backend URL" -ForegroundColor White
Write-Host ""

Write-Host "Frontend (GitHub Pages):" -ForegroundColor Cyan
Write-Host "  1. Enable GitHub Pages in repo settings" -ForegroundColor White
Write-Host "  2. Source: GitHub Actions" -ForegroundColor White
Write-Host "  3. Add VITE_API_URL secret with Railway URL" -ForegroundColor White
Write-Host ""

Write-Host "Custom Domain (Namecheap):" -ForegroundColor Cyan
Write-Host "  1. Create CNAME file: frontend/public/CNAME" -ForegroundColor White
Write-Host "  2. Add your domain to the file" -ForegroundColor White
Write-Host "  3. Configure DNS at Namecheap (see guide)" -ForegroundColor White
Write-Host ""

$railwayUrl = Read-Host "Enter your Railway backend URL (or press Enter to skip)"

if ($railwayUrl) {
    Write-Host ""
    Write-Host "✅ Backend URL saved: $railwayUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Add this URL as VITE_API_URL secret in GitHub" -ForegroundColor White
    Write-Host "  2. Go to: https://github.com/kbornfas/kryptovault-website/settings/secrets/actions" -ForegroundColor White
    Write-Host "  3. Click 'New repository secret'" -ForegroundColor White
    Write-Host "  4. Name: VITE_API_URL" -ForegroundColor White
    Write-Host "  5. Value: $railwayUrl" -ForegroundColor White
}

Write-Host ""
$domain = Read-Host "Enter your custom domain (or press Enter to skip)"

if ($domain) {
    # Create CNAME file
    $domain | Out-File -FilePath "frontend/public/CNAME" -Encoding ASCII -NoNewline
    Write-Host ""
    Write-Host "✅ CNAME file created with: $domain" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 DNS Configuration (Namecheap):" -ForegroundColor Yellow
    Write-Host "  Type    Host    Value                     TTL" -ForegroundColor White
    Write-Host "  CNAME   @       kbornfas.github.io       Automatic" -ForegroundColor White
    Write-Host "  CNAME   www     kbornfas.github.io       Automatic" -ForegroundColor White
    Write-Host ""
    Write-Host "  After DNS setup, configure in GitHub Pages settings:" -ForegroundColor White
    Write-Host "  Custom domain: $domain" -ForegroundColor White
    
    # Update vite config for custom domain
    $viteConfig = Get-Content "frontend/vite.config.ts" -Raw
    $viteConfig = $viteConfig -replace "base: '/kryptovault-website/'", "base: '/'"
    $viteConfig | Out-File -FilePath "frontend/vite.config.ts" -Encoding UTF8
    Write-Host ""
    Write-Host "✅ Updated vite.config.ts for custom domain" -ForegroundColor Green
}

Write-Host ""
Write-Host "📚 Full documentation: GITHUB-PAGES-DEPLOY.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Ready to deploy!" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Commit and push to GitHub" -ForegroundColor Yellow
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'Configure GitHub Pages deployment'" -ForegroundColor White
Write-Host "  git push origin master" -ForegroundColor White
Write-Host ""
