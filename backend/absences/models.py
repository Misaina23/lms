from django.db import models
from users.models import CustomUser
from etudiants.models import Etudiant


class Absence(models.Model):
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
    motif = models.TextField(blank=True)
    justifiee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Absence {self.etudiant} - {self.date_absence}"

    class Meta:
        ordering = ['-date_absence', '-created_at']
