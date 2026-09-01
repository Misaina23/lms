from rest_framework import serializers
from .models import Absence


class AbsenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Absence
        fields = [
            'id', 'etudiant', 'professeur', 'date_absence',
            'heure_debut', 'heure_fin', 'motif', 'justifiee', 'created_at',
        ]
        read_only_fields = ['created_at']
