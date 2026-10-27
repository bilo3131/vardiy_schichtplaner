from rest_framework import status
from rest_framework.response import Response
from django.utils.deprecation import MiddlewareMixin

# Pfade, die auch bei abgelaufener Subscription erlaubt bleiben (Lesezugriff + Auth)
SUBSCRIPTION_EXEMPT_PATHS = [
    '/api/v1/accounts/login/',
    '/api/v1/accounts/logout/',
    '/api/v1/accounts/demo-login/',
    '/api/v1/accounts/users/me/',
    '/api/v1/subscriptions/my_subscription/',
    '/api/v1/subscriptions/check_limits/',
    '/api/v1/subscriptions/tier_options/',
    '/api/v1/subscriptions/create-checkout-session/',
    '/api/v1/subscriptions/checkout-success/',
    '/api/v1/subscriptions/webhook/',
    '/admin/',
]

# Nur diese HTTP-Methoden werden für abgelaufene Subscriptions blockiert
WRITE_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')


class SubscriptionLimitMiddleware(MiddlewareMixin):
    """
    Middleware zur Prüfung des Subscription-Ablauf-Status.
    Blockiert Schreibzugriffe bei abgelaufenen Trials/Subscriptions. Die Mitarbeiter- und
    Abteilungs-Limits werden in den ViewSets geprüft (PermissionHelpers.check_subscription_limit).
    """

    def process_view(self, request, view_func, view_args, view_kwargs):
        path = request.path
        user = request.user

        # Nur für authentifizierte Benutzer
        if not user.is_authenticated:
            return None

        # Organization und Subscription ermitteln
        organization = getattr(user, 'organization', None)
        if not organization:
            return None

        subscription = getattr(organization, 'subscription', None)
        if not subscription:
            return None

        # Exempt-Pfade überspringen
        if any(path.startswith(exempt) for exempt in SUBSCRIPTION_EXEMPT_PATHS):
            return None

        # Bei abgelaufener/inaktiver Subscription: Schreibzugriffe blockieren
        if request.method in WRITE_METHODS and (
            not subscription.is_active or subscription.is_expired(organization)
        ):
            return Response(
                {
                    'detail': (
                        'Ihr Testzeitraum bzw. Abonnement ist abgelaufen. '
                        'Bitte wählen Sie ein Abonnement, um fortzufahren.'
                    ),
                    'subscription_expired': True,
                    'trial_end_date': str(subscription.trial_end_date) if subscription.trial_end_date else None,
                    'subscription_end_date': str(subscription.subscription_end_date) if subscription.subscription_end_date else None,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        return None
