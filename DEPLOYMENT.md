# Deployment und Serverbetrieb

## Server auf einen Blick

| | |
|---|---|
| Zugang | `ssh hetzner` (Alias in `~/.ssh/config`, root@91.99.205.96) |
| Domain | https://schichtplaner.vardiy.de |
| Projektordner | `/var/www/schichtplaner/` mit `backend/` (Code + `venv/`) und `frontend/` (fertiger Angular-Build) |
| Backend-Dienst | systemd-Unit `gunicorn-vardiy` (gunicorn auf `127.0.0.1:8000`) – Kopie: [deploy/gunicorn-vardiy.service](deploy/gunicorn-vardiy.service) |
| Webserver | nginx-Site `/etc/nginx/sites-available/schichtplaner` – Kopie: [deploy/nginx-schichtplaner.conf](deploy/nginx-schichtplaner.conf) |
| Datenbank | PostgreSQL 16, Datenbank `schichtplan_db`, Benutzer `schichtplan_user` |
| Produktions-Settings | `backend/schichtplan/settings.py` **und** `backend/.env` – existieren nur auf dem Server, werden nie überschrieben |
| Backups | `/var/backups/schichtplaner/` |

Der Server ist **kein** Git-Checkout. Code wird mit `deploy/update-server.sh` übertragen.

> Wird der Projektordner umbenannt, müssen drei Stellen nachgezogen werden: `WorkingDirectory`/`ExecStart` in der systemd-Unit, `root`/`alias` in der nginx-Site und die Pfade in den Startskripten unter `backend/venv/bin/` (oder das venv neu anlegen). Sonst liefert nginx nur noch Fehler aus und gunicorn startet beim nächsten Neustart nicht mehr.

## Update deployen

Lokal im Repo-Ordner (unter Windows in Git Bash):

```bash
deploy/update-server.sh --dry-run    # zeigt, welche Backend-Dateien hochgeladen würden
deploy/update-server.sh              # Backend + Frontend
deploy/update-server.sh backend      # nur Backend
deploy/update-server.sh frontend     # nur Frontend
```

Das Skript

1. ruft auf dem Server das Backup-Skript auf (falls installiert, siehe unten),
2. lädt den Backend-Code hoch, installiert `requirements.txt`, führt `migrate` und `collectstatic` aus und startet `gunicorn-vardiy` neu,
3. baut das Frontend (`ng build --configuration production`) und tauscht `frontend/` auf dem Server in einem Schritt aus,
4. prüft am Ende, ob Frontend (200) und API (405 auf GET `/api/v1/accounts/login/`) antworten.

Nie hochgeladen werden `schichtplan/settings.py`, `.env`, `venv/`, `env/`, `db.sqlite3`, `media/`, `staticfiles/` und `create_test_user.py` (setzt das Admin-Passwort auf `admin123`).

Nach einem Frontend-Update fragt die App bei geöffneten Browsern selbst nach („Neue Version verfügbar. Jetzt aktualisieren?“), weil der Service Worker (PWA) die neue Version erkennt.

## Backups und Rollback

### Einmalig installieren

```bash
scp deploy/backup-server.sh deploy/rollback-server.sh hetzner:/usr/local/bin/
ssh hetzner "chmod 700 /usr/local/bin/backup-server.sh /usr/local/bin/rollback-server.sh && /usr/local/bin/backup-server.sh"
```

`backup-server.sh` sichert mit Zeitstempel nach `/var/backups/schichtplaner/`: Datenbank-Dump, Backend inkl. `.env`, `settings.py` und Uploads (ohne venv), Frontend-Build sowie nginx- und systemd-Konfiguration. Backups älter als 30 Tage werden gelöscht. Der Ordner ist nur für root lesbar, weil die Backups Zugangsdaten enthalten.

### Wiederherstellen

```bash
ssh hetzner
rollback-server.sh
```

Das Skript fragt, was wiederhergestellt werden soll (Datenbank, Backend, Frontend, Konfiguration oder DB + Backend + Frontend), zeigt die vorhandenen Backups an und sichert den aktuellen Stand vorher noch einmal. Das `venv` bleibt beim Backend-Rollback erhalten. Enthielt das zurückgenommene Update Migrationen, müssen **Backend und Datenbank** zurückgesetzt werden.

## Regelmäßige Aufgaben (Cron)

Als root auf dem Server mit `crontab -e`:

