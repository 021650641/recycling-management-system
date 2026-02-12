# Production Deployment Quick Reference

For the full installation and deployment guide, see **[deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)**.

For the technical architecture document, see **[TECHNICAL.md](TECHNICAL.md)**.

---

## Quick Update Checklist

```bash
cd /var/www/recycling

# 1. Pull latest code
git pull origin main

# 2. Rebuild backend
cd backend && npm ci && npx tsc

# 3. Run pending database migrations
./migrations/run-migrations.sh

# 4. Rebuild frontend
cd ../frontend && npm ci && npx vite build

# 5. Restart backend service
sudo systemctl restart recycling-api.service

# 6. Verify
curl http://localhost:5000/health
```

Or use the automated script:

```bash
cd /var/www/recycling/deployment
./update.sh
```

## Post-Update Verification

```bash
# Service status
sudo systemctl status recycling-api

# Health check
curl https://your-domain.com/health

# Backend logs
sudo journalctl -u recycling-api --no-pager -n 50

# Nginx logs
tail -50 /var/log/nginx/error.log

# Frontend CSS check (should be 15+ KB)
ls -lh /var/www/recycling/frontend/dist/assets/*.css
```

## Rollback

```bash
cd /var/www/recycling
git revert HEAD
cd backend && npm ci && npx tsc
cd ../frontend && npm ci && npx vite build
sudo systemctl restart recycling-api
```
