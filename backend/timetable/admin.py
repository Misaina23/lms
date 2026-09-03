from django.contrib import admin
from .models import TimetableSlot


@admin.register(TimetableSlot)
class TimetableSlotAdmin(admin.ModelAdmin):
    list_display = ['classe', 'matiere', 'professeur', 'day_of_week', 'start_hour', 'end_hour', 'room', 'academic_year']
    list_filter = ['day_of_week', 'academic_year', 'classe', 'matiere']
    search_fields = ['classe__nom', 'matiere__nom', 'professeur__email', 'room']
    date_hierarchy = 'created_at'
