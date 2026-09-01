from django.db import models
from users.models import CustomUser
from classes.models import Classe


class Etudiant(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': CustomUser.Role.ELEVE},
    )
    classe = models.ForeignKey(Classe, on_delete=models.SET_NULL, null=True)
    date_inscription = models.DateField()
    actif = models.BooleanField(default=True)

    def __str__(self):
        return self.user.get_full_name()

    class Meta:
        ordering = ['user__last_name', 'user__first_name']
