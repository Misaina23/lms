from django.contrib import admin
from .models import Absence, TeacherUnavailabilityReport


@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    list_display = ['etudiant', 'professeur', 'date_absence', 'heure_debut', 'heure_fin', 'justifiee']
    search_fields = ['etudiant__first_name', 'etudiant__last_name', 'motif']
    list_filter = ['date_absence', 'justifiee', 'professeur']
    ordering = ['-date_absence']


@admin.register(TeacherUnavailabilityReport)
class TeacherUnavailabilityReportAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'date', 'start_time', 'end_time', 'status', 'created_at']
    list_filter = ['status', 'date']
    search_fields = ['assignment__professeur__first_name', 'assignment__professeur__last_name', 'reason']
    ordering = ['-date', '-start_time']
