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

    def get_coefficient_for_class(self, classe):
        from decimal import Decimal
        from django.db.models import Q
        from classes.models import MatiereCoefficient

        if classe is None:
            return Decimal(str(self.coefficient))

        class_coefficient = MatiereCoefficient.objects.filter(
            matiere=self,
            classe=classe,
        ).first()
        if class_coefficient:
            return class_coefficient.coefficient

        stream_value = getattr(classe, 'stream', None)
        niveau_value = getattr(classe, 'niveau', None)

        if niveau_value and stream_value:
            coefficient = MatiereCoefficient.objects.filter(
                matiere=self,
                niveau=niveau_value,
                stream=stream_value,
            ).order_by('-coefficient').first()
            if coefficient:
                return coefficient.coefficient

        if niveau_value:
            fallback = MatiereCoefficient.objects.filter(
                matiere=self,
                niveau=niveau_value,
            ).filter(Q(stream='') | Q(stream__isnull=True)).order_by('-coefficient').first()
            if fallback:
                return fallback.coefficient

        return Decimal(str(self.coefficient))

    def __str__(self):
        return self.nom

    class Meta:
        ordering = ['nom']


class ExamPeriod(models.Model):
    """Represents an exam period: Trimestre 1, Trimestre 2, etc."""
    class PeriodType(models.TextChoices):
        BIMESTRE_1 = 'B1', 'Bimestre 1'
        BIMESTRE_2 = 'B2', 'Bimestre 2'
        BIMESTRE_3 = 'B3', 'Bimestre 3'
        BIMESTRE_4 = 'B4', 'Bimestre 4'
        BIMESTRE_5 = 'B5', 'Bimestre 5'
        BIMESTRE_6 = 'B6', 'Bimestre 6'
        TRIMESTRE_1 = 'T1', 'Trimestre 1'
        TRIMESTRE_2 = 'T2', 'Trimestre 2'
        TRIMESTRE_3 = 'T3', 'Trimestre 3'
        TRIMESTRE_4 = 'T4', 'Trimestre 4'
        SEMESTRE_1 = 'S1', 'Semestre 1'
        SEMESTRE_2 = 'S2', 'Semestre 2'

    code = models.CharField(max_length=10)
    label = models.CharField(max_length=100)
    period_type = models.CharField(max_length=5, choices=PeriodType.choices)
    academic_year = models.CharField(max_length=9)
    start_date = models.DateField()
    end_date = models.DateField()
    number_of_notes = models.PositiveSmallIntegerField(
        choices=[(1, 'Une note'), (2, 'Deux notes')],
        default=2,
    )
    weight_note_1 = models.DecimalField(max_digits=3, decimal_places=2, default=0.3, help_text="Weight of first score (e.g., 0.3 = 30%)")
    weight_note_2 = models.DecimalField(max_digits=3, decimal_places=2, default=0.7, help_text="Weight of second score (e.g., 0.7 = 70%)")
    is_locked = models.BooleanField(default=False, help_text="If True, grades can't be modified without justification")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.label} ({self.get_period_type_display()})"

    class Meta:
        ordering = ['start_date']
        unique_together = [('academic_year', 'code')]
