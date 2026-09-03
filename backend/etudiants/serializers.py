from rest_framework import serializers
from users.models import CustomUser
from .models import Etudiant, Enrollment, StudentOrientation, AuditLog, Notification


class EtudiantSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.filter(role=CustomUser.Role.ELEVE))

    class Meta:
        model = Etudiant
        fields = ['id', 'user', 'classe', 'date_inscription', 'statut', 'actif', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'classe', 'academic_year', 'receipt_number',
            'payment_status', 'frais_total', 'frais_verses', 'devise',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at', 'updated_at']


class StudentOrientationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentOrientation
        fields = [
            'id', 'student', 'recommended_stream', 'ai_confidence_score',
            'ai_explanation', 'ai_model_version', 'final_stream', 'status',
            'decided_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'ai_confidence_score', 'ai_explanation', 'ai_model_version', 'created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'entity_type', 'entity_id', 'action',
            'old_value', 'new_value', 'reason', 'created_at',
        ]
        read_only_fields = ['id', 'actor', 'entity_type', 'entity_id', 'action', 'old_value', 'new_value', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'channel', 'notification_type', 'title',
            'message', 'payload', 'status', 'sent_at', 'retry_count', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'sent_at', 'retry_count', 'created_at']
