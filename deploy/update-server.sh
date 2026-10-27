#!/bin/bash
# ===========================================
# Deployt Backend und/oder Frontend auf den Server
# ===========================================
# Lokal im Repo ausführen (Git Bash unter Windows, Linux oder macOS):
#   deploy/update-server.sh             # Backend + Frontend
#   deploy/update-server.sh backend     # nur Backend
#   deploy/update-server.sh frontend    # nur Frontend
#   deploy/update-server.sh --dry-run   # listet nur die Backend-Dateien, die hochgeladen würden
#
# Voraussetzungen: SSH-Alias "hetzner" in ~/.ssh/config, im Frontend "npm install" ausgeführt.
# Der Server ist kein Git-Checkout – Dateien werden per tar über SSH übertragen.
# ===========================================

set -euo pipefail

SERVER="hetzner"
REMOTE_DIR="/var/www/schichtplaner"
SERVICE="gunicorn-vardiy"
SITE_URL="https://schichtplaner.vardiy.de"

# Diese Dateien existieren auf dem Server in eigener Produktionsfassung oder werden dort
# erzeugt und dürfen nie überschrieben werden. create_test_user.py setzt das Admin-Passwort
# auf "admin123" und ist nur für die lokale Entwicklung gedacht.
BACKEND_EXCLUDES=(
    --exclude='./schichtplan/settings.py'
    --exclude='./.env'
    --exclude='./.env.*'
    --exclude='./env'
    --exclude='./venv'
    --exclude='./db.sqlite3*'
    --exclude='./media'
    --exclude='./staticfiles'
    --exclude='./logs'
    --exclude='./create_test_user.py'
    --exclude='__pycache__'
    --exclude='*.pyc'
)

DRY_RUN=false
TARGET="all"
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        backend|frontend|all) TARGET="$arg" ;;
        *) echo "Unbekanntes Argument: $arg" >&2; exit 1 ;;
    esac
done

cd "$(dirname "$0")/.."

pack_backend() {
    tar -czf - -C backend "${BACKEND_EXCLUDES[@]}" .
}

if $DRY_RUN; then
    echo "Folgende Backend-Dateien würden nach $SERVER:$REMOTE_DIR/backend hochgeladen:"
    pack_backend | tar -tzf - | grep -v '/$' | sort
    exit 0
fi

echo "► Backup auf dem Server"
ssh "$SERVER" "if [ -x /usr/local/bin/backup-server.sh ]; then /usr/local/bin/backup-server.sh; else echo 'WARNUNG: /usr/local/bin/backup-server.sh ist nicht installiert – es wird ohne Backup deployt.'; fi"

if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
    echo "► Backend hochladen"
    pack_backend | ssh "$SERVER" "tar -xzf - -C '$REMOTE_DIR/backend' --no-same-owner"

    echo "► Abhängigkeiten, Migrationen, Static Files, Neustart"
    ssh "$SERVER" "set -e
        cd '$REMOTE_DIR/backend'
        venv/bin/python -m pip install --quiet -r requirements.txt
        venv/bin/python manage.py migrate --noinput
        venv/bin/python manage.py collectstatic --noinput --verbosity 0
        systemctl restart '$SERVICE'
        echo \"$SERVICE: \$(systemctl is-active '$SERVICE')\""
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
    echo "► Frontend bauen"
    (cd frontend && npx ng build --configuration production)

    echo "► Frontend hochladen und austauschen"
    tar -czf - -C frontend/dist/frontend/browser . | ssh "$SERVER" "set -e
        cd '$REMOTE_DIR'
        rm -rf frontend.new frontend.old
        mkdir frontend.new
        tar -xzf - -C frontend.new --no-same-owner
        mv frontend frontend.old
        mv frontend.new frontend
        rm -rf frontend.old"
fi

echo "► Prüfung"
echo "  Frontend: $(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL/") (erwartet 200)"
echo "  API:      $(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL/api/v1/accounts/login/") (erwartet 405)"
echo "✓ Deployment abgeschlossen"
