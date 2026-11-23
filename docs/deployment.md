# Deployment guide

How to run the platform in production on one Linux server with Docker:
first deploy, configuration, DNS and certificates, upgrades and rollback,
monitoring. Backups, restores and incidents are in
[operations.md](operations.md).

## 1. What runs where

```text
Internet ──► edge (Caddy)   :80 :443  TLS, HSTS, compression; the only public ports
              │
              ▼
             web (nginx)    SPA files, security headers (CSP), long-lived asset
              │             caching; forwards /api, /uploads, /sitemap.xml,
              │             /robots.txt to the API
              ▼
             api (NestJS)   :3003 on the Docker network only
              │
              ▼
             db (MySQL 8)   on the Docker network; 127.0.0.1:3307 on the server
                            for backups and maintenance
```

| Volume (project `rms`) | Holds | Back up? |
| ---------------------- | ----- | -------- |
| `rms_mysql_data` | The database | Yes: `backup:create` ([operations.md](operations.md)) |
| `rms_uploads_data` | Uploaded images (`MEDIA_STORAGE=local`) | Yes: included in `backup:create` |
| `rms_caddy_data` | Certificates and their keys | Yes: losing it means re-issuing every certificate |
| `rms_caddy_config` | Caddy's saved config | No |

Files: `docker-compose.yml` (all services) plus `deploy/docker-compose.prod.yml`
(the edge, closed ports, production settings, log rotation),
`deploy/Caddyfile`, `frontend/nginx.conf`, and the environment file
`backend/.env` made from `deploy/.env.production.example`.

Every browser request is same-origin: storefronts, the admin and the API share
one host per site, so sign-in cookies are first-party (ADR-003).

## 2. Requirements

- A Linux server (Ubuntu 24.04 LTS assumed below) with at least 2 vCPU and
  4 GB RAM, and disk for the database, images and backups.
