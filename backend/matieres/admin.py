from django.contrib import admin
from .models import Matiere, ExamPeriod


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display = ['nom', 'code', 'coefficient', 'created_at']
    search_fields = ['nom', 'code']
    ordering = ['nom']


@admin.register(ExamPeriod)
class ExamPeriodAdmin(admin.ModelAdmin):
    list_display = ['code', 'label', 'period_type', 'start_date', 'end_date', 'weight_note_1', 'weight_note_2', 'is_locked']
    search_fields = ['code', 'label']
    list_filter = ['period_type', 'is_locked']
    ordering = ['start_date']
