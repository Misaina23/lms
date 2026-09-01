from django.contrib import admin
from .models import Classe


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ['nom', 'niveau', 'capacite', 'created_at']
    search_fields = ['nom', 'niveau']
    list_filter = ['niveau']
    ordering = ['niveau', 'nom']
