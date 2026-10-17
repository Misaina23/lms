from rest_framework import serializers
from django.db.models import Q
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
        return obj.etudiants.filter(actif=True).count()


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
            'matiere', 'matiere_detail', 'academic_year', 'is_main_teacher',
            'is_substitute', 'coverage_reason', 'created_at',
        ]
        read_only_fields = ['created_at']

    def validate(self, attrs):
        if attrs.get('is_substitute') and not attrs.get('coverage_reason', '').strip():
            raise serializers.ValidationError({'coverage_reason': 'Indiquez la raison du remplacement ou de l’aide enseignante.'})
        return attrs

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
                classe=classe,
                niveau=classe.niveau,
                stream=classe.stream,
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
                classe=classe,
                niveau=classe.niveau,
                stream=classe.stream,
                defaults={'coefficient': instance.coefficient},
            )
        return instance


class MatiereCoefficientSerializer(serializers.ModelSerializer):
    matiere_detail = serializers.SerializerMethodField()
    classe_detail = serializers.SerializerMethodField()
    classe = serializers.PrimaryKeyRelatedField(
        queryset=Classe.objects.all(),
        required=False,
        allow_null=True,
    )
    niveau = serializers.ChoiceField(choices=Classe.Niveau.choices, required=False)
    stream = serializers.ChoiceField(
        choices=Classe.Stream.choices,
        required=False,
        allow_null=True,
        allow_blank=True,
    )

    class Meta:
        model = MatiereCoefficient
        fields = [
            'id', 'matiere', 'matiere_detail', 'classe', 'classe_detail',
            'niveau', 'stream', 'coefficient', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'niveau': {'required': False},
            'stream': {'required': False, 'allow_null': True},
        }
        validators = []

    def validate(self, attrs):
        classe = attrs.get('classe', getattr(self.instance, 'classe', None))
        matiere = attrs.get('matiere', getattr(self.instance, 'matiere', None))
        if classe:
            attrs['niveau'] = classe.niveau
            attrs['stream'] = classe.stream
        elif not attrs.get('niveau', getattr(self.instance, 'niveau', None)):
            raise serializers.ValidationError({'niveau': 'Indiquez un niveau ou sélectionnez une classe.'})

        if matiere:
            coefficients = MatiereCoefficient.objects.filter(matiere=matiere)
            if self.instance:
                coefficients = coefficients.exclude(pk=self.instance.pk)
            if classe:
                duplicate = coefficients.filter(classe=classe).exists()
            else:
                niveau = attrs.get('niveau', self.instance.niveau if self.instance else None)
                stream = attrs.get('stream', self.instance.stream if self.instance else None)
                stream_filter = Q(stream=stream)
                if stream in (None, ''):
                    stream_filter = Q(stream__isnull=True) | Q(stream='')
                duplicate = coefficients.filter(
                    classe__isnull=True,
                    niveau=niveau,
                ).filter(stream_filter).exists()
            if duplicate:
                raise serializers.ValidationError({
                    'classe' if classe else 'stream': 'Un coefficient existe déjà pour cette matière et cette classe/filière.'
                })
        return attrs

    def get_matiere_detail(self, obj):
        return {'id': obj.matiere.id, 'nom': obj.matiere.nom, 'code': obj.matiere.code}

    def get_classe_detail(self, obj):
        if not obj.classe_id:
            return None
        return {'id': obj.classe.id, 'nom': obj.classe.nom, 'niveau': obj.classe.get_niveau_display(), 'stream': obj.classe.stream}


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
