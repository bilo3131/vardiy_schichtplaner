#!/bin/bash
# ===========================================
# Stellt einen Stand aus den Backups wieder her
# ===========================================
# Auf dem Server als root ausführen. Fragt interaktiv, was wiederhergestellt werden soll,
# und sichert den aktuellen Stand vorher noch einmal.
# Hinweis: Wenn ein Update Migrationen enthielt, Backend UND Datenbank zurücksetzen.
# ===========================================

set -euo pipefail

PROJECT_DIR="/var/www/schichtplaner"
BACKUP_DIR="/var/backups/schichtplaner"
DB_NAME="schichtplan_db"
SERVICE="gunicorn-vardiy"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [ "$EUID" -ne 0 ]; then
    echo "Bitte als root ausführen." >&2
    exit 1
fi

# Listet die Backups einer Kategorie (neueste zuerst) und gibt den gewählten Pfad aus.
# Menü und Eingabe laufen über stderr, damit der Aufruf per $(...) funktioniert.
choose_backup() {
    local dir="$BACKUP_DIR/$1"
    local files=()
    mapfile -t files < <(ls -1t "$dir" 2>/dev/null)
    if [ ${#files[@]} -eq 0 ]; then
        echo "Keine Backups in $dir gefunden." >&2
        return 1
    fi

    echo "" >&2
    echo "Verfügbare Backups ($1):" >&2
    local i=1
    for file in "${files[@]}"; do
        printf '%2d) %s (%s)\n' "$i" "$file" "$(du -h "$dir/$file" | cut -f1)" >&2
        i=$((i + 1))
    done

    local choice
    read -rp "Nummer wählen (0 = Abbrechen): " choice
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -eq 0 ] || [ "$choice" -gt ${#files[@]} ]; then
        echo "Abgebrochen." >&2
        return 1
    fi
    echo "$dir/${files[$((choice - 1))]}"
}

confirm() {
    local answer
    read -rp "$1 (yes/no): " answer
    [ "$answer" = "yes" ]
}

restore_database() {
    local file
    file=$(choose_backup database) || return 0
    confirm "Datenbank $DB_NAME mit $(basename "$file") überschreiben?" || return 0

    echo "► Sichere aktuellen Stand der Datenbank"
    sudo -u postgres pg_dump --clean --if-exists "$DB_NAME" | gzip > "$BACKUP_DIR/database/db_before_rollback_$TIMESTAMP.sql.gz"

    echo "► Stelle Datenbank wieder her"
    systemctl stop "$SERVICE"
    gunzip -c "$file" | sudo -u postgres psql --quiet -v ON_ERROR_STOP=1 -d "$DB_NAME" > /dev/null
    systemctl start "$SERVICE"
    echo "✓ Datenbank wiederhergestellt"
}

restore_backend() {
    local file tmp
    file=$(choose_backup backend) || return 0
    confirm "Backend mit $(basename "$file") überschreiben?" || return 0

    echo "► Sichere aktuellen Stand des Backends"
    tar -czf "$BACKUP_DIR/backend/backend_before_rollback_$TIMESTAMP.tar.gz" -C "$PROJECT_DIR" \
        --exclude='backend/venv' --exclude='backend/staticfiles' \
        --exclude='backend/gunicorn.ctl' --exclude='__pycache__' backend

    echo "► Stelle Backend wieder her (venv und staticfiles bleiben erhalten)"
    tmp=$(mktemp -d)
    tar -xzf "$file" -C "$tmp"
    systemctl stop "$SERVICE"
    rsync -a --delete --exclude='/venv' --exclude='/staticfiles' --exclude='/gunicorn.ctl' \
        "$tmp/backend/" "$PROJECT_DIR/backend/"
    rm -rf "$tmp"
    (cd "$PROJECT_DIR/backend" && venv/bin/python manage.py collectstatic --noinput --verbosity 0)
    systemctl start "$SERVICE"
    echo "✓ Backend wiederhergestellt"
}

restore_frontend() {
    local file tmp
    file=$(choose_backup frontend) || return 0
    confirm "Frontend mit $(basename "$file") überschreiben?" || return 0

    echo "► Sichere aktuellen Stand des Frontends"
    tar -czf "$BACKUP_DIR/frontend/frontend_before_rollback_$TIMESTAMP.tar.gz" -C "$PROJECT_DIR" frontend

    echo "► Stelle Frontend wieder her"
    tmp=$(mktemp -d "$PROJECT_DIR/.rollback.XXXXXX")
    tar -xzf "$file" -C "$tmp"
    rm -rf "$PROJECT_DIR/frontend"
    mv "$tmp/frontend" "$PROJECT_DIR/frontend"
    rmdir "$tmp"
    echo "✓ Frontend wiederhergestellt"
}

restore_configs() {
    local file
    file=$(choose_backup configs) || return 0
    confirm "nginx- und systemd-Konfiguration mit $(basename "$file") überschreiben?" || return 0

    tar -xzf "$file" -C /
    systemctl daemon-reload
    nginx -t
    systemctl reload nginx
    systemctl restart "$SERVICE"
    echo "✓ Konfiguration wiederhergestellt"
}

echo "=========================================="
echo "  Schichtplaner – Rollback"
echo "=========================================="
echo "1) Datenbank"
echo "2) Backend"
echo "3) Frontend"
echo "4) Server-Konfiguration (nginx, systemd)"
echo "5) Datenbank + Backend + Frontend"
echo "0) Abbrechen"
read -rp "Auswahl: " main_choice

case "$main_choice" in
    1) restore_database ;;
    2) restore_backend ;;
    3) restore_frontend ;;
    4) restore_configs ;;
    5) restore_database; restore_backend; restore_frontend ;;
    *) echo "Abgebrochen."; exit 0 ;;
esac

echo ""
echo "Service: $(systemctl is-active "$SERVICE") – bitte https://schichtplaner.vardiy.de prüfen."
