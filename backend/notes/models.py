from django.db import models
from users.models import CustomUser
from etudiants.models import Etudiant
from matieres.models import Matiere


class Note(models.Model):
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notes')
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='notes')
    professeur = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': CustomUser.Role.PROFESSEUR},
        related_name='notes_enseignees',
    )
    note = models.DecimalField(max_digits=4, decimal_places=2)
    coefficient = models.DecimalField(max_digits=3, decimal_places=2)
    date_evaluation = models.DateField()
    commentaire = models.TextField(blank=True)

    class Meta:
        ordering = ['-date_evaluation', 'etudiant']

    def __str__(self):
        return f"{self.etudiant} - {self.matiere}: {self.note}"
