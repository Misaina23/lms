from rest_framework import serializers
from .models import Matiere


class MatiereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matiere
        fields = ['id', 'nom', 'code', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
