from django.core.management.base import BaseCommand

from etudiants.payment_alerts import send_tuition_payment_reminders


class Command(BaseCommand):
    help = 'Crée les rappels internes pour les paiements de scolarité à régulariser.'

    def handle(self, *args, **options):
        created_count = send_tuition_payment_reminders()
        self.stdout.write(
            self.style.SUCCESS(
                f'{created_count} rappel(s) de paiement interne(s) créé(s).'
            )
        )
