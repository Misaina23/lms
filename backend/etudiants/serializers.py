from rest_framework import serializers
from users.models import CustomUser
from .models import Etudiant


class EtudiantSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.filter(role=CustomUser.Role.ELEVE))

    class Meta:
        model = Etudiant
        fields = ['id', 'user', 'classe', 'date_inscription', 'actif']
