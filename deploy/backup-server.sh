#!/bin/bash
# ===========================================
# Backup von Datenbank, Code und Konfiguration
# ===========================================
# Auf dem Server als root ausführen. Installation und Cronjob: siehe DEPLOYMENT.md.
# Wird von deploy/update-server.sh vor jedem Deployment aufgerufen.
# ===========================================

set -euo pipefail

PROJECT_DIR="/var/www/schichtplaner"
BACKUP_DIR="/var/backups/schichtplaner"
DB_NAME="schichtplan_db"
SERVICE="gunicorn-vardiy"
NGINX_SITE="/etc/nginx/sites-available/schichtplaner"
RETENTION_DAYS=30

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "=== Backup $(date '+%Y-%m-%d %H:%M:%S') ==="

# Backups enthalten .env und settings.py mit Zugangsdaten – nur für root lesbar
mkdir -p "$BACKUP_DIR"/{database,backend,frontend,configs}
chmod 700 "$BACKUP_DIR"

# 1. Datenbank (--clean: ein Restore ersetzt die vorhandenen Tabellen)
DB_FILE="$BACKUP_DIR/database/db_$TIMESTAMP.sql.gz"
sudo -u postgres pg_dump --clean --if-exists "$DB_NAME" | gzip > "$DB_FILE"
echo "✓ Datenbank  $(du -h "$DB_FILE" | cut -f1)"

# 2. Backend inkl. .env, settings.py und Uploads (ohne venv und generierte Dateien)
BACKEND_FILE="$BACKUP_DIR/backend/backend_$TIMESTAMP.tar.gz"
tar -czf "$BACKEND_FILE" -C "$PROJECT_DIR" \
    --exclude='backend/venv' \
    --exclude='backend/staticfiles' \
    --exclude='backend/gunicorn.ctl' \
    --exclude='__pycache__' \
    backend
echo "✓ Backend    $(du -h "$BACKEND_FILE" | cut -f1)"

# 3. Frontend-Build
FRONTEND_FILE="$BACKUP_DIR/frontend/frontend_$TIMESTAMP.tar.gz"
tar -czf "$FRONTEND_FILE" -C "$PROJECT_DIR" frontend
echo "✓ Frontend   $(du -h "$FRONTEND_FILE" | cut -f1)"

# 4. Server-Konfiguration (relativ zu /, Restore mit "tar -xzf ... -C /")
CONFIG_FILE="$BACKUP_DIR/configs/configs_$TIMESTAMP.tar.gz"
tar -czf "$CONFIG_FILE" -C / "${NGINX_SITE#/}" "etc/systemd/system/$SERVICE.service"
echo "✓ Configs    $(du -h "$CONFIG_FILE" | cut -f1)"

# 5. Alte Backups löschen
find "$BACKUP_DIR" -type f -name '*.gz' -mtime +"$RETENTION_DAYS" -delete

echo "✓ Fertig – insgesamt $(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR"
