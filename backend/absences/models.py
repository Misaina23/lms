from django.db import models
from users.models import CustomUser
from etudiants.models import Etudiant
from classes.models import TeacherAssignment
import uuid


class Absence(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'PRESENT', 'Présent'
        LATE = 'LATE', 'En retard'
        ABSENT = 'ABSENT', 'Absent'

    class SyncSource(models.TextChoices):
        ONLINE = 'ONLINE', 'En ligne'
        OFFLINE_SYNCED = 'OFFLINE_SYNCED', 'Synchronisé hors-ligne'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='absences')
    professeur = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': CustomUser.Role.PROFESSEUR},
        related_name='absences_enseignees',
    )
    date_absence = models.DateField()
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    statut = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    motif = models.TextField(blank=True)
    justifiee = models.BooleanField(default=False)
    recorded_at = models.DateTimeField(null=True, blank=True, help_text="Server timestamp when the pointage was recorded")
    sync_source = models.CharField(max_length=20, choices=SyncSource.choices, default=SyncSource.ONLINE)
    client_uuid = models.UUIDField(default=uuid.uuid4, editable=False, help_text="UUID for offline deduplication")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.etudiant} - {self.date_absence} - {self.get_statut_display()}"

    class Meta:
        ordering = ['-date_absence', '-created_at']


class TeacherUnavailabilityReport(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'En attente'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Pris en compte'
        RESOLVED = 'RESOLVED', 'Traité'

    assignment = models.ForeignKey(
        TeacherAssignment,
        on_delete=models.PROTECT,
        related_name='unavailability_reports',
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    reason = models.TextField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    admin_response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-start_time', '-created_at']

    def __str__(self):
        return f"{self.assignment.professeur} — {self.assignment.classe} — {self.date}"
