from rest_framework import serializers
from .models import Matiere, ExamPeriod


class MatiereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matiere
        fields = ['id', 'nom', 'code', 'description', 'coefficient', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExamPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamPeriod
        fields = [
            'id', 'code', 'label', 'period_type', 'start_date', 'end_date',
            'weight_note_1', 'weight_note_2', 'is_locked', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
