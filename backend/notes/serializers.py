from rest_framework import serializers
from .models import Note
from matieres.models import ExamPeriod


class NoteSerializer(serializers.ModelSerializer):
    note = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id', 'etudiant', 'matiere', 'professeur', 'exam_period',
            'score_1', 'score_2', 'note', 'coefficient', 'date_evaluation',
            'commentaire', 'status', 'updated_by', 'updated_at',
        ]
        read_only_fields = ['status', 'updated_by', 'updated_at']

    def get_note(self, obj):
        return obj.note


class ExamPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamPeriod
        fields = [
            'id', 'code', 'label', 'period_type', 'start_date', 'end_date',
            'weight_note_1', 'weight_note_2', 'is_locked', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
