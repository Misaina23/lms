from rest_framework import serializers

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
    class Meta:
        model = Matiere
        fields = ['id', 'nom', 'code', 'description', 'coefficient']


class MatiereCoefficientSerializer(serializers.ModelSerializer):
    matiere_detail = serializers.SerializerMethodField()

    class Meta:
        model = MatiereCoefficient
        fields = ['id', 'matiere', 'matiere_detail', 'niveau', 'stream', 'coefficient', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_matiere_detail(self, obj):
        return {'id': obj.matiere.id, 'nom': obj.matiere.nom, 'code': obj.matiere.code}


class SchoolConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolConfig
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
