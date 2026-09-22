# Deploy IronCoach API (Oracle Always Free)

Automatic path: **push to `master` or `main`** → GitHub Actions syncs `backend/` to the VM → rebuilds containers.

Manual path (emergency only): `scp` / SSH + `docker compose` (see bottom).

## How auto-deploy works

1. You push backend changes to GitHub.
2. Workflow builds a production `.env` from **GitHub Secrets**.
3. `rsync` updates code on the VM (does **not** wipe server `.env` via delete).
4. `deploy/apply.sh` on the VM:
   - replaces `.env` **only if** the new file differs
   - `docker compose up -d --build`
   - force-recreates **api** if env changed
   - force-recreates **caddy** if `Caddyfile` changed
5. Smoke-tests `https://ironcoach.duckdns.org/`

Your current default branch is **`master`** (workflow also listens for `main`).

## One-time GitHub setup

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

### SSH / host

| Secret | Value |
|--------|--------|
| `ORACLE_HOST` | `140.245.8.153` |
| `ORACLE_USER` | `ubuntu` (optional; defaults to `ubuntu`) |
| `ORACLE_SSH_PRIVATE_KEY` | Full contents of `ssh-key-2026-09-22.key` (including `-----BEGIN ... KEY-----` lines) |

### App env (same as local `.env`)

| Secret | Required |
|--------|----------|
| `MONGODB_URI` | yes |
| `JWT_SECRET` | yes |
| `CLOUDINARY_CLOUD_NAME` | yes |
| `CLOUDINARY_API_KEY` | yes |
| `CLOUDINARY_API_SECRET` | yes |
| `GOOGLE_CLIENT_ID` | yes |
| `GOOGLE_ANDROID_CLIENT_ID` | no |
| `GOOGLE_IOS_CLIENT_ID` | no |
| `GOOGLE_EXPO_CLIENT_ID` | no |

Changing a secret + re-running the workflow (or pushing any backend file) refreshes `.env` on the VM **only when the generated file differs**.

## Day-to-day

```bash
# edit backend code locally
git add backend
git commit -m "your message"
git push origin master
```

Watch: GitHub → **Actions** → **Deploy backend**.

No more manual `scp` for normal updates.

## Updating env only

1. Edit the secret in GitHub.
2. Actions → **Deploy backend** → **Run workflow**  
   (or push a tiny backend change)

## VM prerequisites (already done if you followed the Oracle setup)

- Docker + Compose
- Ports 22/80/443 open
- DuckDNS → VM IP
- Atlas Network Access allows the VM IP

## Manual emergency deploy

```powershell
scp -i "PATH\ssh-key-2026-09-22.key" -r `
  "PATH\ironcoach\backend" `
  ubuntu@ORACLE_IP:~/ironcoach-backend
```

```bash
cd ~/ironcoach-backend
chmod +x deploy/apply.sh
# optional: copy a new .env to .env.new first
./deploy/apply.sh
```
