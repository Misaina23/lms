from rest_framework import serializers
from .models import Absence


class AbsenceSerializer(serializers.ModelSerializer):
    client_uuid = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = Absence
        fields = [
            'id', 'etudiant', 'professeur', 'date_absence',
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
