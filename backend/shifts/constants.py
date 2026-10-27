"""
Central configuration constants for the shift management system.

This module contains all magic strings and numbers used throughout the application,
making it easier to maintain and modify business rules.
"""


class UserRoles:
    """User role constants for permission checks."""

    # Individual roles
    ADMIN = 'admin'
    HR = 'hr'
    DEPARTMENT_MANAGER = 'department_manager'
    TEAM_LEADER = 'team_leader'
    GROUP_LEADER = 'group_leader'
    EMPLOYEE = 'employee'

    # Role groups for common permission patterns
    ADMIN_ROLES: list[str] = [ADMIN, HR]
    MANAGER_ROLES: list[str] = [ADMIN, HR, DEPARTMENT_MANAGER]
    SUPERVISOR_ROLES: list[str] = [ADMIN, HR, DEPARTMENT_MANAGER, TEAM_LEADER, GROUP_LEADER]
    NON_EMPLOYEE_ROLES: list[str] = [ADMIN, HR, DEPARTMENT_MANAGER, TEAM_LEADER, GROUP_LEADER]

    @classmethod
    def is_admin_or_hr(cls, role: str) -> bool:
        """Check if role is admin or HR."""
        return role in cls.ADMIN_ROLES

    @classmethod
    def is_manager_or_above(cls, role: str) -> bool:
        """Check if role is manager level or above."""
        return role in cls.MANAGER_ROLES

    @classmethod
    def is_supervisor_or_above(cls, role: str) -> bool:
        """Check if role is supervisor level or above."""
        return role in cls.SUPERVISOR_ROLES


class VacationRequestStatus:
    """Status choices for vacation requests."""

    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'

    CHOICES: list[tuple[str, str]] = [
        (PENDING, 'Ausstehend'),
        (APPROVED, 'Genehmigt'),
        (REJECTED, 'Abgelehnt'),
    ]


class ShiftStatus:
    """Status choices for shifts."""

    DRAFT = 'draft'
    PUBLISHED = 'published'

    CHOICES: list[tuple[str, str]] = [
        (DRAFT, 'Entwurf'),
        (PUBLISHED, 'Veröffentlicht'),
    ]


class ShiftSwapRequestStatus:
    """Status choices for shift swap requests."""

    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'

    CHOICES: list[tuple[str, str]] = [
        (PENDING, 'Ausstehend'),
        (APPROVED, 'Genehmigt'),
        (REJECTED, 'Abgelehnt'),
    ]


class WorkingTimeRules:
    """German working time law (Arbeitszeitgesetz) compliance rules."""

    MINIMUM_REST_HOURS = 11  # Minimum hours between shifts

    # Night shift window used to calculate night hours
    NIGHT_SHIFT_START_HOUR = 23  # 23:00
    NIGHT_SHIFT_END_HOUR = 6     # 06:00


class SystemDefaults:
    """Default values used throughout the system."""

    DEFAULT_PASSWORD_LENGTH = 8
    DEFAULT_MIN_EMPLOYEES_PER_SHIFT = 1
    DEFAULT_SHIFT_COLOR = '#3498db'


class ValidationMessages:
    """Standard validation and error messages."""

    # Permission errors
    PERMISSION_DENIED = 'Sie haben keine Berechtigung für diese Aktion'
    ADMIN_HR_ONLY = 'Nur Administratoren und Personalwesen dürfen diese Aktion ausführen'
    NON_EMPLOYEE_ONLY = 'Nur Nutzer mit Führungsrollen dürfen diese Aktion ausführen'

    # Organization errors
    NO_ORGANIZATION = 'Sie müssen einer Organisation zugeordnet sein'

    # Subscription errors
    SUBSCRIPTION_LIMIT_TEMPLATE = 'Limit erreicht: Sie können maximal {limit} {resource} im {tier}-Plan erstellen. Bitte upgraden Sie Ihr Abonnement.'

    # Status errors
    MUST_BE_PENDING = 'Nur ausstehende Anträge können geändert werden'

    # Working time violations
    REST_PERIOD_VIOLATION = 'Ruhezeit zu kurz: {actual}h (mindestens {required}h erforderlich)'
