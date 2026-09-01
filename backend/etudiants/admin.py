from django.contrib import admin
from .models import Etudiant


@admin.register(Etudiant)
class EtudiantAdmin(admin.ModelAdmin):
    list_display = ['user', 'classe', 'date_inscription', 'actif']
    search_fields = ['user__first_name', 'user__last_name', 'user__matricule']
    list_filter = ['classe', 'actif']
    ordering = ['user__last_name', 'user__first_name']
