from rest_framework import serializers
from etudiants.models import Etudiant
from .models import Absence, TeacherUnavailabilityReport
from classes.models import TeacherAssignment
from django.utils import timezone


class AttendanceStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etudiant
        fields = ['id', 'matricule', 'first_name', 'last_name', 'classe']


class AbsenceSerializer(serializers.ModelSerializer):
    client_uuid = serializers.UUIDField(required=False, write_only=True)
    etudiant_detail = AttendanceStudentSerializer(source='etudiant', read_only=True)

    class Meta:
        model = Absence
        fields = [
            'id', 'etudiant', 'etudiant_detail', 'professeur', 'date_absence',
            'heure_debut', 'heure_fin', 'statut', 'motif', 'justifiee',
            'recorded_at', 'sync_source', 'client_uuid', 'created_at',
        ]
        read_only_fields = ['professeur', 'created_at', 'recorded_at', 'client_uuid']

    def validate(self, attrs):
        request = self.context.get('request')
        student = attrs.get('etudiant', getattr(self.instance, 'etudiant', None))
        absence_date = attrs.get('date_absence', getattr(self.instance, 'date_absence', None))
        start_time = attrs.get('heure_debut', getattr(self.instance, 'heure_debut', None))
        end_time = attrs.get('heure_fin', getattr(self.instance, 'heure_fin', None))
        if student and absence_date and start_time and end_time:
            duplicates = Absence.objects.filter(
                etudiant=student,
                date_absence=absence_date,
                heure_debut=start_time,
                heure_fin=end_time,
            )
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError('Un pointage existe déjà pour cet élève et ce créneau.')
        if request and request.user.role == 'PROFESSEUR':
            from classes.models import TeacherAssignment
            if not student or not student.classe_id or not TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=student.classe,
            ).exists():
                raise serializers.ValidationError('Vous ne pouvez pointer que les élèves de vos classes affectées.')
        return attrs


class TeacherUnavailabilityReportSerializer(serializers.ModelSerializer):
    assignment_detail = serializers.SerializerMethodField()
    teacher_name = serializers.CharField(source='assignment.professeur.get_full_name', read_only=True)

    class Meta:
        model = TeacherUnavailabilityReport
        fields = [
            'id', 'assignment', 'assignment_detail', 'teacher_name',
            'date', 'start_time', 'end_time', 'reason', 'status',
            'admin_response', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'assignment_detail', 'teacher_name', 'status',
            'admin_response', 'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        assignment = attrs.get('assignment', getattr(self.instance, 'assignment', None))
        date = attrs.get('date', getattr(self.instance, 'date', None))
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        reason = attrs.get('reason', getattr(self.instance, 'reason', ''))

        if not reason.strip():
            raise serializers.ValidationError({'reason': 'Expliquez pourquoi vous ne pouvez pas assurer ce cours.'})
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'L’heure de fin doit être après l’heure de début.'})
        if date and date < timezone.localdate():
            raise serializers.ValidationError({'date': 'La date du cours ne peut pas être passée.'})
        if request and request.user.role == 'PROFESSEUR' and assignment:
            if assignment.professeur_id != request.user.id:
                raise serializers.ValidationError({'assignment': 'Vous ne pouvez signaler qu’une de vos affectations.'})
        return attrs

    def get_assignment_detail(self, obj):
        assignment = obj.assignment
        return {
            'class_id': assignment.classe_id,
            'class_name': assignment.classe.nom,
            'subject_id': assignment.matiere_id,
            'subject_name': assignment.matiere.nom,
            'academic_year': assignment.academic_year,
        }
