from django.contrib import admin
from .models import Matiere


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display = ['nom', 'code', 'created_at']
    search_fields = ['nom', 'code']
    ordering = ['nom']
