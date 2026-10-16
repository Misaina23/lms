from django.db import models
from django.db.models import Q
from users.models import CustomUser
from classes.models import Classe
from matieres.models import Matiere


class TimetableSlot(models.Model):
    class DayOfWeek(models.IntegerChoices):
        LUNDI = 0, 'Lundi'
        MARDI = 1, 'Mardi'
        MERCREDI = 2, 'Mercredi'
        JEUDI = 3, 'Jeudi'
        VENDREDI = 4, 'Vendredi'
        SAMEDI = 5, 'Samedi'

    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, related_name='timetable_slots')
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='timetable_slots')
    professeur = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': CustomUser.Role.PROFESSEUR, 'status': CustomUser.Status.ACTIVE},
        related_name='timetable_slots',
    )
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    start_hour = models.TimeField()
    end_hour = models.TimeField()
    room = models.CharField(max_length=50, blank=True)
    academic_year = models.CharField(max_length=9)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_of_week', 'start_hour']
        unique_together = ['classe', 'matiere', 'professeur', 'day_of_week', 'start_hour', 'academic_year']

    def __str__(self):
        return f"{self.classe} - {self.matiere.nom} - {self.get_day_of_week_display()}"

    def has_conflict(self):
        conflicts = TimetableSlot.objects.filter(
            day_of_week=self.day_of_week,
            academic_year=self.academic_year,
            start_hour__lt=self.end_hour,
            end_hour__gt=self.start_hour,
        )
        if self.pk:
            conflicts = conflicts.exclude(pk=self.pk)

        shared_resources = Q(classe_id=self.classe_id)
        if self.professeur_id:
            shared_resources |= Q(professeur_id=self.professeur_id)
        if self.room.strip():
            shared_resources |= Q(room__iexact=self.room.strip())

        return list(conflicts.filter(shared_resources).select_related(
            'classe',
            'matiere',
            'professeur',
        ).order_by('start_hour', 'id'))
