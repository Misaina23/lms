from django.contrib import admin
from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['etudiant', 'matiere', 'professeur', 'note', 'coefficient', 'date_evaluation']
    search_fields = ['etudiant__user__first_name', 'etudiant__user__last_name', 'matiere__nom']
    list_filter = ['matiere', 'date_evaluation', 'professeur']
    ordering = ['-date_evaluation']
