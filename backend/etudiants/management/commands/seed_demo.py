"""
Seed complet pour la démo Lycée Horizon.

Crée :
- 9 matières (Math, SVT, Français, Anglais, Malagache, PC, Histo-Géo, EPS, Philo)
- 9 classes (3 Seconde A/B/C, 3 Première L/OSE/S, 3 Terminale A1/A2/S)
- 12 enseignants (FONCTIONNAIRE + SUPPLEANT) répartis sur les matières
- 10 élèves par classe (90 élèves au total) avec dates réalistes
- Inscriptions + paiements (50 000 FCFA) avec statuts variés
- Notes (par matière, par élève, par période)
- Absences (pointage par cours, mix Présent/Retard/Absent)
- Emploi du temps (créneaux par classe avec conflits possibles à vérifier)
- Quelques notifications et orientations

Usage:
    python manage.py seed_demo
    python manage.py seed_demo --reset  # ATTENTION: supprime toutes les données existantes
"""
import random
import uuid
from datetime import datetime, date, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from users.models import CustomUser
from classes.models import Classe
from matieres.models import Matiere, ExamPeriod
from etudiants.models import Etudiant, Enrollment, StudentOrientation, AuditLog, Notification
from notes.models import Note
from absences.models import Absence
from timetable.models import TimetableSlot


# =========================
# Données de référence
# =========================

MATIERES = [
    {'code': 'MATH', 'nom': 'Mathématiques', 'coefficient': 5},
    {'code': 'PC', 'nom': 'Physique-Chimie', 'coefficient': 4},
    {'code': 'SVT', 'nom': 'Sciences de la Vie et de la Terre', 'coefficient': 3},
    {'code': 'FR', 'nom': 'Français', 'coefficient': 4},
    {'code': 'ANG', 'nom': 'Anglais', 'coefficient': 3},
    {'code': 'MAL', 'nom': 'Malagasy', 'coefficient': 3},
    {'code': 'HG', 'nom': 'Histoire-Géographie', 'coefficient': 3},
    {'code': 'EPS', 'nom': 'Éducation Physique et Sportive', 'coefficient': 1},
    {'code': 'PHILO', 'nom': 'Philosophie', 'coefficient': 4},
]

