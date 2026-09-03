from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrateur'
        PROFESSEUR = 'PROFESSEUR', 'Professeur'
        ELEVE = 'ELEVE', 'Élève'
        PARENT = 'PARENT', 'Parent'

    class TeacherType(models.TextChoices):
        FONCTIONNAIRE = 'FONCTIONNAIRE', 'Fonctionnaire'
        SUPPLEANT = 'SUPPLEANT', 'Suppléant'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Actif'
        PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'En attente de vérification'
        REJECTED = 'REJECTED', 'Rejeté'
        SUSPENDED = 'SUSPENDED', 'Suspendu'

    matricule = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    teacher_type = models.CharField(
        max_length=20,
        choices=TeacherType.choices,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name', 'role']

    def __str__(self):
        return f"{self.get_full_name()} ({self.matricule})"
