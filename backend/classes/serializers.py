from rest_framework import serializers
from .models import Classe


class ClasseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = ['id', 'nom', 'niveau', 'capacite', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
