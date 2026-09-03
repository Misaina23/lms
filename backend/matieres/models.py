from django.db import models


class Matiere(models.Model):
    nom = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    coefficient = models.PositiveIntegerField(
        default=1,
        help_text="Coefficient de la matière (utilisé pour le calcul des moyennes)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nom

    class Meta:
        ordering = ['nom']


class ExamPeriod(models.Model):
    """Represents an exam period: Trimestre 1, Trimestre 2, etc."""
    class PeriodType(models.TextChoices):
        TRIMESTRE_1 = 'T1', 'Trimestre 1'
        TRIMESTRE_2 = 'T2', 'Trimestre 2'
        TRIMESTRE_3 = 'T3', 'Trimestre 3'
        SEMESTRE_1 = 'S1', 'Semestre 1'
        SEMESTRE_2 = 'S2', 'Semestre 2'

    code = models.CharField(max_length=10, unique=True)
    label = models.CharField(max_length=100)
    period_type = models.CharField(max_length=5, choices=PeriodType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    weight_note_1 = models.DecimalField(max_digits=3, decimal_places=2, default=0.3, help_text="Weight of first score (e.g., 0.3 = 30%)")
    weight_note_2 = models.DecimalField(max_digits=3, decimal_places=2, default=0.7, help_text="Weight of second score (e.g., 0.7 = 70%)")
    is_locked = models.BooleanField(default=False, help_text="If True, grades can't be modified without justification")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.label} ({self.get_period_type_display()})"

    class Meta:
        ordering = ['start_date']
