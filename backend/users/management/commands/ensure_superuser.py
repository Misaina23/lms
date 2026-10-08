from django.conf import settings
from django.core.management.base import BaseCommand

from users.models import CustomUser


class Command(BaseCommand):
    help = 'Crée ou met à jour le super-admin du portail (email admin@gmail.com / mot de passe 123456 par défaut).'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='admin@gmail.com')
        parser.add_argument('--password', default='123456')
        parser.add_argument('--first-name', default='Admin')
        parser.add_argument('--last-name', default='Portal')
        parser.add_argument('--matricule', default='ADM-ROOT-001')
        parser.add_argument('--force', action='store_true', help='Met à jour le super-admin existant même s’il est déjà présent.')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']

        if not email:
            raise ValueError('Un email est requis pour le super-admin.')
        if not password:
            raise ValueError('Un mot de passe est requis pour le super-admin.')

        user, created = CustomUser.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': options['first_name'],
                'last_name': options['last_name'],
                'matricule': options['matricule'],
                'role': CustomUser.Role.ADMIN,
                'status': CustomUser.Status.ACTIVE,
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
            },
        )

        if created:
            user.set_password(password)
            user.save(update_fields=['password'])
            self.stdout.write(self.style.SUCCESS(f'Compte admin créé : {email}'))
            return

        if not options['force']:
            self.stdout.write(self.style.WARNING(f'Le compte {email} existe déjà. Aucun changement n’a été appliqué.'))
            return

        user.username = email
        user.first_name = options['first_name']
        user.last_name = options['last_name']
        user.matricule = options['matricule']
        user.role = CustomUser.Role.ADMIN
        user.status = CustomUser.Status.ACTIVE
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Compte admin mis à jour : {email}'))
