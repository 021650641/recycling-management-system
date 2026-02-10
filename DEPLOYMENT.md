# Production Deployment Checklist

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ running
- PM2 installed globally
- Nginx configured

## Backend Deployment

1. **Pull latest code**
   ```bash
   cd /var/www/recycling/backend
   git pull origin main
Install dependencies
npm install
Build TypeScript
npm run build
Restart PM2
pm2 restart recycling-backend
pm2 save
Verify backend is running
pm2 status
curl https://your-domain.com/api/v1/health -k
Frontend Deployment
Pull latest code
cd /var/www/recycling/frontend
git pull origin main
Install dependencies (includes autoprefixer upgrade)
npm install
Build production bundle
npm run build
Verify Tailwind CSS compiled (should be ~19KB, not 383 bytes)
ls -lh dist/assets/*.css
Deploy is automatic (nginx serves from dist/)
Post-Deployment Verification
Clear browser cache on first visit
Hard refresh: Ctrl+Shift+R
Or clear IndexedDB: indexedDB.deleteDatabase('recyclingDB')
Test login flow
Login with admin credentials
Verify JWT token stored
Check dashboard loads with styling
Verify API endpoints
# Get auth token first, then:
curl "https://your-domain.com/api/v1/reports/summary?startDate=2026-01-01&endDate=2026-02-10" \
  -H "Authorization: Bearer YOUR_TOKEN" -k
Check for errors
# Backend logs
pm2 logs recycling-backend --lines 50

# Nginx logs
tail -50 /var/log/nginx/error.log
Critical Files Changed (Commit 8036f9e)
Backend
src/config.ts - Added TypeScript interfaces
src/routes/auth.ts - Fixed JWT type casting
src/routes/reports.ts - Fixed missing closing braces, added summary endpoint
src/routes/transactions.ts - Fixed endpoints
Frontend
postcss.config.js - NEW FILE - Required for Tailwind compilation
package.json - Upgraded autoprefixer to 10.4.24
src/lib/db.ts - Added currentStock index, bumped DB version to 2
src/lib/api.ts - Fixed base URL
src/store/authStore.ts - Fixed token handling
Known Issues
Blank pages on other routes - Navigation routes not yet implemented
No data in dashboard - Expected (no transactions yet)
Browser cache - Users must hard refresh after deployment
Rollback Plan
If deployment fails:
cd /var/www/recycling
git reset --hard HEAD~1
cd backend && npm run build && pm2 restart recycling-backend
cd ../frontend && npm run build
