from django.contrib import admin
from .models import Absence


@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    list_display = ['etudiant', 'professeur', 'date_absence', 'heure_debut', 'heure_fin', 'justifiee']
    search_fields = ['etudiant__user__first_name', 'etudiant__user__last_name', 'motif']
    list_filter = ['date_absence', 'justifiee', 'professeur']
    ordering = ['-date_absence']
