from django.db import models


class Classe(models.Model):
    class Niveau(models.TextChoices):
        SECONDAIRE_GENERAL = 'SECONDAIRE_GENERAL', 'Secondaire Général'
        SECONDAIRE_TECHNIQUE = 'SECONDAIRE_TECHNIQUE', 'Secondaire Technique'
        PRIMAIRE = 'PRIMAIRE', 'Primaire'

    nom = models.CharField(max_length=100)
    niveau = models.CharField(max_length=30, choices=Niveau.choices)
    capacite = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nom} - {self.niveau}"

    class Meta:
        ordering = ['niveau', 'nom']
