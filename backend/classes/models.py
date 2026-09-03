from django.db import models
from users.models import CustomUser
from matieres.models import Matiere


class Room(models.Model):
    """Salle de classe physique."""
    nom = models.CharField(max_length=50, unique=True)
    capacite = models.PositiveIntegerField(default=30)
    batiment = models.CharField(max_length=50, blank=True)
    equipement = models.TextField(blank=True, help_text="Projecteur, tableau, etc.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.batiment})" if self.batiment else self.nom


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


class TeacherAssignment(models.Model):
    """Affectation d'un professeur à une classe/matière. Limite le périmètre RBAC."""
    professeur = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': CustomUser.Role.PROFESSEUR, 'status': CustomUser.Status.ACTIVE},
        related_name='assignments',
    )
    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, related_name='teacher_assignments')
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='teacher_assignments')
    academic_year = models.CharField(max_length=9)
    is_main_teacher = models.BooleanField(
        default=False,
        help_text="Professeur principal de la classe (accès à toutes les matières pour cette classe)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['classe', 'matiere', 'professeur']
        unique_together = ['professeur', 'classe', 'matiere', 'academic_year']

    def __str__(self):
        role = ' (PP)' if self.is_main_teacher else ''
        return f"{self.professeur.get_full_name()} → {self.classe.nom} / {self.matiere.nom}{role}"


class MatiereCoefficient(models.Model):
    """Coefficient d'une matière spécifique à un niveau (et éventuellement à une filière)."""
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='coefficients')
    niveau = models.CharField(
        max_length=30,
        choices=Classe.Niveau.choices,
        help_text="Niveau où ce coefficient s'applique",
    )
    stream = models.CharField(
        max_length=5,
        choices=Classe.Stream.choices,
        null=True,
        blank=True,
        help_text="Filière spécifique (optionnel)",
    )
    coefficient = models.DecimalField(max_digits=3, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['matiere', 'niveau', 'stream']
        unique_together = ['matiere', 'niveau', 'stream']

    def __str__(self):
        suffix = f" / {self.stream}" if self.stream else ""
        return f"{self.matiere.nom} — {self.niveau}{suffix} = {self.coefficient}"


class SchoolConfig(models.Model):
    """Configuration globale de l'établissement (plages horaires, tolérance)."""
    academic_year = models.CharField(max_length=9, unique=True)
    school_name = models.CharField(max_length=200, default='Lycée Horizon')
    school_address = models.CharField(max_length=300, blank=True)
    school_phone = models.CharField(max_length=30, blank=True)
    school_email = models.EmailField(blank=True)
    devise = models.CharField(max_length=3, default='XOF')
    frais_inscription_defaut = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ecolage_annuel_defaut = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tolerance_retard_minutes = models.PositiveIntegerField(default=10)
    heure_debut_cours = models.TimeField(null=True, blank=True)
    heure_fin_cours = models.TimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-active', '-academic_year']

    def __str__(self):
        return f"{self.school_name} — {self.academic_year}{' (actif)' if self.active else ''}"
