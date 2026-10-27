from django.apps import AppConfig


class ShiftsConfig(AppConfig):
    name = 'shifts'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        import shifts.signals  # noqa: F401 - registers the signal receivers
