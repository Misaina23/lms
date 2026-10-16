from django.core.management.base import BaseCommand

from absences.alerts import send_repeated_absence_notifications


class Command(BaseCommand):
    help = 'Envoie les notifications quotidiennes pour les absences répétées.'

    def handle(self, *args, **options):
        created_count = send_repeated_absence_notifications()
        self.stdout.write(
            self.style.SUCCESS(
                f'{created_count} notification(s) d’absences répétées envoyée(s).'
            )
        )
