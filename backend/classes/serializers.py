from rest_framework import serializers
from users.models import CustomUser
from users.serializers import UserListSerializer

from .models import Classe, Room, TeacherAssignment, Matiere, MatiereCoefficient, SchoolConfig


class ClasseSerializer(serializers.ModelSerializer):
    effectif = serializers.SerializerMethodField()

    class Meta:
        model = Classe
        fields = [
            'id', 'nom', 'niveau', 'stream', 'academic_year', 'capacite',
            'effectif', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_effectif(self, obj):
        return obj.etudiant_set.filter(actif=True).count()


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'nom', 'capacite', 'batiment', 'equipement', 'created_at']
        read_only_fields = ['created_at']


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    professeur_detail = serializers.SerializerMethodField()
    classe_detail = serializers.SerializerMethodField()
    matiere_detail = serializers.SerializerMethodField()

    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'professeur', 'professeur_detail', 'classe', 'classe_detail',
            'matiere', 'matiere_detail', 'academic_year', 'is_main_teacher', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_professeur_detail(self, obj):
        return {
            'id': obj.professeur.id,
            'matricule': obj.professeur.matricule,
            'name': obj.professeur.get_full_name(),
        }

    def get_classe_detail(self, obj):
        return {'id': obj.classe.id, 'nom': obj.classe.nom, 'niveau': obj.classe.get_niveau_display()}

    def get_matiere_detail(self, obj):
        return {'id': obj.matiere.id, 'nom': obj.matiere.nom, 'code': obj.matiere.code}


class MatiereSerializer(serializers.ModelSerializer):
    classe = serializers.PrimaryKeyRelatedField(queryset=Classe.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = Matiere
        fields = ['id', 'nom', 'code', 'description', 'coefficient', 'classe']
        read_only_fields = ['id']

    def create(self, validated_data):
        classe = validated_data.pop('classe', None)
        matiere = Matiere.objects.create(**validated_data)
        if classe:
            MatiereCoefficient.objects.update_or_create(
                matiere=matiere,
                niveau=classe.niveau,
                stream=classe.stream or '',
                defaults={'coefficient': matiere.coefficient},
            )
        return matiere

    def update(self, instance, validated_data):
        classe = validated_data.pop('classe', None)
        instance.nom = validated_data.get('nom', instance.nom)
        instance.code = validated_data.get('code', instance.code)
        instance.description = validated_data.get('description', instance.description)
        if 'coefficient' in validated_data:
            instance.coefficient = validated_data['coefficient']
        instance.save()
        if classe:
            MatiereCoefficient.objects.update_or_create(
                matiere=instance,
                niveau=classe.niveau,
                stream=classe.stream or '',
                defaults={'coefficient': instance.coefficient},
            )
        return instance


class MatiereCoefficientSerializer(serializers.ModelSerializer):
    matiere_detail = serializers.SerializerMethodField()

    class Meta:
        model = MatiereCoefficient
        fields = ['id', 'matiere', 'matiere_detail', 'niveau', 'stream', 'coefficient', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_matiere_detail(self, obj):
        return {'id': obj.matiere.id, 'nom': obj.matiere.nom, 'code': obj.matiere.code}


class TeacherSummarySerializer(serializers.ModelSerializer):
    classes_count = serializers.SerializerMethodField()
    matieres_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'matricule', 'first_name', 'last_name',
            'email', 'phone', 'role', 'teacher_type', 'status',
            'classes_count', 'matieres_count',
        ]

    def get_classes_count(self, obj):
        return obj.assignments.values('classe').distinct().count()

    def get_matieres_count(self, obj):
        return obj.assignments.values('matiere').distinct().count()


class SchoolConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolConfig
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
