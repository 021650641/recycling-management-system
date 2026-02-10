# Production Deployment Checklist

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ running
- systemd (standard on all modern Linux distributions)
- Nginx configured

## Backend Deployment

1. **Pull latest code**
   ```bash
   cd /var/www/recycling/backend
   git pull origin main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build TypeScript**
   ```bash
   npm run build
   ```

4. **Restart service**
   ```bash
   sudo systemctl restart recycling-api
   ```

5. **Verify backend is running**
   ```bash
   sudo systemctl status recycling-api
   curl https://your-domain.com/health -k
   ```

## Frontend Deployment

1. **Pull latest code**
   ```bash
   cd /var/www/recycling/frontend
   git pull origin main
   ```

2. **Install dependencies (includes autoprefixer upgrade)**
   ```bash
   npm install
   ```

3. **Build production bundle**
   ```bash
   npm run build
   ```

4. **Verify Tailwind CSS compiled (should be ~19KB, not 383 bytes)**
   ```bash
   ls -lh dist/assets/*.css
   ```

5. Deploy is automatic (nginx serves from dist/)

## Post-Deployment Verification

1. **Clear browser cache on first visit**
   - Hard refresh: Ctrl+Shift+R
   - Or clear IndexedDB: `indexedDB.deleteDatabase('recyclingDB')`

2. **Test login flow**
   - Login with admin credentials
   - Verify JWT token stored
   - Check dashboard loads with styling

3. **Verify API endpoints**
   ```bash
   # Get auth token first, then:
   curl "https://your-domain.com/api/v1/reports/summary?startDate=2026-01-01&endDate=2026-02-10" \
     -H "Authorization: Bearer YOUR_TOKEN" -k
   ```

4. **Check for errors**
   ```bash
   # Backend logs
   sudo journalctl -u recycling-api --no-pager -n 50

   # Nginx logs
   tail -50 /var/log/nginx/error.log
   ```

## Rollback Plan

If deployment fails:

```bash
cd /var/www/recycling
git reset --hard HEAD~1
cd backend && npm run build && sudo systemctl restart recycling-api
cd ../frontend && npm run build
```