# Classes avec niveau, filière (stream) et capacité
CLASSES = [
    # 3 classes de Seconde (pas de filière en Seconde)
    {'nom': 'Seconde A', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': None, 'capacite': 35},
    {'nom': 'Seconde B', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': None, 'capacite': 35},
    {'nom': 'Seconde C', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': None, 'capacite': 35},
    # 3 classes de Première (filière)
    {'nom': 'Première L', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': Classe.Stream.LITTERAIRE, 'capacite': 30},
    {'nom': 'Première OSE', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': Classe.Stream.SOCIO_ECONOMIQUE, 'capacite': 30},
    {'nom': 'Première S', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': Classe.Stream.SCIENTIFIQUE, 'capacite': 30},
    # 3 classes de Terminale (filière)
    {'nom': 'Terminale A1', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': Classe.Stream.LITTERAIRE, 'capacite': 30},
    {'nom': 'Terminale A2', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': Classe.Stream.SOCIO_ECONOMIQUE, 'capacite': 30},
    {'nom': 'Terminale S', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'stream': Classe.Stream.SCIENTIFIQUE, 'capacite': 30},
]

# 12 enseignants avec leur(s) matière(s) et type
ENSEIGNANTS = [
    # Mathématiques (3 profs pour couvrir 9 classes)
    {'first': 'Rivo', 'last': 'Rakoto', 'matieres': ['MATH'], 'type': 'FONCTIONNAIRE', 'email': 'rivo.rakoto@lycee.mg', 'phone': '+261 32 11 111 01'},
    {'first': 'Naina', 'last': 'Andry', 'matieres': ['MATH'], 'type': 'SUPPLEANT', 'email': 'naina.andry@lycee.mg', 'phone': '+261 32 11 111 02'},
    # PC (2 profs)
    {'first': 'Soa', 'last': 'Razafy', 'matieres': ['PC'], 'type': 'FONCTIONNAIRE', 'email': 'soa.razafy@lycee.mg', 'phone': '+261 32 11 111 03'},
    {'first': 'Tiana', 'last': 'Hery', 'matieres': ['PC'], 'type': 'SUPPLEANT', 'email': 'tiana.hery@lycee.mg', 'phone': '+261 32 11 111 04'},
    # SVT
    {'first': 'Voahangy', 'last': 'Randria', 'matieres': ['SVT'], 'type': 'FONCTIONNAIRE', 'email': 'voahangy.randria@lycee.mg', 'phone': '+261 32 11 111 05'},
    # Français
    {'first': 'Fanja', 'last': 'Ramanantsoa', 'matieres': ['FR'], 'type': 'FONCTIONNAIRE', 'email': 'fanja.ramanantsoa@lycee.mg', 'phone': '+261 32 11 111 06'},
    # Anglais
    {'first': 'John', 'last': 'Smith', 'matieres': ['ANG'], 'type': 'SUPPLEANT', 'email': 'john.smith@lycee.mg', 'phone': '+261 32 11 111 07'},
    # Malagache
    {'first': 'Bako', 'last': 'Razanamahasoa', 'matieres': ['MAL'], 'type': 'FONCTIONNAIRE', 'email': 'bako.razanamahasoa@lycee.mg', 'phone': '+261 32 11 111 08'},
    # Histo-Géo
    {'first': 'Hery', 'last': 'Andrianarivo', 'matieres': ['HG'], 'type': 'FONCTIONNAIRE', 'email': 'hery.andrianarivo@lycee.mg', 'phone': '+261 32 11 111 09'},
    # EPS
    {'first': 'Lova', 'last': 'Rakotomalala', 'matieres': ['EPS'], 'type': 'SUPPLEANT', 'email': 'lova.rakotomalala@lycee.mg', 'phone': '+261 32 11 111 10'},
    # Philo (Terminale seulement)
    {'first': 'Sitraka', 'last': 'Ravelonarivo', 'matieres': ['PHILO'], 'type': 'FONCTIONNAIRE', 'email': 'sitraka.ravelonarivo@lycee.mg', 'phone': '+261 32 11 111 11'},
    # 12ème : un prof de plusieurs matières
    {'first': 'Mamy', 'last': 'Ralaivao', 'matieres': ['HG', 'FR'], 'type': 'FONCTIONNAIRE', 'email': 'mamy.ralaivao@lycee.mg', 'phone': '+261 32 11 111 12'},
]

# Noms malgaches réalistes pour les élèves
PRENOMS_GARCONS = [
    'Tojo', 'Hery', 'Naina', 'Faly', 'Tiana', 'Soa', 'Rivo', 'Lova', 'Bako',
    'Sitraka', 'Mamy', 'Hasina', 'Fanja', 'Naivo', 'Manda', 'Rado', 'Zina',
    'Toky', 'Mihary', 'Nantenaina', 'Riantsoa', 'Toavina', 'Mirindra',
]
PRENOMS_FILLES = [
    'Voahangy', 'Soa', 'Tiana', 'Hanta', 'Mamy', 'Niry', 'Aina', 'Volana',
    'Fitia', 'Sitraka', 'Bako', 'Miora', 'Nathalie', 'Holy', 'Elia',
    'Mbola', 'Rava', 'Noro', 'Lalaina', 'Fanja', 'Lova', 'Mirana', 'Vola',
]

NOMS_FAMILLE = [
    'Rakoto', 'Razafy', 'Andry', 'Ramanantsoa', 'Randria', 'Ralaivao',
    'Razanamahasoa', 'Andrianarivo', 'Rakotomalala', 'Ravelonarivo',
    'Rasolofoson', 'Andrianirina', 'Razafindrakoto', 'Ramanandraibe',
    'Andriantsoa', 'Ramanantenasoa', 'Razafimahatratra', 'Andriamahefa',
    'Randriamasinoro', 'Razafindralambo', 'Rakotondrabe', 'Andrianjafy',
]

ACADEMIC_YEAR = '2025-2026'
FRAIS_INSCRIPTION = Decimal('50000.00')
ELEVES_PAR_CLASSE = 10

# Créneaux horaires standards (8h-17h)
CRENEAUX = [
    (time(8, 0), time(10, 0)),
    (time(10, 15), time(12, 15)),
    (time(14, 0), time(16, 0)),
    (time(16, 15), time(17, 15)),
]


class Command(BaseCommand):
    help = "Seed complet pour la démo Lycée Horizon"

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='ATTENTION: supprime toutes les donnees existantes avant le seed',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self._reset_data()
        try:
            self._run_seed()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERROR] {str(e)}'))
            import traceback
            traceback.print_exc()
            raise

    def _reset_data(self):
        self.stdout.write(self.style.WARNING('[RESET] Suppression des donnees existantes...'))
        Note.objects.all().delete()
        Absence.objects.all().delete()
        TimetableSlot.objects.all().delete()
        Enrollment.objects.all().delete()
        Etudiant.objects.all().delete()
        ExamPeriod.objects.all().delete()
        Matiere.objects.all().delete()
        Classe.objects.all().delete()
        AuditLog.objects.all().delete()
        Notification.objects.all().delete()
        StudentOrientation.objects.all().delete()
        # On garde l'admin, on supprime juste les profs (les eleves ne sont PAS des CustomUser)
        CustomUser.objects.filter(role=CustomUser.Role.PROFESSEUR).delete()
        self.stdout.write(self.style.SUCCESS('   OK Donnees supprimees'))

    def _run_seed(self):
        self.stdout.write(self.style.NOTICE('[SEED] Demarrage du seed...\n'))

        admin = self._get_or_create_admin()
        self.stdout.write('[1/9] Matieres...')
        for data in MATIERES:
            Matiere.objects.update_or_create(
                code=data['code'],
                defaults={'nom': data['nom'], 'coefficient': data['coefficient']},
            )
        self.stdout.write(self.style.SUCCESS(f'   OK {len(MATIERES)} matieres'))

        self.stdout.write('[2/9] Periodes d\'examen...')
        periodes = self._seed_exam_periods()
        self.stdout.write(self.style.SUCCESS(f'   OK {len(periodes)} periodes'))

        self.stdout.write('[3/9] Classes...')
        classes_by_nom = self._seed_classes()
        self.stdout.write(self.style.SUCCESS(f'   OK {len(classes_by_nom)} classes'))

        self.stdout.write('[4/9] Enseignants...')
        profs_by_matiere = self._seed_enseignants(admin)
        self.stdout.write(self.style.SUCCESS(f'   OK {len(ENSEIGNANTS)} enseignants'))

        self.stdout.write('[5/9] Eleves (10 par classe)...')
        eleves_by_classe = self._seed_etudiants(classes_by_nom)
        total_eleves = sum(len(v) for v in eleves_by_classe.values())
        self.stdout.write(self.style.SUCCESS(f'   OK {total_eleves} eleves'))

        self.stdout.write('[6/9] Inscriptions & paiements...')
        self._seed_enrollments(eleves_by_classe)

        self.stdout.write('[7/9] Notes...')
        self._seed_notes(eleves_by_classe, profs_by_matiere, periodes)

        self.stdout.write('[8/9] Pointages...')
        self._seed_absences(eleves_by_classe, profs_by_matiere)

        self.stdout.write('[9/9] Emploi du temps...')
        self._seed_timetable(classes_by_nom, profs_by_matiere)

        self.stdout.write('[+] Orientations...')
        self._seed_orientations(eleves_by_classe)

        self.stdout.write('[+] Notifications...')
        self._seed_notifications(admin)

        self.stdout.write(self.style.SUCCESS('\n[OK] Seed termine avec succes !\n'))
        self._print_summary()

    # -------- Helpers --------

    def _get_or_create_admin(self):
        admin, created = CustomUser.objects.get_or_create(
            email='andrianisaina23@gmail.com',
            defaults={
                'username': '@devmisaina',
                'first_name': 'Andrianisaina',
                'last_name': 'DevMisaina',
                'role': CustomUser.Role.ADMIN,
                'status': CustomUser.Status.ACTIVE,
                'is_staff': True,
                'is_superuser': True,
                'phone': '+261 34 12 345 67',
                'matricule': 'ADM-2025-001',
            },
        )
        if created:
            admin.set_password('2311saina')
            admin.save()
            self.stdout.write(self.style.SUCCESS('   OK Admin cree'))
        else:
            self.stdout.write('   . Admin existe deja')
        return admin

    def _seed_matieres(self):
        self.stdout.write('[1/9] Matieres...')
        for data in MATIERES:
            Matiere.objects.update_or_create(
                code=data['code'],
                defaults={'nom': data['nom'], 'coefficient': data['coefficient']},
            )
        self.stdout.write(self.style.SUCCESS(f'   OK {len(MATIERES)} matieres'))

    def _seed_exam_periods(self):
        self.stdout.write('[2/9] Periodes d\'examen...')
        periodes = [
            {
                'code': 'T1',
                'label': '1er Trimestre 2025-2026',
                'period_type': ExamPeriod.PeriodType.TRIMESTRE_1,
                'start_date': date(2025, 9, 1),
                'end_date': date(2025, 12, 15),
                'weight_note_1': Decimal('0.3'),
                'weight_note_2': Decimal('0.7'),
                'is_locked': True,  # Deja passe, verrouille
            },
            {
                'code': 'T2',
                'label': '2e Trimestre 2025-2026',
                'period_type': ExamPeriod.PeriodType.TRIMESTRE_2,
                'start_date': date(2026, 1, 5),
                'end_date': date(2026, 4, 5),
                'weight_note_1': Decimal('0.3'),
                'weight_note_2': Decimal('0.7'),
                'is_locked': False,  # En cours
            },
            {
                'code': 'T3',
                'label': '3e Trimestre 2025-2026',
                'period_type': ExamPeriod.PeriodType.TRIMESTRE_3,
                'start_date': date(2026, 4, 20),
                'end_date': date(2026, 6, 30),
                'weight_note_1': Decimal('0.4'),
                'weight_note_2': Decimal('0.6'),
                'is_locked': False,
            },
        ]
        for data in periodes:
            ExamPeriod.objects.update_or_create(
                code=data['code'],
                defaults={k: v for k, v in data.items() if k != 'code'},
            )
        self.stdout.write(self.style.SUCCESS(f'   OK {len(periodes)} periodes'))
        return {p.code: p for p in ExamPeriod.objects.all()}

    def _seed_classes(self):
        self.stdout.write('[3/9] Classes...')
        for data in CLASSES:
            Classe.objects.update_or_create(
                nom=data['nom'],
                defaults={
                    'niveau': data['niveau'],
                    'stream': data['stream'],
                    'capacite': data['capacite'],
                    'academic_year': ACADEMIC_YEAR,
                },
            )
        classes = list(Classe.objects.all())
        self.stdout.write(self.style.SUCCESS(f'   OK {len(classes)} classes'))
        return {c.nom: c for c in classes}

    def _seed_enseignants(self, admin):
        self.stdout.write('[4/9] Enseignants...')
        profs = {}  # profs[matiere_code] = [prof, ...]
        for i, data in enumerate(ENSEIGNANTS, start=1):
            prof, created = CustomUser.objects.update_or_create(
                email=data['email'],
                defaults={
                    'username': f"@{data['email'].split('@')[0].replace('.', '_')}",
                    'first_name': data['first'],
                    'last_name': data['last'],
                    'role': CustomUser.Role.PROFESSEUR,
                    'teacher_type': data['type'],
                    'status': CustomUser.Status.ACTIVE,
                    'is_active': True,
                    'phone': data['phone'],
                    'matricule': f'ENS-2025-{i:03d}',
                },
            )
            if created:
                prof.set_password('lycee2025')
                prof.save()
            for mat in data['matieres']:
                profs.setdefault(mat, []).append(prof)
        self.stdout.write(self.style.SUCCESS(f'   OK {len(ENSEIGNANTS)} enseignants'))
        return profs

    def _seed_etudiants(self, classes_by_nom):
        """Cree des eleves (entites Etudiant uniquement, PAS des CustomUser).
        Les eleves ne se connectent pas - ils sont geres par admin sur web et consultes par profs sur mobile.
        """
        self.stdout.write('[5/9] Eleves (10 par classe)...')
        eleves_by_classe = {}

        # Compteur pour générer des matricules uniques
        existing_count = Etudiant.objects.count()
        matricule_counter = existing_count + 1

        # Année scolaire commence en septembre 2025
        today = date(2026, 9, 7)

        for classe in Classe.objects.all():
            eleves_classe = []
            for i in range(ELEVES_PAR_CLASSE):
                genre = random.choice(['M', 'F'])
                prenom = random.choice(PRENOMS_GARCONS if genre == 'M' else PRENOMS_FILLES)
                nom = random.choice(NOMS_FAMILLE)
                matricule = f'ELV-2025-{matricule_counter:04d}'
                matricule_counter += 1

                # Date d'inscription réaliste : entre juin 2025 et aujourd'hui
                days_ago = random.randint(1, 460)
                date_inscription = today - timedelta(days=days_ago)

                # Date de naissance réaliste : 14-19 ans en 2025
                age = random.randint(14, 19)
                date_of_birth = date(2025 - age, random.randint(1, 12), random.randint(1, 28))

                etudiant = Etudiant.objects.create(
                    matricule=matricule,
                    first_name=prenom,
                    last_name=nom,
                    date_of_birth=date_of_birth,
                    gender=genre,
                    phone=f'+261 33 {random.randint(10,99)} {random.randint(100,999)} {random.randint(10,99)}',
                    email_parent=f'parent.{matricule_counter-1}@famille.mg',
                    phone_parent=f'+261 32 {random.randint(10,99)} {random.randint(100,999)} {random.randint(10,99)}',
                    address=f'Lot {random.randint(1,999)} Antananarivo',
                    classe=classe,
                    date_inscription=date_inscription,
                    statut=Etudiant.StudentStatus.ENROLLED,
                    actif=True,
                )
                eleves_classe.append(etudiant)

            eleves_by_classe[classe.nom] = eleves_classe
            self.stdout.write(f'   . {classe.nom}: {len(eleves_classe)} eleves')

        total = sum(len(v) for v in eleves_by_classe.values())
        self.stdout.write(self.style.SUCCESS(f'   OK {total} eleves au total'))
        return eleves_by_classe

    def _seed_enrollments(self, eleves_by_classe):
        self.stdout.write('[6/9] Inscriptions & paiements...')
        enrollments = []
        count_paid = 0
        count_partial = 0
        count_unpaid = 0

        for classe_nom, etudiants in eleves_by_classe.items():
            for etudiant in etudiants:
                roll = random.random()
                if roll < 0.7:
                    status = Enrollment.PaymentStatus.PAID
                    frais_verses = FRAIS_INSCRIPTION
                    count_paid += 1
                elif roll < 0.9:
                    status = Enrollment.PaymentStatus.PARTIAL
                    frais_verses = FRAIS_INSCRIPTION * Decimal(random.choice(['0.3', '0.4', '0.5', '0.6', '0.7', '0.8']))
                    count_partial += 1
                else:
                    status = Enrollment.PaymentStatus.UNPAID
                    frais_verses = Decimal('0')
                    count_unpaid += 1

                enrollments.append(Enrollment(
                    student=etudiant,
                    classe=etudiant.classe,
                    academic_year=ACADEMIC_YEAR,
                    receipt_number=f"REC-{uuid.uuid4().hex[:12].upper()}",
                    payment_status=status,
                    frais_total=FRAIS_INSCRIPTION,
                    frais_verses=frais_verses,
                    devise='XOF',
                ))

        Enrollment.objects.bulk_create(enrollments, batch_size=500)
        self.stdout.write(self.style.SUCCESS(
            f'   OK {count_paid} payes . {count_partial} partiels . {count_unpaid} non payes'
        ))

    def _seed_notes(self, eleves_by_classe, profs_by_matiere, periodes):
        self.stdout.write('[7/9] Notes...')
        t1 = periodes['T1']
        t2 = periodes['T2']
        notes = []

        matieres_par_niveau = {
            Classe.Niveau.SECONDAIRE_GENERAL: ['MATH', 'PC', 'SVT', 'FR', 'ANG', 'MAL', 'HG', 'EPS'],
        }

        matiere_cache = {m.code: m for m in Matiere.objects.all()}

        for classe_nom, etudiants in eleves_by_classe.items():
            classe = etudiants[0].classe
            matieres_codes = list(matieres_par_niveau.get(classe.niveau, []))
            if 'Terminale' in classe.nom:
                matieres_codes = matieres_codes + ['PHILO']

            for etudiant in etudiants:
                for mat_code in matieres_codes:
                    profs = profs_by_matiere.get(mat_code, [])
                    if not profs:
                        continue
                    prof = random.choice(profs)
                    matiere_obj = matiere_cache[mat_code]

                    score_1_t1 = self._random_score()
                    score_2_t1 = self._random_score()
                    notes.append(Note(
                        etudiant=etudiant,
                        matiere=matiere_obj,
                        professeur=prof,
                        exam_period=t1,
                        score_1=score_1_t1,
                        score_2=score_2_t1,
                        coefficient=Decimal('1.0'),
                        date_evaluation=date(2025, 12, 10) + timedelta(days=random.randint(0, 5)),
                        commentaire=random.choice([
                            '', 'Bon travail', 'Peut mieux faire', 'Excellent',
                            'Doit revoir les bases', 'Participation active',
                        ]),
                        status=Note.Status.LOCKED,
                        updated_by=prof,
                    ))

                    if random.random() < 0.8:
                        score_1_t2 = self._random_score()
                        notes.append(Note(
                            etudiant=etudiant,
                            matiere=matiere_obj,
                            professeur=prof,
                            exam_period=t2,
                            score_1=score_1_t2,
                            score_2=None,
                            coefficient=Decimal('1.0'),
                            date_evaluation=date(2026, 3, 20) + timedelta(days=random.randint(0, 30)),
                            commentaire='',
                            status=Note.Status.DRAFT,
                            updated_by=prof,
                        ))

        Note.objects.bulk_create(notes, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f'   OK {len(notes)} notes'))

    def _seed_absences(self, eleves_by_classe, profs_by_matiere):
        self.stdout.write('[8/9] Pointages...')
        today = date(2026, 9, 7)
        absences = []
        status_weights = [
            (Absence.Status.PRESENT, 0.8),
            (Absence.Status.LATE, 0.1),
            (Absence.Status.ABSENT, 0.1),
        ]

        mat_codes = list(profs_by_matiere.keys())

        for classe_nom, etudiants in eleves_by_classe.items():
            for etudiant in etudiants:
                for days_ago in range(1, 30):
                    d = today - timedelta(days=days_ago)
                    if d.weekday() > 4:
                        continue
                    if random.random() > 0.7:
                        continue

                    mat_code = random.choice(mat_codes)
                    profs = profs_by_matiere[mat_code]
                    prof = random.choice(profs)

                    start, end = random.choice(CRENEAUX)
                    status = random.choices(
                        [s for s, _ in status_weights],
                        weights=[w for _, w in status_weights],
                    )[0]

                    absences.append(Absence(
                        etudiant=etudiant,
                        professeur=prof,
                        date_absence=d,
                        heure_debut=start,
                        heure_fin=end,
                        statut=status,
                        motif='Maladie' if status == Absence.Status.ABSENT and random.random() < 0.3 else '',
                        justifiee=status == Absence.Status.ABSENT and random.random() < 0.3,
                        sync_source=Absence.SyncSource.ONLINE if random.random() < 0.85 else Absence.SyncSource.OFFLINE_SYNCED,
                    ))

        Absence.objects.bulk_create(absences, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f'   OK {len(absences)} pointages'))

    def _seed_timetable(self, classes_by_nom, profs_by_matiere):
        self.stdout.write('[9/9] Emploi du temps...')
        jours = [
            TimetableSlot.DayOfWeek.LUNDI,
            TimetableSlot.DayOfWeek.MARDI,
            TimetableSlot.DayOfWeek.MERCREDI,
            TimetableSlot.DayOfWeek.JEUDI,
            TimetableSlot.DayOfWeek.VENDREDI,
        ]

        matieres_par_niveau = {
            Classe.Niveau.SECONDAIRE_GENERAL: ['MATH', 'PC', 'SVT', 'FR', 'ANG', 'MAL', 'HG', 'EPS'],
        }

        matiere_cache = {m.code: m for m in Matiere.objects.all()}
        slots = []

        for classe in Classe.objects.all():
            mat_codes = list(matieres_par_niveau.get(classe.niveau, []))
            if 'Terminale' in classe.nom:
                mat_codes = mat_codes + ['PHILO']

            for i, day in enumerate(jours):
                if i >= len(mat_codes):
                    break
                mat_code = mat_codes[i]
                profs = profs_by_matiere.get(mat_code, [])
                if not profs:
                    continue
                prof = profs[0]
                start, end = CRENEAUX[i % len(CRENEAUX)]

                slots.append(TimetableSlot(
                    classe=classe,
                    matiere=matiere_cache[mat_code],
                    professeur=prof,
                    day_of_week=day,
                    start_hour=start,
                    end_hour=end,
                    room=f'Salle {random.randint(1, 12):02d}',
                    academic_year=ACADEMIC_YEAR,
                ))

        TimetableSlot.objects.bulk_create(slots, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'   OK {len(slots)} creneaux'))

    def _seed_orientations(self, eleves_by_classe):
        self.stdout.write('[+] Orientations (Seconde -> 1ere)...')
        secondes = eleves_by_classe.get('Seconde A', []) + eleves_by_classe.get('Seconde B', []) + eleves_by_classe.get('Seconde C', [])
        orientations = []
        for etudiant in secondes:
            roll = random.random()
            if roll < 0.4:
                stream = StudentOrientation.Stream.SCIENTIFIQUE
                explanation = "Performance forte en Mathematiques et Sciences."
            elif roll < 0.7:
                stream = StudentOrientation.Stream.LITTERAIRE
                explanation = "Performance forte en Francais et Histoire-Geographie."
            else:
                stream = StudentOrientation.Stream.SOCIO_ECONOMIQUE
                explanation = "Profil equilibre entre Sciences et Lettres."

            orientations.append(StudentOrientation(
                student=etudiant,
                recommended_stream=stream,
                ai_confidence_score=Decimal(str(round(random.uniform(60, 95), 2))),
                ai_explanation=explanation,
                ai_model_version='1.0.0',
                status=random.choice([StudentOrientation.Status.PROPOSED, StudentOrientation.Status.CONFIRMED]),
                final_stream=stream if random.random() < 0.6 else None,
            ))

        StudentOrientation.objects.bulk_create(orientations, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'   OK {len(orientations)} orientations'))

    def _seed_notifications(self, admin):
        self.stdout.write('[+] Notifications...')
        profs = CustomUser.objects.filter(role='PROFESSEUR')[:5]
        notifications = []
        for prof in profs:
            notifications.append(Notification(
                recipient=prof,
                channel=Notification.Channel.PUSH,
                notification_type='NEW_GRADE_REQUEST',
                title='Notes a saisir',
                message='Vous avez 3 evaluations en attente de saisie.',
                payload={},
                status=Notification.Status.SENT,
                sent_at=timezone.now() - timedelta(days=random.randint(0, 5)),
            ))
        Notification.objects.bulk_create(notifications, batch_size=100)
        self.stdout.write(self.style.SUCCESS(f'   OK {len(notifications)} notifications'))

    def _random_score(self):
        """Génère une note réaliste entre 6 et 19, avec une distribution autour de 12-13."""
        weights = [1, 2, 3, 5, 7, 9, 10, 9, 7, 5, 4, 3, 2, 1]  # Distribution centrée sur 12-13
        score = random.choices(range(6, 20), weights=weights)[0]
        # Décimales possibles
        if random.random() < 0.3:
            score += random.choice([0.25, 0.5, 0.75])
        return Decimal(str(score))

    def _print_summary(self):
        self.stdout.write(self.style.NOTICE('Resume de la base :'))
        self.stdout.write(f'   . Utilisateurs: {CustomUser.objects.count()}')
        self.stdout.write(f'   . Classes: {Classe.objects.count()}')
        self.stdout.write(f'   . Matieres: {Matiere.objects.count()}')
        self.stdout.write(f'   . Periodes: {ExamPeriod.objects.count()}')
        self.stdout.write(f'   . Eleves: {Etudiant.objects.count()}')
        self.stdout.write(f'   . Inscriptions: {Enrollment.objects.count()}')
        self.stdout.write(f'   . Notes: {Note.objects.count()}')
        self.stdout.write(f'   . Pointages: {Absence.objects.count()}')
        self.stdout.write(f'   . Creneaux EDT: {TimetableSlot.objects.count()}')
        self.stdout.write(f'   . Orientations: {StudentOrientation.objects.count()}')
        self.stdout.write(f'   . Notifications: {Notification.objects.count()}')
        self.stdout.write('')
        self.stdout.write(self.style.NOTICE('Identifiants de demo :'))
        self.stdout.write('   Admin:    andrianisaina23@gmail.com / 2311saina')
        self.stdout.write('   Prof:     rivo.rakoto@lycee.mg / lycee2025')
        self.stdout.write('   Eleves:   (pas de connexion - uniquement geres par admin)')
