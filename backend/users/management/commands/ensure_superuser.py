from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from users.models import CustomUser


class Command(BaseCommand):
    help = 'Crée ou met à jour le super-admin du portail.'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='admin@gmail.com')
        parser.add_argument('--password', required=True)
        parser.add_argument('--first-name', default='Admin')
        parser.add_argument('--last-name', default='Portal')
        parser.add_argument('--matricule', default='ADM-ROOT-001')
        parser.add_argument('--force', action='store_true', help='Met à jour le super-admin existant même s’il est déjà présent.')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']

        if not email:
            raise CommandError('Un email est requis pour le super-admin.')
        if not password:
            raise CommandError('Un mot de passe est requis pour le super-admin.')

        user = CustomUser.objects.filter(email=email).first()
        if user is None:
            user = CustomUser(
                username=email,
                email=email,
                first_name=options['first_name'],
                last_name=options['last_name'],
                matricule=options['matricule'],
                role=CustomUser.Role.ADMIN,
                status=CustomUser.Status.ACTIVE,
                is_active=True,
                is_staff=True,
                is_superuser=True,
            )
            self._validate_password(password, user)
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Compte admin créé : {email}'))
            return

        if not options['force']:
            self.stdout.write(self.style.WARNING(f'Le compte {email} existe déjà. Aucun changement n’a été appliqué.'))
            return

        self._validate_password(password, user)
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

    @staticmethod
    def _validate_password(password, user):
        try:
            password_validation.validate_password(password, user)
        except ValidationError as error:
            raise CommandError(
                'Le mot de passe du super-admin ne respecte pas la politique de sécurité : '
                + '; '.join(error.messages)
            ) from error
