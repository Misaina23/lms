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
        professeur = data.get('professeur', self.instance.professeur if self.instance else None)
        if professeur and not professeur.is_active:
            raise serializers.ValidationError({'professeur': 'Impossible d’affecter un professeur inactif.'})

        slot = TimetableSlot(
            classe=data.get('classe', self.instance.classe if self.instance else None),
            matiere=data.get('matiere', self.instance.matiere if self.instance else None),
            professeur=professeur,
            day_of_week=data.get(
                'day_of_week',
                self.instance.day_of_week if self.instance else None,
            ),
            start_hour=data.get('start_hour', self.instance.start_hour if self.instance else None),
            end_hour=data.get('end_hour', self.instance.end_hour if self.instance else None),
            room=data.get('room', self.instance.room if self.instance else ''),
            academic_year=data.get(
                'academic_year',
                self.instance.academic_year if self.instance else None,
            ),
        )
        if slot.start_hour >= slot.end_hour:
            raise serializers.ValidationError({
                'end_hour': 'L’heure de fin doit être postérieure à l’heure de début.',
            })

        conflicts = slot.has_conflict()
        if conflicts:
            conflicting_resources = set()
            for other in conflicts:
                if other.classe_id == slot.classe_id:
                    conflicting_resources.add('la classe')
                if slot.professeur_id and other.professeur_id == slot.professeur_id:
                    conflicting_resources.add('le professeur')
                if slot.room.strip() and other.room.casefold() == slot.room.strip().casefold():
                    conflicting_resources.add('la salle')
            resources = ', '.join(sorted(conflicting_resources))
            raise serializers.ValidationError({
                'non_field_errors': [f'Ce créneau chevauche un autre cours pour {resources}.'],
            })
        return data
