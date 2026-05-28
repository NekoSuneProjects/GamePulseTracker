# Deploying GamePulseTracker on Linux

This guide walks through a production deployment on a single Ubuntu 22.04 VPS
behind nginx with Let's Encrypt TLS. The same instructions work on any modern
Linux distribution with minor package-manager swaps.

## 1. Server preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ca-certificates ufw git

# Docker + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Get the code

```bash
sudo mkdir -p /opt && sudo chown $USER /opt
cd /opt
git clone https://github.com/<you>/gamepulsetracker.git gamepulse
cd gamepulse
cp .env.example .env
```

## 3. Configure environment

Open `.env` and at minimum set:

- `POSTGRES_PASSWORD` — strong random
- `JWT_SECRET` — `openssl rand -hex 48`
- `JWT_REFRESH_SECRET` — different `openssl rand -hex 48`
- `CORS_ORIGINS=https://gamepulse.example.com`
- `NEXT_PUBLIC_API_URL=https://gamepulse.example.com/api`
- `NEXT_PUBLIC_WS_URL=https://gamepulse.example.com`
- `HYPIXEL_API_KEY=...` (free from https://developer.hypixel.net)
- Any other integration keys you intend to use.

## 4. TLS certificates (Let's Encrypt)

Pre-issue certs before launching the stack:

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d gamepulse.example.com
sudo mkdir -p /opt/gamepulse/docker/nginx/certs
sudo cp /etc/letsencrypt/live/gamepulse.example.com/fullchain.pem /opt/gamepulse/docker/nginx/certs/
sudo cp /etc/letsencrypt/live/gamepulse.example.com/privkey.pem   /opt/gamepulse/docker/nginx/certs/
sudo chown -R $USER /opt/gamepulse/docker/nginx/certs
```

Then uncomment the TLS block in [docker/nginx/nginx.conf](../docker/nginx/nginx.conf).

Auto-renew via cron (`crontab -e`):
```
0 3 * * 1 certbot renew --quiet --post-hook "cd /opt/gamepulse && docker compose restart nginx"
```

## 5. First launch

```bash
docker compose --env-file .env up -d --build
docker compose logs -f --tail=100
```

The backend container runs `prisma migrate deploy` as part of its entrypoint,
so the schema is applied on first boot. To seed the admin user:

```bash
docker compose exec backend npx prisma db seed
```

## 6. Verifying the install

```bash
curl -s https://gamepulse.example.com/api/health | jq
# { "ok": true, "checks": { "db": "ok", "redis": "ok" }, ... }
```

Then visit `https://gamepulse.example.com/` in a browser, log in with the
seeded admin user, change the password from `/settings`, and start tracking
players.

## 7. Backups

Add this to a cron job:

```bash
docker compose exec -T postgres pg_dump -U gamepulse gamepulse \
  | gzip > /backup/gpt-$(date +%F).sql.gz
```

Volumes are named `postgres_data` and `redis_data` — back them up with
`docker run --rm -v gamepulse_postgres_data:/data -v $PWD:/backup alpine tar czf /backup/pg.tgz /data`
if you prefer file-level backups.

## 8. Scaling notes

When you need to run multiple backend containers behind nginx:

1. Add `@socket.io/redis-adapter` to the backend and call
   `app.useWebSocketAdapter(...)` in `main.ts`. The Redis container is already
   available — no infra change needed.
2. Increase `nginx`'s `upstream backend { ... }` block to list each replica.
3. Bull workers parallelize across replicas automatically thanks to BullMQ.

## 9. Updating

```bash
cd /opt/gamepulse
git pull
docker compose build
docker compose up -d
docker compose exec backend npx prisma migrate deploy
```
