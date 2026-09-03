from django.db import models
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
        ).exclude(id=self.id)
        overlapping = []
        for other in conflicts:
            if self._time_overlap(other):
                overlapping.append(other)
        return overlapping

    def _time_overlap(self, other):
        def time_to_minutes(t):
            return t.hour * 60 + t.minute
        self_start = time_to_minutes(self.start_hour)
        self_end = time_to_minutes(self.end_hour)
        other_start = time_to_minutes(other.start_hour)
        other_end = time_to_minutes(other.end_hour)
        return max(self_start, other_start) < min(self_end, other_end)
