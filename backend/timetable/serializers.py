from rest_framework import serializers

from .models import TimetableSlot
from classes.models import Classe
from matieres.models import Matiere
from users.models import CustomUser


class TimetableSlotSerializer(serializers.ModelSerializer):
    classe_name = serializers.CharField(source='classe.nom', read_only=True)
    matiere_name = serializers.CharField(source='matiere.nom', read_only=True)
    professeur_name = serializers.CharField(source='professeur.get_full_name', read_only=True)

    class Meta:
        model = TimetableSlot
        fields = [
            'id', 'classe', 'classe_name', 'matiere', 'matiere_name',
            'professeur', 'professeur_name', 'day_of_week', 'start_hour',
            'end_hour', 'room', 'academic_year', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        # Ensure professor is active if assigned
        professeur = data.get('professeur')
        if professeur and not professeur.is_active:
            raise serializers.ValidationError('Cannot assign an inactive professor.')
        return data

    def create(self, validated_data):
        # Prevent scheduling conflicts
        # simplified; a full implementation would check for overlaps
        return super().create(validated_data)