- Docker Engine with Compose **2.24.4 or newer** (`docker compose version`).
- Ports 80 and 443 reachable from the internet.
- Control of the platform domain's DNS.
- An SMTP account for contact-form and password emails.
- For backups, on the server itself: Node.js 22 and the MySQL 8 client
  (Ubuntu's `mysql-client`; not MariaDB's). See
  [operations.md §2](operations.md#2-backups).

## 3. DNS

With `PLATFORM_DOMAIN=example.com`:

| Record | Points to | Serves |
| ------ | --------- | ------ |
| `example.com` A/AAAA | the server | Directory, admin (`/admin`), path-mode storefronts (`/s/{slug}`) |
| `*.example.com` A/AAAA | the server | Every organization's storefront at `{slug}.example.com` |

**An organization's own domain** (for example `www.northern-trails.com`): the
organization points the name at the server (CNAME to `example.com`, or A/AAAA
for an apex domain). Until the admin has a screen for it, the operator then
registers it:

```sql
-- docker compose … exec db mysql -u root -p tourism_platform
INSERT INTO organization_domains (organization_id, hostname, is_primary, verified_at)
VALUES (12, 'www.northern-trails.com', 1, UTC_TIMESTAMP(6));
```

Only verified domains get a certificate and are served; check the DNS points
at the server before setting `verified_at`.

## 4. Configuration

All settings live in one file, `backend/.env`, used both by the containers and
by Compose's `${…}` placeholders. Always pass it with `--env-file`: the
platform domain is baked into the web build from it, and without it the build
silently uses `localhost`. The commands below use this shell shortcut:

```bash
alias dc='docker compose --env-file backend/.env -f docker-compose.yml -f deploy/docker-compose.prod.yml'
```

Settings to fill (the template explains each; every `CHANGE_ME` must go):

| Setting | Value |
| ------- | ----- |
| `PLATFORM_DOMAIN` | `example.com` (no scheme). Organizations live at `{slug}.example.com` |
| `APP_URL`, `ALLOWED_ORIGINS` | `https://example.com` |
| `ACME_EMAIL` | Where the certificate authority sends expiry and problem notices |
| `JWT_SECRET` | 48+ random characters: `openssl rand -base64 48`. Changing it later signs everyone out |
| `DATABASE_PASS`, `DATABASE_ROOT_PASSWORD` | Two different strong passwords. They are applied when the database volume is first created; changing them later needs `ALTER USER` too |
| `SMTP_*` | Your mail provider. Without `SMTP_HOST`, mail is only written to the log |
| `MEDIA_STORAGE` | `local` (uploads volume) or `cloudinary` with `CLOUDINARY_*` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | The first super admin. The seed refuses placeholders and weak passwords in production |
| `BACKUP_KEY_FILE` | `/etc/rms/backup.key` ([operations.md](operations.md)) |

Already right in the template, change only with a reason: `NODE_ENV=production`,
`COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax`, `TRUST_PROXY` (below),
`DATABASE_POOL_SIZE=10`, `DATABASE_SLOW_QUERY_MS=500`, `MEDIA_MAX_IMAGE_MB=5`.

### TRUST_PROXY

Rate limits and audit logs need the visitor's address. Requests reach the API
through Caddy and nginx, so the API reads it from `X-Forwarded-For`, but only
the entries added by hops it trusts (ADR-028). The Docker setup trusts the
private networks those hops live on: `loopback, linklocal, uniquelocal`.

If you put another proxy in front (a CDN, a cloud load balancer), add its
address ranges, comma-separated (for example
`loopback, linklocal, uniquelocal, 173.245.48.0/20`). Otherwise every visitor
appears to come from that proxy and they all share one rate limit. `true` is
refused at start-up: it would let anyone choose their own address.

### Checking the configuration

```bash
dc run --rm --no-deps api node dist/operations/deployment/command.js check
```

It prints each check as JSON and exits 1 if one fails. In production it also
requires `COOKIE_SECURE=true`, a real `PLATFORM_DOMAIN`, an `https://`
`APP_URL` and no `CHANGE_ME` left (it names the settings, not their values).

## 5. First deploy

```bash
# 1. Code and configuration
git clone <repository> /srv/rms && cd /srv/rms
cp deploy/.env.production.example backend/.env
chmod 600 backend/.env && nano backend/.env        # fill every CHANGE_ME
alias dc='docker compose --env-file backend/.env -f docker-compose.yml -f deploy/docker-compose.prod.yml'

# 2. Build and check
dc build
dc run --rm --no-deps api node dist/operations/deployment/command.js check

# 3. Start. The API applies the database migrations, verifies the schema,
#    then starts (`db:release:prod`); it waits for MySQL to be healthy.
dc up -d
dc logs -f api            # expect "status": "ready", then "API listening on …"

# 4. The first super admin (and system settings). No demo data in production.
dc exec api npm run seed:prod

# 5. Take the password out of the file and recreate the API without it
nano backend/.env         # delete the SEED_ADMIN_PASSWORD line
dc up -d api
```

Then sign in at `https://example.com/admin`, change the password, and create
the first organization (Platform → Organizations). Its storefront is at
`https://{slug}.example.com` as soon as it exists.

### Smoke test

```bash
curl -sI http://example.com | head -3                    # redirect to https://
curl -s -o /dev/null -w '%{http_code}\n' https://example.com/api/health/ready   # 200
curl -sI https://example.com/admin | grep -iE 'strict-transport|content-security|x-frame'
curl -s https://{slug}.example.com/sitemap.xml | head    # the organization's URLs
```

The first request to a new host takes a few seconds while its certificate is
issued.

## 6. Certificates

Caddy gets certificates from Let's Encrypt **on demand**: on the first visit
to a host it asks the API
`/api/v1/public/sites/tls-check?domain=<host>`, which answers yes only for the
platform domain, a subdomain of an existing organization, or a verified custom
domain (ADR-026). Renewal is automatic. Keep the `rms_caddy_data` volume: it
holds the certificates and keys, and re-issuing everything at once can hit the
authority's rate limits (50 certificates per registered domain per week).

### Wildcard certificate

With many organizations, one wildcard certificate for `*.example.com` avoids
those limits. It needs the DNS challenge, so a Caddy build with your DNS
provider's plugin and an API token. A sketch for Cloudflare (not exercised in
this repository):

