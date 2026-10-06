from rest_framework import serializers
from .models import Matiere, ExamPeriod


class MatiereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matiere
        fields = ['id', 'nom', 'code', 'description', 'coefficient', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExamPeriodSerializer(serializers.ModelSerializer):
    academic_year = serializers.RegexField(regex=r'^\d{4}-\d{4}$')

    class Meta:
        model = ExamPeriod
        fields = [
            'id', 'code', 'label', 'period_type', 'academic_year', 'start_date', 'end_date',
            'number_of_notes', 'weight_note_1', 'weight_note_2', 'is_locked',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        academic_year = attrs.get('academic_year', getattr(self.instance, 'academic_year', ''))
        if academic_year:
            first_year, second_year = (int(year) for year in academic_year.split('-'))
            if second_year != first_year + 1:
                raise serializers.ValidationError(
                    {'academic_year': 'L’année scolaire doit couvrir deux années consécutives.'}
                )
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'La fin de la période doit être après son début.'})

        number_of_notes = attrs.get('number_of_notes', getattr(self.instance, 'number_of_notes', 2))
        if number_of_notes == 1:
            attrs['weight_note_1'] = 1
            attrs['weight_note_2'] = 0
        else:
            weight_note_1 = attrs.get('weight_note_1', getattr(self.instance, 'weight_note_1', 0.5))
            weight_note_2 = attrs.get('weight_note_2', getattr(self.instance, 'weight_note_2', 0.5))
            if weight_note_1 + weight_note_2 != 1:
                raise serializers.ValidationError(
                    {'weight_note_2': 'Les coefficients des deux notes doivent totaliser 1.'}
                )
        return attrs
