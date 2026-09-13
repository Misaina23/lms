import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lycee.settings')
django.setup()

from users.models import CustomUser
from classes.models import Classe
from etudiants.models import Etudiant, Enrollment, StudentOrientation, Notification, AuditLog
from notes.models import Note
from absences.models import Absence
from timetable.models import TimetableSlot
from matieres.models import Matiere, ExamPeriod

print('=' * 50)
print('RESUME DE LA BASE DE DONNEES')
print('=' * 50)
print(f'Utilisateurs     : {CustomUser.objects.count()}')
print(f'  - Admins       : {CustomUser.objects.filter(role="ADMIN").count()}')
print(f'  - Professeurs  : {CustomUser.objects.filter(role="PROFESSEUR").count()}')
print(f'  - Eleves       : {CustomUser.objects.filter(role="ELEVE").count()}')
print(f'Classes          : {Classe.objects.count()}')
print(f'Matieres         : {Matiere.objects.count()}')
print(f'Periodes examen  : {ExamPeriod.objects.count()}')
print(f'Eleves           : {Etudiant.objects.count()}')
print(f'Inscriptions     : {Enrollment.objects.count()}')
print(f'  - Payees       : {Enrollment.objects.filter(payment_status="PAID").count()}')
print(f'  - Partielles   : {Enrollment.objects.filter(payment_status="PARTIAL").count()}')
print(f'  - Non payees   : {Enrollment.objects.filter(payment_status="UNPAID").count()}')
print(f'Notes            : {Note.objects.count()}')
print(f'Pointages        : {Absence.objects.count()}')
print(f'Creneaux EDT     : {TimetableSlot.objects.count()}')
print(f'Orientations     : {StudentOrientation.objects.count()}')
print(f'Notifications    : {Notification.objects.count()}')
print('=' * 50)
