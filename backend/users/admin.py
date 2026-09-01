from django.contrib import admin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = [
        'matricule', 'get_full_name', 'email', 'role',
        'phone', 'is_active', 'created_at',
    ]
    search_fields = ['matricule', 'first_name', 'last_name', 'email']
    list_filter = ['role', 'is_active', 'date_of_birth']
    ordering = ['-created_at']
