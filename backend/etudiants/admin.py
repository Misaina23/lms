from django.contrib import admin
from .models import Etudiant, Enrollment, StudentOrientation, AuditLog, Notification


@admin.register(Etudiant)
class EtudiantAdmin(admin.ModelAdmin):
    list_display = ['user', 'classe', 'date_inscription', 'statut', 'actif']
    search_fields = ['user__first_name', 'user__last_name', 'user__matricule']
    list_filter = ['classe', 'statut', 'actif']
    ordering = ['user__last_name', 'user__first_name']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'classe', 'academic_year', 'receipt_number', 'payment_status', 'frais_total', 'frais_verses', 'devise', 'created_at']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'receipt_number']
    list_filter = ['payment_status', 'academic_year']
    ordering = ['-created_at']


@admin.register(StudentOrientation)
class StudentOrientationAdmin(admin.ModelAdmin):
    list_display = ['student', 'recommended_stream', 'ai_confidence_score', 'final_stream', 'status', 'created_at']
    search_fields = ['student__user__first_name', 'student__user__last_name']
    list_filter = ['recommended_stream', 'status']
    ordering = ['-created_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'entity_id', 'action', 'actor', 'created_at']
    search_fields = ['entity_type', 'entity_id', 'actor__email']
    list_filter = ['action', 'entity_type']
    ordering = ['-created_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'channel', 'notification_type', 'status', 'sent_at', 'created_at']
    search_fields = ['recipient__email', 'notification_type']
    list_filter = ['channel', 'status', 'notification_type']
    ordering = ['-created_at']
