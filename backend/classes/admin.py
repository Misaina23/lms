from django.contrib import admin
from .models import Classe


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ['nom', 'niveau', 'stream', 'academic_year', 'capacite', 'created_at']
    search_fields = ['nom', 'niveau', 'academic_year']
    list_filter = ['niveau', 'stream', 'academic_year']
    ordering = ['niveau', 'nom']
