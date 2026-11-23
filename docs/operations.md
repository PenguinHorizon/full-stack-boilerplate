# Operations runbook

Backups, restores, routine checks and what to do when something breaks, for a
server set up with [deployment.md](deployment.md). Commands assume the
checkout is `/srv/rms` and this shortcut:

```bash
alias dc='docker compose --env-file backend/.env -f docker-compose.yml -f deploy/docker-compose.prod.yml'
```

## 1. Routine

| When | Task |
| ---- | ---- |
| Daily (night) | Backup, verify, copy off the server (§2) |
| Weekly | Rehearse a restore of the latest backup: `restore-check` (§3) |
| Weekly | Glance at `dc ps`, disk space (`df -h`, `docker system df`), slow queries in the API log |
| Each release | Backup first, then upgrade ([deployment.md §7](deployment.md#7-upgrades)); `npm audit` in `backend/` and `frontend/` |
| Quarterly | Full restore drill onto a spare database and cut-over rehearsal (§3); check the key copy off the server still opens a backup |

## 2. Backups

`backup:create` writes one folder: a MySQL dump of the whole database and every
uploaded image, each file encrypted (AES-256-GCM) with your key and listed in
a manifest with its checksum. It refuses to run while a release holds the
database lock, and fails (`source_changed`) if the database or the uploads
change while it runs, so writes must be stopped for the few seconds it takes.

Not included: the environment file (keep `backend/.env` in your password
manager), certificates (`rms_caddy_data`; Caddy can re-issue them), and images
stored in Cloudinary (`MEDIA_STORAGE=cloudinary`; Cloudinary keeps those).

### One-time setup on the server

Backups run on the server itself, not in a container: they need MySQL's own
client tools (`mysqldump`, `mysql`), which the API image doesn't carry.

```bash
sudo apt install -y mysql-client          # Ubuntu ships MySQL 8's client (not MariaDB's)
# Node.js 22, e.g. from NodeSource or nvm, then build the tool from the same checkout:
cd /srv/rms/backend && npm ci && npm run build

sudo install -d -m 700 /etc/rms /var/backups/rms
sudo npm run backup:keygen:prod           # writes BACKUP_KEY_FILE (/etc/rms/backup.key)
```

**Copy the key somewhere safe away from the server** (a password manager, an
offline copy). Without it no backup can be read; with it and a backup, anyone
can read your customers' data. Rebuild the tool (`npm ci && npm run build`)
after each upgrade.

### Taking a backup

```bash
cd /srv/rms
export DATABASE_HOST=127.0.0.1 DATABASE_PORT=3307   # the database's loopback port
export UPLOAD_DIR="$(docker volume inspect -f '{{ .Mountpoint }}' rms_uploads_data)"
OUT=/var/backups/rms/$(date -u +%Y%m%dT%H%M%SZ)

dc stop edge api                          # stop writes: the site is offline from here…
npm --prefix backend run backup:create:prod -- --output "$OUT" --quiesced
dc start api edge                         # …to here
npm --prefix backend run backup:verify:prod -- --input "$OUT"
```

Run it as root (the uploads volume belongs to Docker). Each command prints one
line of JSON; anything but a success status exits 1. Variables set on the
command line win over `backend/.env`, which still provides the database
credentials and the key path.

Then copy `$OUT` off the server (rsync, rclone, object storage): it is
already encrypted. Keep, for example, 14 daily and 8 weekly copies. Schedule
the whole block with cron at a quiet hour; the site is offline for the
backup's duration plus an API start.

## 3. Restoring

The tool never restores over a live database: it creates a **new** database
named `boilerplate_restore_<16 hex characters>` and a new uploads folder, and
refuses if either exists. It also refuses a database server that isn't on this
machine, and any run with `NODE_ENV=production`, the guard against restoring by
accident inside the production container. Restore commands therefore set
`NODE_ENV=development` for that one command (it changes nothing else in the
tool) and use MySQL's root account, because they create databases.

### Rehearsal (weekly)

```bash
cd /srv/rms
export NODE_ENV=development DATABASE_HOST=127.0.0.1 DATABASE_PORT=3307 DATABASE_USER=root
read -rs DATABASE_PASS && export DATABASE_PASS     # the DATABASE_ROOT_PASSWORD
npm --prefix backend run backup:restore-check:prod -- --input /var/backups/rms/<folder>
```

It decrypts and checks every file, imports the dump into a throwaway database,
verifies the schema, then drops it. Expect `"status": "restore_checked"`.

### Real restore

1. Stop the site: `dc stop edge api`.
2. Restore next to the live data, with the same `export` lines as the
   rehearsal:

   ```bash
   TARGET=boilerplate_restore_$(openssl rand -hex 8)
   npm --prefix backend run backup:restore:prod -- \
     --input /var/backups/rms/<folder> --target "$TARGET" --uploads /var/backups/rms/restored-uploads
   ```

3. Let the application's database user use it (in `dc exec db mysql -u root -p`):

   ```sql
   GRANT ALL PRIVILEGES ON `boilerplate_restore_…`.* TO 'rms_app'@'%';
   ```

4. Point the app at it: `DATABASE_NAME=boilerplate_restore_…` in `backend/.env`.
5. Swap the images: move the current contents of the `rms_uploads_data`
   mountpoint aside, copy the restored files in, and give them to the
   container user: `chown -R 1000:1000 <mountpoint>`.
6. Start: `dc up -d`. The API verifies the schema before it starts
   (`dc logs -f api`). Check the admin and a storefront.
7. Keep the old database until you are sure, then drop it.

## 4. When something breaks

| Symptom | Look at | Usually |
| ------- | ------- | ------- |
| Site down for everyone | `dc ps`, `dc logs --tail 100 api edge` | API failed to start: the release step names the reason (`schema_drift`, `newer_or_unknown_migrations`, `release_in_progress`), or env validation lists bad settings |
| `/api/health/ready` fails, `/live` works | `dc logs db`, disk space | Database down or full |
| A new organization's site has a certificate error | `dc logs edge` | DNS for `*.{platform}` missing, or the slug was mistyped; Caddy only asks for certificates the API vouches for (`/api/v1/public/sites/tls-check?domain=…` → 200) |
| An organization's own domain doesn't load | `organization_domains` row | Not registered, `verified_at` empty, or its DNS doesn't point at the server ([deployment.md §3](deployment.md#3-dns)) |
| Customers get "too many requests" | `TRUST_PROXY` | A proxy in front of the server isn't trusted, so everyone shares one address ([deployment.md](deployment.md#trust_proxy)) |
| Emails don't arrive | `dc exec api npm run mail:status:prod`, the API log | SMTP settings; mail failures are logged and never fail the action that sent them |
| Pages slow | `query is slow` lines in the API log | A missing index or an unusual search; keep the SQL and its timing for the developers |
| Upload refused with "not a supported image" | The file | It doesn't decode as JPG/PNG/WebP/AVIF/GIF (often a renamed or damaged file); re-export it |

**Secrets.** Changing `JWT_SECRET` signs everyone out. Changing a database password needs `ALTER USER` in MySQL as
well as the new value in `backend/.env`, then `dc up -d`. A new backup key only
applies to new backups: keep the old key as long as you keep backups made with
it.

## 5. Drill record

The backup tooling (`backup:keygen`, `backup:create --quiesced`,
`backup:verify`, `backup:restore-check`) was rehearsed on the original
project. Record your own drill here, run against your real server, before
going live.
