from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

from .models import CustomUser


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'matricule', 'first_name', 'last_name',
            'email', 'phone', 'role', 'teacher_type', 'surveillant_type', 'status', 'photo',
        ]


class CustomUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'matricule', 'first_name', 'last_name',
            'email', 'phone', 'role', 'teacher_type', 'surveillant_type', 'status',
            'date_of_birth', 'address', 'photo', 'base_salary', 'password',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Définissez un mot de passe initial pour ce compte.'})

        role = attrs.get('role', getattr(self.instance, 'role', None))
        photo = attrs.get('photo', getattr(self.instance, 'photo', None))
        if role in {
            CustomUser.Role.ADMIN,
            CustomUser.Role.PROFESSEUR,
            CustomUser.Role.SURVEILLANT,
            CustomUser.Role.SECRETARIAT,
        } and not photo:
            raise serializers.ValidationError({'photo': 'La photo est obligatoire pour ce compte afin d’afficher le badge.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        if user.role in [
            CustomUser.Role.ADMIN,
            CustomUser.Role.PROFESSEUR,
            CustomUser.Role.SURVEILLANT,
            CustomUser.Role.SECRETARIAT,
        ]:
            user.status = CustomUser.Status.PENDING_VERIFICATION
            user.is_active = False
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
