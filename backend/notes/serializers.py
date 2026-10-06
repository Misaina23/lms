from rest_framework import serializers
from .models import Note


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

    def validate(self, attrs):
        period = attrs.get('exam_period', getattr(self.instance, 'exam_period', None))
        score_2 = attrs.get('score_2', getattr(self.instance, 'score_2', None))
        if period and period.number_of_notes == 1 and score_2 is not None:
            raise serializers.ValidationError({'score_2': 'Cette période est configurée avec une seule note.'})

        request = self.context.get('request')
        if request and request.user.role == 'PROFESSEUR':
            if self.instance and self.instance.status not in (Note.Status.DRAFT, Note.Status.REJECTED):
                raise serializers.ValidationError('Cette note a déjà été transmise et ne peut plus être modifiée.')
            student = attrs.get('etudiant', getattr(self.instance, 'etudiant', None))
            subject = attrs.get('matiere', getattr(self.instance, 'matiere', None))
            if period is None:
                raise serializers.ValidationError({'exam_period': 'Sélectionnez une période scolaire.'})
            if period.is_locked:
                raise serializers.ValidationError({'exam_period': 'Cette période est verrouillée.'})
            if student and student.classe_id and student.classe.academic_year != period.academic_year:
                raise serializers.ValidationError({'exam_period': 'La période ne correspond pas à l’année de la classe.'})
            from classes.models import TeacherAssignment
            if not TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=student.classe if student else None,
                matiere=subject,
                academic_year=period.academic_year,
            ).exists():
                raise serializers.ValidationError('Vous ne pouvez noter que vos classes et matières affectées.')
        return attrs

    def get_note(self, obj):
        return obj.note
