from django.db import models


class Classe(models.Model):
    class Niveau(models.TextChoices):
        SECONDAIRE_GENERAL = 'SECONDAIRE_GENERAL', 'Secondaire Général'
        SECONDAIRE_TECHNIQUE = 'SECONDAIRE_TECHNIQUE', 'Secondaire Technique'
        PRIMAIRE = 'PRIMAIRE', 'Primaire'

    class Stream(models.TextChoices):
        SCIENTIFIQUE = 'S', 'Scientifique (S)'
        LITTERAIRE = 'L', 'Littéraire (L)'
        SOCIO_ECONOMIQUE = 'OSE', 'Socio-Économique (OSE)'
        TECHNIQUE_COMMERCIAL = 'TC', 'Technique Commercial'
        TECHNIQUE_INDUSTRIEL = 'TI', 'Technique Industriel'
        GENERAL = 'G', 'Générale'

    nom = models.CharField(max_length=100)
    niveau = models.CharField(max_length=30, choices=Niveau.choices)
    stream = models.CharField(
        max_length=5,
        choices=Stream.choices,
        null=True,
        blank=True,
        help_text="Filière/Stream (S, L, OSE, etc.) - null for général",
    )
    academic_year = models.CharField(
        max_length=9,
        help_text="Format: YYYY-YYYY (ex: 2024-2025)",
        null=True,
        blank=True,
    )
    capacite = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nom} - {self.niveau}"

    class Meta:
        ordering = ['niveau', 'nom']
