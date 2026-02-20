$msg = Read-Host -Prompt "Enter commit message (default: 'update')"
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "update" }

Write-Host "🚀 Starting Deployment Pipeline..." -ForegroundColor Cyan

# 1. Add Changes
Write-Host "1. Staging files..." -ForegroundColor Yellow
git add .

# 2. Commit
Write-Host "2. Committing changes..." -ForegroundColor Yellow
git commit -m "$msg"

# 3. Push
Write-Host "3. Pushing to GitHub (Triggering Vercel Build)..." -ForegroundColor Yellow
git push origin main

if ($?) {
    Write-Host "✅ Success! Changes pushed to GitHub." -ForegroundColor Green
    Write-Host "⏳ Vercel is now building your app..." -ForegroundColor Cyan
    Write-Host "👉 Live URL: https://test-plan-generator-app.vercel.app" -ForegroundColor White
} else {
    Write-Host "❌ Error: Push failed. Check your git configuration." -ForegroundColor Red
}
