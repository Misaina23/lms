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
        if request and request.user.role == 'PROFESSEUR':
            student = attrs.get('etudiant', getattr(self.instance, 'etudiant', None))
            from classes.models import TeacherAssignment
            if not student or not student.classe_id or not TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=student.classe,
            ).exists():
                raise serializers.ValidationError('Vous ne pouvez pointer que les élèves de vos classes affectées.')
        return attrs
