from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from users.models import CustomUser
from classes.models import Classe
from .models import Etudiant, Enrollment, StudentOrientation, AuditLog, Notification, StudentOfficePass, CertificateRequest, Deliberation


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
    """Eleve n'est PAS un utilisateur - c'est un dossier scolaire."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    classe_detail = ClasseNestedSerializer(source='classe', read_only=True)
    moyenne_generale = serializers.SerializerMethodField()

    class Meta:
        model = Etudiant
        fields = [
            'id', 'matricule', 'first_name', 'last_name', 'full_name',
            'date_of_birth', 'gender', 'phone', 'email_parent', 'phone_parent', 'address', 'photo',
            'classe', 'classe_detail', 'date_inscription',
            'statut', 'actif', 'moyenne_generale', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'moyenne_generale']

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and request.user.role in ('SURVEILLANT', 'SECRETARIAT'):
            fields.pop('moyenne_generale', None)
        return fields

    def validate(self, attrs):
        if self.instance and 'matricule' in attrs and attrs['matricule'] != self.instance.matricule:
            raise serializers.ValidationError({'matricule': 'Le matricule est immuable et ne peut pas être modifié.'})
        return attrs

    def get_moyenne_generale(self, obj):
        notes = obj.notes.filter(status__in=['APPROVED', 'LOCKED']) if hasattr(obj, 'notes') else []
        if not notes:
            return None
        try:
            total_weighted = sum(float(n.note) * float(n.coefficient) for n in notes)
            total_coefficient = sum(float(n.coefficient) for n in notes)
        except (TypeError, ValueError, AttributeError):
            return None
        if total_coefficient == 0:
            return None
        return round(total_weighted / total_coefficient, 2)


class StudentRegistrationSerializer(serializers.Serializer):
    matricule = serializers.CharField(
        max_length=50,
        validators=[UniqueValidator(queryset=Etudiant.objects.all())],
    )
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Etudiant.Gender.choices, required=False, allow_null=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email_parent = serializers.EmailField(required=False, allow_blank=True)
    phone_parent = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    classe = serializers.PrimaryKeyRelatedField(
        queryset=Classe.objects.all(),
        required=False,
        allow_null=True,
    )
    photo = serializers.ImageField(required=False, allow_null=True)
    date_inscription = serializers.DateField()
    academic_year = serializers.CharField(max_length=9)

    def validate(self, attrs):
        classe = attrs.get('classe')
        if classe and classe.academic_year and classe.academic_year != attrs['academic_year']:
            raise serializers.ValidationError({
                'academic_year': 'L’année scolaire doit correspondre à celle de la classe choisie.',
            })
        return attrs


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

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and request.user.role != 'ADMIN':
            for field_name in (
                'payment_status',
                'frais_total',
                'frais_verses',
                'reste_a_payer',
                'devise',
                'receipt_number',
                'receipt_file',
            ):
                fields.pop(field_name, None)
        return fields

    def get_reste_a_payer(self, obj):
        if obj.frais_total is None:
            return None
        from decimal import Decimal
        verse = obj.frais_verses or Decimal('0')
        return float(obj.frais_total - verse)

    def validate(self, attrs):
        classe = attrs.get('classe', self.instance.classe if self.instance else None)
        academic_year = attrs.get(
            'academic_year',
            self.instance.academic_year if self.instance else None,
        )
        if classe and classe.academic_year and academic_year != classe.academic_year:
            raise serializers.ValidationError({
                'classe': 'La classe choisie ne correspond pas à l’année scolaire de l’inscription.',
            })
        return attrs


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
            'title', 'message', 'payload', 'status', 'is_read', 'sent_at', 'retry_count', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'is_read', 'sent_at', 'retry_count', 'created_at']


class StudentOfficePassSerializer(serializers.ModelSerializer):
    student_detail = EtudiantSerializer(source='student', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.get_full_name', read_only=True)
    reference = serializers.SerializerMethodField()

    class Meta:
        model = StudentOfficePass
        fields = [
            'id', 'reference', 'student', 'student_detail', 'issued_by',
            'issued_by_name', 'kind', 'reason', 'destination',
            'scheduled_for', 'status', 'attended_at', 'created_at',
        ]
        read_only_fields = ['id', 'issued_by', 'status', 'attended_at', 'created_at']

    def get_reference(self, obj):
        return str(obj.id).split('-')[0].upper()

    def validate(self, attrs):
        if not attrs.get('reason', getattr(self.instance, 'reason', '')).strip():
            raise serializers.ValidationError({'reason': 'Indiquez le motif de la convocation ou du billet.'})
        return attrs


class CertificateRequestSerializer(serializers.ModelSerializer):
    student_detail = EtudiantSerializer(source='student', read_only=True)
    decided_by_detail = UserNestedSerializer(source='decided_by', read_only=True)

    class Meta:
        model = CertificateRequest
        fields = [
            'id', 'student', 'student_detail', 'academic_year', 'status',
            'fee_verified', 'negotiation_approved', 'decision_reason',
            'requested_by', 'decided_by', 'decided_by_detail',
            'created_at', 'decided_at',
        ]
        read_only_fields = ['id', 'status', 'requested_by', 'decided_by', 'decided_by_detail', 'created_at', 'decided_at']


class DeliberationSerializer(serializers.ModelSerializer):
    student_detail = EtudiantSerializer(source='student', read_only=True)
    target_class_detail = ClasseNestedSerializer(source='target_class', read_only=True)

    class Meta:
        model = Deliberation
        fields = [
            'id', 'student', 'student_detail', 'exam_period', 'average',
            'admission_threshold', 'decision', 'recommended_stream',
            'target_class', 'target_class_detail', 'decided_by', 'applied_at', 'created_at',
        ]
        read_only_fields = ['id', 'student_detail', 'target_class_detail', 'created_at', 'applied_at']
