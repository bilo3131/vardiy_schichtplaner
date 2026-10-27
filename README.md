# Vardiy – Schichtplaner

Webbasierte Schichtplanung für kleine und mittlere Unternehmen: Angular-Frontend, Django-REST-Backend, mandantenfähig (jede Organisation sieht nur ihre eigenen Daten).

Live: https://schichtplaner.vardiy.de · Deployment und Serverbetrieb: [DEPLOYMENT.md](DEPLOYMENT.md)

## Funktionen

- **Schichtplan** – Wochenansicht mit Drag & Drop, Konfliktprüfung (Abwesenheit, Urlaub, 11 h Ruhezeit, Wochenstunden), Qualifikationsabgleich, Veröffentlichung mit E-Mail an alle Eingeteilten, PDF-Export
- **Personal** – Mitarbeiter, Abteilungen, Qualifikationen, Schichttypen (inkl. Pausen- und Nachtstundenberechnung)
- **Urlaub & Abwesenheiten** – Urlaubsanträge mit Genehmigung, Krankmeldungen, Kurzarbeit, Kalenderansicht
- **Kalender** – Termine und Events mit Teilnehmern, Feiertage
- **Dashboard** – persönliche Kennzahlen und Manager-Statistiken (Krankenstand, Planungsfortschritt, Auslastung)
- **Abonnements** – Starter/Pro/Business mit Limits, Early-Access-Preise, Stripe-Checkout, Demo-Zugang
- **Sonstiges** – Benachrichtigungen, Dark Mode, Tutorial je Rolle, automatische Abmeldung nach 15 min Inaktivität, installierbar als PWA

## Tech-Stack

| Bereich | Technik |
|---|---|
| Frontend | Angular 19 (Standalone Components), Angular Material, FullCalendar, jsPDF |
| Backend | Python 3.12, Django 5.2, Django REST Framework (Token-Auth), Stripe |
| Datenbank | PostgreSQL (Server), SQLite (lokal) |
| Server | nginx, gunicorn, systemd auf Ubuntu |

## Lokale Entwicklung

Voraussetzungen: Python 3.12, Node.js 20+.

**Schnellstart (Windows):** `setup-local.bat` legt bei Bedarf das venv an, **löscht die lokale `db.sqlite3`**, migriert und erstellt einen Test-Admin (`admin` / `admin123`).

**Manuell:**

```bash
# Backend (Terminal 1)
cd backend
python -m venv env
env\Scripts\activate          # Linux/macOS: source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python create_test_user.py    # Admin "admin" / "admin123" mit Testfirma
python manage.py runserver    # http://localhost:8000

# Frontend (Terminal 2)
cd frontend
npm install
npx ng serve                  # http://localhost:4200
```

Lokal werden E-Mails nur in der Backend-Konsole ausgegeben. Für Stripe und SMTP siehe `backend/.env.example`.

## Projektstruktur

```
backend/
  accounts/         Benutzer, Organisationen, Login, Demo-Zugang
  shifts/           Schichten, Mitarbeiter, Urlaub, Abwesenheiten, Events, Benachrichtigungen
  subscriptions/    Abonnements, Limits, Stripe
  schichtplan/      Django-Projekt (settings.py = lokale Entwicklung)
frontend/src/app/
  core/             Services, Guards, Interceptors, Models, Konstanten (z. B. roles.constants.ts)
  features/         Seiten (Dashboard, Schichtplan, Personal, Urlaub, ...)
  shared/           Dialoge und wiederverwendbare Komponenten
deploy/             Deploy-, Backup- und Rollback-Skripte, Referenzkopien der Server-Konfiguration
setup-local.bat     Lokales Setup (Windows)
```

## Rollen

| Rolle | Zugriff |
|---|---|
| Administrator, Personalwesen | alles, inkl. Abteilungen und Abonnement |
| Abteilungsleiter | Schichtplan, Schichttypen, Personal, Qualifikationen, Urlaub, Abwesenheiten |
| Teamleiter, Gruppenleiter | Schichtplan, Personal, Qualifikationen, Urlaub, Abwesenheiten |
| Mitarbeiter | Dashboard, Kalender, eigener Schichtplan, eigene Urlaubsanträge |

Rollengruppen und Bezeichnungen sind zentral in `frontend/src/app/core/constants/roles.constants.ts` und `backend/shifts/constants.py` definiert.

**Neue Mitarbeiter** erhalten automatisch ein Login: Benutzername `vorname.nachname` (Umlaute umgeschrieben, bei Duplikaten mit Nummer), Startpasswort `Abc123` (`EmployeeConstants.DEFAULT_PASSWORD` in `backend/shifts/serializers.py`). Admin/HR können Passwörter in der Personalliste zurücksetzen. Mitarbeiter ändern ihr Passwort im Benutzermenü.

## API

Alle Endpunkte liegen unter `/api/v1/` und erwarten `Authorization: Token <token>` (außer Login).

| Pfad | Inhalt |
|---|---|
| `accounts/login/`, `logout/`, `demo-login/` | Anmeldung |
| `accounts/users/me/`, `users/change_password/`, `users/complete_tutorial/` | eigenes Profil |
| `shifts/shifts/` | Schichten, dazu `publish_week/` und `validate_compliance/` |
| `shifts/employees/`, `departments/`, `qualifications/`, `shift-types/` | Stammdaten |
| `shifts/vacation-requests/` (inkl. `approve/`, `reject/`), `absences/` | Urlaub und Abwesenheiten |
| `shifts/events/`, `holidays/`, `notifications/` | Kalender und Benachrichtigungen |
| `subscriptions/my_subscription/`, `create-checkout-session/`, `checkout-success/`, `webhook/stripe/` | Abonnement und Stripe |

Das Backend stellt außerdem Endpunkte für Schichttausch, Schichtvorlagen und Verfügbarkeiten bereit, für die es noch keine Oberfläche gibt.

## Tests und Checks

```bash
cd frontend && npx ng test --watch=false   # Unit-Tests (Karma)
cd frontend && npx ng build                # Build inkl. Template-Typprüfung
cd backend  && python manage.py check      # Django-Systemcheck
```

## Lizenz

Proprietär – alle Rechte vorbehalten.
