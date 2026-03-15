# LeadNexConnect v2 — Local Ubuntu Deployment Guide (systemd)

## Prerequisites on the Ubuntu machine

| Component | Min version | Why |
|-----------|-------------|-----|
| Ubuntu | 20.04 LTS + | systemd 245 + |
| Node.js | 18.x | engine requirement in package.json |
| npm | 9.x | workspace support |
| PostgreSQL | 14 + | primary database |
| Redis | 6 + | Bull job queue (email sending) |
| Nginx | any | reverse proxy (optional but recommended) |

All of the above are installed automatically by `deploy-local.sh` if missing.

---

## Core files produced by this deployment setup

```
deploy/
  leadnex-api.service   ← systemd unit for the Express API  (port 4000)
  leadnex-web.service   ← systemd unit for the Next.js frontend (port 3000)
deploy-local.sh         ← one-shot deployment script (run as root)
apps/web/next.config.js ← output: 'standalone' enables a self-contained build
.env.example            ← template for environment variables
```

---

## First-time deployment

```bash
# 1. Clone / copy the project to the Ubuntu machine
# 2. From the project root:
sudo bash deploy-local.sh
```

The script will:
1. Install Node 18, PostgreSQL, Redis, Nginx (if missing)
2. Create a locked-down system user `leadnex`
3. Copy the app to `/opt/leadnexconnect`
4. Generate `.env` from the template (you get a pause to fill in API keys)
5. Create the PostgreSQL database + user
6. Run `npm install`, `db:migrate`, `db:seed`
7. Build the API (`tsc`) and Next.js frontend (standalone output)
8. Copy static assets into the standalone bundle
9. Install and start `leadnex-api` and `leadnex-web` as systemd services
10. Configure an Nginx reverse proxy on port 80

---

## What to fill in `.env` before the app is fully functional

The script auto-generates secrets and the DB URL. You still need to add:

| Variable | Where to get it |
|----------|-----------------|
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Gmail app password or SMTP provider |
| `APOLLO_API_KEY` | https://app.apollo.io → Settings → API |
| `HUNTER_API_KEY` | https://hunter.io → Dashboard → API |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console → APIs & Services |
| `FRONTEND_URL` | Set to `http://<your-server-ip>` in production |
| `API_BASE_URL` | Set to `http://<your-server-ip>/api` or keep port 4000 |

Optional (leave blank to disable):
- `PEOPLEDATALABS_API_KEY`
- `LINKEDIN_SALES_NAV_ENABLED=false` if you don't have a Sales Navigator account

---

## Day-to-day operations

```bash
# View live logs
journalctl -u leadnex-api -f
journalctl -u leadnex-web -f

# restart a service
systemctl restart leadnex-api
systemctl restart leadnex-web

# stop everything
systemctl stop leadnex-api leadnex-web

# re-deploy after code changes
cd /opt/leadnexconnect
npm run build:api          # recompile TypeScript
npm run build:web          # rebuild Next.js
# copy new static assets into standalone bundle
cp -r apps/web/public apps/web/.next/standalone/apps/web/public
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
chown -R leadnex:leadnex /opt/leadnexconnect
systemctl restart leadnex-api leadnex-web
```

---

## Service files explained

### `deploy/leadnex-api.service`
- Runs `node /opt/leadnexconnect/apps/api/dist/index.js`
- Starts **after** `postgresql.service`
- Reads `/opt/leadnexconnect/.env` via `EnvironmentFile`
- Auto-restarts on failure with a 10-second back-off

### `deploy/leadnex-web.service`
- Runs `node /opt/leadnexconnect/apps/web/.next/standalone/server.js`
- Waits for `leadnex-api.service` first
- Reads the same `.env` file
- Binds on `PORT=3000` and `HOSTNAME=0.0.0.0`

---

## Nginx layout

```
Browser → port 80 → Nginx
                      ├─ /           → Next.js :3000
                      ├─ /api/       → Express  :4000  (direct)
                      └─ /_next/static → served from disk (cached)
```

> Next.js automatically rewrites `/api/*` requests to the Express API
> via the `rewrites()` rule in `next.config.js`, so the Nginx `/api/`
> block is only needed for health-checks and direct API consumers.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| API won't start | `journalctl -u leadnex-api -n 60` — usually a `.env` variable missing |
| Web shows blank / can't reach API | Check `NEXT_PUBLIC_API_URL` and `FRONTEND_URL` in `.env` |
| DB connection refused | `systemctl status postgresql`, check `DATABASE_URL` in `.env` |
| Email queue silently fails | Ensure `REDIS_URL=redis://localhost:6379` is set and Redis is running |
| Permission denied errors | Run `chown -R leadnex:leadnex /opt/leadnexconnect` |
