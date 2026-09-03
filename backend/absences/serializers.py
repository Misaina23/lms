from rest_framework import serializers
from .models import Absence


class AbsenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Absence
        fields = [
            'id', 'etudiant', 'professeur', 'date_absence',
            'heure_debut', 'heure_fin', 'statut', 'motif', 'justifiee',
            'recorded_at', 'sync_source', 'client_uuid', 'created_at',
        ]
        read_only_fields = ['created_at', 'recorded_at', 'client_uuid']
