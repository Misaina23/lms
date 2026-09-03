from rest_framework import serializers
from .models import TimetableSlot


class TimetableSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableSlot
        fields = [
            'id', 'classe', 'matiere', 'professeur', 'day_of_week',
            'start_hour', 'end_hour', 'room', 'academic_year',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
