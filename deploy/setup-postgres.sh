#!/bin/bash

# ===========================================
# PostgreSQL Setup Script für den Schichtplaner
# ===========================================
# Legt Datenbank und Benutzer für einen neuen Server an.
# Nur bei der Ersteinrichtung nötig (siehe DEPLOYMENT.md).
#
# Ausführen auf dem Server als root/sudo:
# sudo bash setup-postgres.sh
# ===========================================

set -e  # Script bei Fehler abbrechen

echo "=========================================="
echo "PostgreSQL Setup für den Schichtplaner"
echo "=========================================="
echo ""

# Variablen (entsprechen der aktuellen Server-Konfiguration)
DB_NAME="schichtplan_db"
DB_USER="schichtplan_user"
DB_PASSWORD=""

# Frage nach Passwort (falls nicht gesetzt)
if [ -z "$DB_PASSWORD" ]; then
    read -sp "Gib das Datenbank-Passwort ein: " DB_PASSWORD
    echo ""
    read -sp "Passwort wiederholen: " DB_PASSWORD_CONFIRM
    echo ""
    
    if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
        echo "Fehler: Passwörter stimmen nicht überein!"
        exit 1
    fi
fi

# Prüfe ob PostgreSQL installiert ist
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL ist nicht installiert. Installiere..."
    sudo apt update
    sudo apt install postgresql postgresql-contrib -y
fi

# Prüfe ob PostgreSQL läuft
if ! systemctl is-active --quiet postgresql; then
    echo "Starte PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

echo ""
echo "Erstelle Datenbank und Benutzer..."

# Erstelle Datenbank-Benutzer und Datenbank
sudo -u postgres psql << EOF
-- Erstelle Benutzer (falls nicht vorhanden)
DO
\$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Erstelle Datenbank (falls nicht vorhanden)
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Gebe Berechtigungen
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Verbinde mit der Datenbank und gebe Schema-Berechtigungen
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ PostgreSQL Setup erfolgreich!"
    echo "=========================================="
    echo ""
    echo "Datenbank-Details:"
    echo "  Name:     $DB_NAME"
    echo "  Benutzer: $DB_USER"
    echo "  Host:     localhost"
    echo "  Port:     5432"
    echo ""
    echo "Nächste Schritte:"
    echo "  1. Datenbank-Werte in backend/schichtplan/settings.py bzw. backend/.env eintragen"
    echo "  2. Migrationen ausführen: venv/bin/python manage.py migrate"
    echo "  3. Superuser anlegen:     venv/bin/python manage.py createsuperuser"
    echo ""
else
    echo ""
    echo "✗ Fehler beim Erstellen der Datenbank!"
    exit 1
fi