```dockerfile
# deploy/caddy.Dockerfile — use it as the edge image instead of caddy:2
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare
FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

```caddyfile
# deploy/Caddyfile: add before the `https://` catch-all, which stays for
# organizations' own domains
example.com, *.example.com {
	tls {
		dns cloudflare {env.CLOUDFLARE_API_TOKEN}
	}
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		-Server
	}
	reverse_proxy web:80
}
```

## 7. Upgrades

```bash
cd /srv/rms
npm --prefix backend run backup:create:prod -- …   # first: operations.md §2
git pull
dc build
dc up -d                  # api restarts: pending migrations, verification, start
dc logs -f api            # "applied": [...] then "status": "ready"
```

The API is unavailable for the few seconds it takes to restart; the web
container keeps serving the app shell. Migrations run before the app starts;
index changes use online DDL (`ALGORITHM=INPLACE, LOCK=NONE`), so tables stay
writable.

The release step refuses to start the API when:

- the schema differs from what this build expects (`schema_drift`);
- the database has migrations this build doesn't know
  (`newer_or_unknown_migrations`): an older image against a newer database;
- a backup or another release holds the lock (`release_in_progress`): wait and
  run `dc up -d api` again.

### Rollback

- **No migrations in the release:** check out the previous version and
  `dc up -d --build`.
- **With migrations:** the previous build won't start against the newer schema
  (above). Revert the migrations first, with the **new** build still in place,
  one per run:

  ```bash
  dc run --rm api node ./node_modules/typeorm/cli.js migration:revert -d dist/database/data-source.js
  ```

  then deploy the previous version. If data has to go back too, restore the
  backup taken before the upgrade ([operations.md §3](operations.md#3-restoring)).

## 8. Monitoring

| What | How |
| ---- | --- |
| Up and connected to the database | External uptime check on `https://example.com/api/health/ready` every minute. `/api/health/live` only says the process is up |
| Container health | `dc ps`: the API image has a healthcheck; Compose restarts crashed containers |
| One-off check from the server | `dc exec api npm run ops:monitor:prod`: JSON, exit 1 when the database is unreachable |
| Logs | `dc logs -f api` (also `web`, `edge`, `db`). Rotated: 5 × 20 MB per container |
| Slow queries | Lines with `query is slow` in the API log (threshold `DATABASE_SLOW_QUERY_MS`) |
| Mail | `dc exec api npm run mail:status:prod` |
| Certificates | Caddy's log; the authority emails `ACME_EMAIL` before an expiry it couldn't renew |

Log lines, slow-query lines included, can contain customer names, emails and
phone numbers: treat logs as personal data.

## 9. Capacity notes

Measure again once your domain tables (tours, bookings, …) hold realistic
volumes; the notes below hold whatever the data set.

- **One API instance.** Rate limits are counted in memory per process; running
  several API containers multiplies them. Scaling out needs a shared limiter
  store first.
- **Database connections:** `DATABASE_POOL_SIZE` per API process (default 10).
- **MySQL memory:** give `innodb_buffer_pool_size` room for the data set once
  it grows past a few GB (MySQL's default is 128 MB).
- **Images:** uploads are stored at most 2000 px wide and served with a
  one-year cache (ADR-027). `MEDIA_STORAGE=cloudinary` moves them off the
  server.

## 10. Security checklist

- [ ] Every `CHANGE_ME` replaced; `ops:check` passes; `backend/.env` is `600`.
- [ ] `SEED_ADMIN_PASSWORD` removed after seeding; the super admin changed it.
- [ ] Only ports 22, 80 and 443 open on the server firewall (MySQL listens on
      127.0.0.1 only).
- [ ] `COOKIE_SECURE=true`; HSTS and the CSP present in responses (smoke test).
- [ ] `TRUST_PROXY` covers every proxy in front of the server, and nothing else.
- [ ] Backups scheduled, the key stored off the server, and a restore rehearsed
      ([operations.md](operations.md)).
- [ ] Swagger (`/api/docs`) answers 404: it is off in production.
- [ ] `npm audit` reviewed for each release.
