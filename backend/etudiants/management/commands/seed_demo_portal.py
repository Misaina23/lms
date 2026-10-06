from datetime import date
import secrets

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from classes.models import Classe, TeacherAssignment
from etudiants.models import Etudiant
from matieres.models import Matiere
from users.models import CustomUser


DEMO_PASSWORD = '123456'
DEMO_USERS = (
    {
        'email': 'admin@gmail.com',
        'first_name': 'Admin',
        'last_name': 'Démo',
        'matricule': 'DEMO-ADMIN-001',
        'role': CustomUser.Role.ADMIN,
    },
    {
        'email': 'enseignantmath@gmail.com',
        'first_name': 'Enseignant',
        'last_name': 'Mathématiques',
        'matricule': 'DEMO-PROF-001',
        'role': CustomUser.Role.PROFESSEUR,
    },
    {
        'email': 'surveillant1@gmail.com',
        'first_name': 'Surveillant',
        'last_name': 'Démo',
        'matricule': 'DEMO-SURV-001',
        'role': CustomUser.Role.SURVEILLANT,
    },
)

DEMO_CLASSES = (
    ('Seconde A', None, '2A'),
    ('Seconde B', None, '2B'),
    ('Seconde C', None, '2C'),
    ('Première L', Classe.Stream.LITTERAIRE, '1L'),
    ('Première S', Classe.Stream.SCIENTIFIQUE, '1S'),
    ('Première OSE', Classe.Stream.SOCIO_ECONOMIQUE, '1O'),
    ('Terminale L', Classe.Stream.LITTERAIRE, 'TL'),
    ('Terminale S', Classe.Stream.SCIENTIFIQUE, 'TS'),
    ('Terminale OSE', Classe.Stream.SOCIO_ECONOMIQUE, 'TO'),
)

STUDENT_FIRST_NAMES = ('Aina', 'Tojo', 'Miora', 'Hery', 'Soa')
STUDENT_LAST_NAMES = ('Rakoto', 'Razafy', 'Andry', 'Randria', 'Ralaivao')


class Command(BaseCommand):
    help = 'Crée les comptes et les dossiers élèves de démonstration (réservé au développement local).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--allow-insecure-passwords',
            action='store_true',
            help='Confirme explicitement la création de comptes de démonstration avec le mot de passe 123456.',
        )
        parser.add_argument(
            '--production',
            action='store_true',
            help='Autorise explicitement le seed en production avec des mots de passe forts générés aléatoirement.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        production = options['production']
        if production and settings.DEBUG:
            raise CommandError('--production est réservé à une instance configurée avec DEBUG=False.')
        if not production and not settings.DEBUG:
            raise CommandError('En production, ajoutez --production pour générer des mots de passe temporaires forts.')
        if not production and not options['allow_insecure_passwords']:
            raise CommandError('Ajoutez --allow-insecure-passwords pour confirmer la création locale des comptes de démonstration.')

        today = date.today()
        academic_year = f'{today.year}-{today.year + 1}' if today.month >= 9 else f'{today.year - 1}-{today.year}'
        users, generated_passwords = self._seed_users(production=production)
        classes = self._seed_classes(academic_year)
        self._seed_students(classes, today)
        self._assign_math_teacher(users['enseignantmath@gmail.com'], classes, academic_year)

        self.stdout.write(self.style.SUCCESS(
            f'Démo prête : {len(classes)} classes, {len(classes) * len(STUDENT_FIRST_NAMES)} élèves, '
            f'année {academic_year}.'
        ))
        if generated_passwords:
            self.stdout.write(self.style.WARNING('Mots de passe temporaires (affichés une seule fois pour les comptes nouvellement créés) :'))
            for email, password in generated_passwords.items():
                self.stdout.write(f'  {email} : {password}')
        self.stdout.write('Les mots de passe des comptes préexistants ne sont jamais modifiés.')

    def _seed_users(self, production):
        users = {}
        generated_passwords = {}
        for data in DEMO_USERS:
            user = CustomUser.objects.filter(email=data['email']).first()
            if user is not None:
                if user.role != data['role'] or not user.is_active or user.status != CustomUser.Status.ACTIVE:
                    raise CommandError(
                        f"Le compte {data['email']} existe avec un rôle ou un état différent; "
                        'aucune donnée existante n’a été modifiée.'
                    )
            else:
                user = CustomUser(
                    username=data['email'],
                    email=data['email'],
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    matricule=data['matricule'],
                    role=data['role'],
                    status=CustomUser.Status.ACTIVE,
                    is_active=True,
                    is_staff=data['role'] == CustomUser.Role.ADMIN,
                    is_superuser=data['role'] == CustomUser.Role.ADMIN,
                )
                password = secrets.token_urlsafe(24) if production else DEMO_PASSWORD
                user.set_password(password)
                user.save()
                if production:
                    generated_passwords[data['email']] = password
            users[data['email']] = user
        return users, generated_passwords

    def _seed_classes(self, academic_year):
        classes = {}
        for name, stream, code in DEMO_CLASSES:
            classe, _ = Classe.objects.update_or_create(
                nom=name,
                academic_year=academic_year,
                defaults={
                    'niveau': Classe.Niveau.SECONDAIRE_GENERAL,
                    'stream': stream,
                    'capacite': 35,
                },
            )
            classes[code] = classe
        return classes

    def _seed_students(self, classes, today):
        for code, classe in classes.items():
            for index, (first_name, last_name) in enumerate(
                zip(STUDENT_FIRST_NAMES, STUDENT_LAST_NAMES),
                start=1,
            ):
                matricule = f'DEMO-{today.year}-{code}-{index:02d}'
                Etudiant.objects.get_or_create(
                    matricule=matricule,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'gender': Etudiant.Gender.F if index % 2 == 0 else Etudiant.Gender.M,
                        'date_of_birth': date(today.year - 15, index, index + 1),
                        'classe': classe,
                        'date_inscription': today,
                        'statut': Etudiant.StudentStatus.ENROLLED,
                        'actif': True,
                    },
                )

    def _assign_math_teacher(self, teacher, classes, academic_year):
        math, _ = Matiere.objects.get_or_create(
            code='MATH',
            defaults={'nom': 'Mathématiques', 'coefficient': 5},
        )
        for classe in classes.values():
            TeacherAssignment.objects.get_or_create(
                professeur=teacher,
                classe=classe,
                matiere=math,
                academic_year=academic_year,
            )
