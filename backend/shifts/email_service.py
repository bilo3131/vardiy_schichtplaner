"""
Email-Service für Schichtplan-Benachrichtigungen
"""
import logging

from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def send_shift_notification(employee, shifts, week_display):
    """
    Sendet eine Email-Benachrichtigung an einen Mitarbeiter über seine Schichten

    Args:
        employee: Employee-Objekt
        shifts: Liste von Shift-Objekten für diesen Mitarbeiter
        week_display: String mit der Wochenanzeige (z.B. "KW 4 (27.01. - 02.02.2026)")

    Returns:
        bool: True wenn erfolgreich, False bei Fehler
    """
    if not employee.user or not employee.user.email:
        logger.warning("Keine Email-Adresse für Mitarbeiter %s", employee)
        return False

    employee_name = f"{employee.user.first_name} {employee.user.last_name}"
    organization_name = employee.user.organization.name
    subject = f'Schichtplan {week_display} - {organization_name}'

    message = f"""
Hallo {employee_name},

Ihr Schichtplan für {week_display} wurde veröffentlicht.

Sie sind für {len(shifts)} Schicht(en) eingeteilt:

"""
    for shift in shifts:
        message += (
            f"  • {shift.date.strftime('%A, %d.%m.%Y')}: {shift.shift_type.name} "
            f"({shift.start_time.strftime('%H:%M')} - {shift.end_time.strftime('%H:%M')})\n"
        )
        if shift.notes:
            message += f"    Hinweis: {shift.notes}\n"

    message += f"""
Mit freundlichen Grüßen
{organization_name}

---
Diese Email wurde automatisch generiert.
"""

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.user.email],
            fail_silently=False,
        )
        logger.info("Email erfolgreich an %s gesendet", employee.user.email)
        return True
    except Exception:
        logger.exception("Fehler beim Senden der Email an %s", employee.user.email)
        return False


def send_bulk_shift_notifications(employees_with_shifts, week_display):
    """
    Sendet Benachrichtigungen an mehrere Mitarbeiter

    Args:
        employees_with_shifts: Dict {employee: [shifts]}
        week_display: String mit der Wochenanzeige

    Returns:
        dict: {'sent': int, 'failed': int, 'total': int}
    """
    sent = 0
    failed = 0

    for employee, shifts in employees_with_shifts.items():
        if send_shift_notification(employee, shifts, week_display):
            sent += 1
        else:
            failed += 1

    return {
        'sent': sent,
        'failed': failed,
        'total': sent + failed
    }
