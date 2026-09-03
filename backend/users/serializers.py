from rest_framework import serializers
from .models import CustomUser


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'matricule', 'first_name', 'last_name',
            'email', 'phone', 'role', 'teacher_type', 'status',
            'date_of_birth', 'address',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
