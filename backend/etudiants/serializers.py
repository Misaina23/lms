from rest_framework import serializers

from users.models import CustomUser
from .models import Etudiant, Enrollment, StudentOrientation, AuditLog, Notification


class UserNestedSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'matricule', 'first_name', 'last_name', 'full_name', 'email', 'phone']


class ClasseNestedSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nom = serializers.CharField()
    niveau = serializers.CharField()
    stream = serializers.CharField()


class EtudiantSerializer(serializers.ModelSerializer):
    user_detail = UserNestedSerializer(source='user', read_only=True)
    classe_detail = ClasseNestedSerializer(source='classe', read_only=True)
    moyenne_generale = serializers.SerializerMethodField()

    class Meta:
        model = Etudiant
        fields = [
            'id', 'user', 'user_detail', 'classe', 'classe_detail', 'date_inscription',
            'statut', 'actif', 'moyenne_generale', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'moyenne_generale']

    def get_moyenne_generale(self, obj):
        notes = obj.notes.all()
        if not notes:
            return None
        total_weighted = sum(float(n.note) * float(n.coefficient) for n in notes)
        total_coefficient = sum(float(n.coefficient) for n in notes)
        if total_coefficient == 0:
            return None
        return round(total_weighted / total_coefficient, 2)


class EnrollmentSerializer(serializers.ModelSerializer):
    student_detail = EtudiantSerializer(source='student', read_only=True)
    classe_detail = ClasseNestedSerializer(source='classe', read_only=True)
    reste_a_payer = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_detail', 'classe', 'classe_detail',
            'academic_year', 'receipt_number', 'payment_status',
            'frais_total', 'frais_verses', 'reste_a_payer', 'devise',
            'receipt_file', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at', 'updated_at', 'reste_a_payer']

    def get_reste_a_payer(self, obj):
        if obj.frais_total is None:
            return None
        from decimal import Decimal
        verse = obj.frais_verses or Decimal('0')
        return float(obj.frais_total - verse)


class StudentOrientationSerializer(serializers.ModelSerializer):
    student_detail = EtudiantSerializer(source='student', read_only=True)
    decided_by_detail = UserNestedSerializer(source='decided_by', read_only=True)

    class Meta:
        model = StudentOrientation
        fields = [
            'id', 'student', 'student_detail', 'recommended_stream', 'ai_confidence_score',
            'ai_explanation', 'ai_model_version', 'final_stream', 'status',
            'decided_by', 'decided_by_detail', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'ai_confidence_score', 'ai_explanation', 'ai_model_version',
            'created_at', 'updated_at', 'student_detail', 'decided_by_detail',
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    actor_detail = UserNestedSerializer(source='actor', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_detail', 'entity_type', 'entity_id', 'action',
            'old_value', 'new_value', 'reason', 'created_at',
        ]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    recipient_detail = UserNestedSerializer(source='recipient', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_detail', 'channel', 'notification_type',
            'title', 'message', 'payload', 'status', 'sent_at', 'retry_count', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'sent_at', 'retry_count', 'created_at']
