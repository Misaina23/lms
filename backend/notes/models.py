from django.db import models
from users.models import CustomUser
from etudiants.models import Etudiant
from matieres.models import Matiere, ExamPeriod


class Note(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Brouillon'
        LOCKED = 'LOCKED', 'Verrouillé'

    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notes')
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='notes')
    professeur = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': CustomUser.Role.PROFESSEUR},
        related_name='notes_enseignees',
    )
    exam_period = models.ForeignKey(
        ExamPeriod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notes',
    )
    score_1 = models.DecimalField(max_digits=4, decimal_places=2, default=0, help_text="Première note (ex: Interrogation)")
    score_2 = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, help_text="Deuxième note (ex: Devoir de Synthèse)")
    coefficient = models.DecimalField(max_digits=3, decimal_places=2)
    date_evaluation = models.DateField()
    commentaire = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notes_modified',
    )
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def note(self):
        """Backward-compatible computed score (weighted average of score_1 and score_2)."""
        from decimal import Decimal
        if self.exam_period:
            w1 = self.exam_period.weight_note_1
            w2 = self.exam_period.weight_note_2
            if self.score_2:
                return round(self.score_1 * w1 + self.score_2 * w2, 2)
            return round(self.score_1 * (w1 + w2), 2)
        return round(self.score_1, 2)

    class Meta:
        ordering = ['-date_evaluation', 'etudiant']
        unique_together = ['etudiant', 'matiere', 'exam_period']

    def __str__(self):
        return f"{self.etudiant} - {self.matiere}: {self.note}"