```cron
# Backup
30 1 * * * /usr/local/bin/backup-server.sh >> /var/log/schichtplaner-backup.log 2>&1
# Demo-Konto zurücksetzen (die Demo kündigt "täglich um 2 Uhr" an)
0 2 * * * cd /var/www/schichtplaner/backend && venv/bin/python manage.py reset_demo_account >> /var/log/schichtplaner-demo.log 2>&1
# DSGVO-Löschfristen: Benachrichtigungen nach 90 Tagen, Schichten/Urlaub/Tauschanfragen nach 3 Jahren, deaktivierte Organisationen nach 30 Tagen
0 3 * * * cd /var/www/schichtplaner/backend && venv/bin/python manage.py cleanup_expired_data >> /var/log/schichtplaner-cleanup.log 2>&1
# Abgelaufene Testzeiträume deaktivieren
30 3 * * * cd /var/www/schichtplaner/backend && venv/bin/python manage.py check_trial_expiry >> /var/log/schichtplaner-trials.log 2>&1
```

`cleanup_expired_data` und `check_trial_expiry` kennen `--dry-run`, das zeigt die betroffenen Datensätze, ohne etwas zu ändern. Vor dem ersten echten Lauf von `cleanup_expired_data` sollte man das einmal ausführen. Die Demo-Organisation wird bei Bedarf mit `reset_demo_account --setup` angelegt.

## Konfiguration auf dem Server

Produktionswerte stehen in `backend/schichtplan/settings.py` auf dem Server. Als Vorlage dient [backend/schichtplan/settings_production_template.py](backend/schichtplan/settings_production_template.py), Geheimnisse liegen in `backend/.env` (Schlüssel siehe [backend/.env.example](backend/.env.example)). Nach Änderungen: `systemctl restart gunicorn-vardiy`.

**E-Mail** (SMTP wird aktiv, sobald `EMAIL_HOST` gesetzt ist; sonst gibt Django E-Mails nur auf der Konsole aus):

```env
EMAIL_HOST=mail.example.de
EMAIL_PORT=587            # STARTTLS; alternativ 465 mit EMAIL_USE_SSL=True und EMAIL_USE_TLS=False
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=info@example.de
EMAIL_HOST_PASSWORD=...
DEFAULT_FROM_EMAIL=info@example.de
```

Testen: `cd /var/www/schichtplaner/backend && venv/bin/python manage.py sendtestemail adresse@example.de`

**Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` und `FRONTEND_URL` in der `.env`. Der Webhook zeigt auf `https://schichtplaner.vardiy.de/api/v1/subscriptions/webhook/stripe/`.

`.env` und `settings.py` sollten nur für root und www-data lesbar sein (`chmod 600`).

## Neuen Server einrichten

1. Pakete: `apt install python3-venv postgresql nginx certbot python3-certbot-nginx`
2. Datenbank: `sudo bash deploy/setup-postgres.sh` (fragt das Passwort ab)
3. `/var/www/schichtplaner/backend` anlegen, Code hochladen (`deploy/update-server.sh backend` braucht vorher venv und Settings, daher beim ersten Mal per `scp`), dann:
   ```bash
   cd /var/www/schichtplaner/backend
   python3 -m venv venv && venv/bin/pip install -r requirements.txt
   cp schichtplan/settings_production_template.py schichtplan/settings.py   # Werte anpassen, .env anlegen
   venv/bin/python manage.py migrate && venv/bin/python manage.py collectstatic --noinput
   venv/bin/python manage.py createsuperuser
   ```
4. systemd: `deploy/gunicorn-vardiy.service` nach `/etc/systemd/system/` kopieren, `systemctl enable --now gunicorn-vardiy`
5. nginx: `deploy/nginx-schichtplaner.conf` ohne die Certbot-Zeilen nach `/etc/nginx/sites-available/schichtplaner`, in `sites-enabled` verlinken, dann `certbot --nginx -d schichtplaner.vardiy.de`
6. Frontend: `deploy/update-server.sh frontend`, danach Backups und Cronjobs wie oben einrichten

## Fehlersuche

| Symptom | Prüfen |
|---|---|
| Seite liefert 500 oder 404 | `nginx -t`, `tail /var/log/nginx/error.log` – stimmt `root` in der nginx-Site? |
| 502 Bad Gateway | `systemctl status gunicorn-vardiy`, `journalctl -u gunicorn-vardiy -n 50` |
| Admin-Oberfläche ohne CSS | `venv/bin/python manage.py collectstatic --noinput` |
| CORS-Fehler im Browser | `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` in den Server-Settings |
| Keine E-Mails | `EMAIL_*` in der `.env`, `sendtestemail` (siehe oben), Fehler im gunicorn-Journal |
