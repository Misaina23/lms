from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from .models import Classe, Room, TeacherAssignment, MatiereCoefficient, SchoolConfig
from .serializers import (
    ClasseSerializer, RoomSerializer, TeacherAssignmentSerializer,
    MatiereCoefficientSerializer, SchoolConfigSerializer,
)
from users.permissions import IsAdminOrReadOnly, IsAdminOnly


class ClasseViewSet(viewsets.ModelViewSet):
    queryset = Classe.objects.all().order_by('niveau', 'nom')
    serializer_class = ClasseSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['niveau', 'stream', 'academic_year', 'capacite']


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['batiment']


class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TeacherAssignment.objects.select_related('professeur', 'classe', 'matiere').all()
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professeur', 'classe', 'matiere', 'academic_year', 'is_main_teacher']


class MatiereCoefficientViewSet(viewsets.ModelViewSet):
    queryset = MatiereCoefficient.objects.select_related('matiere').all()
    serializer_class = MatiereCoefficientSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['matiere', 'niveau', 'stream']


class SchoolConfigViewSet(viewsets.ModelViewSet):
    queryset = SchoolConfig.objects.all()
    serializer_class = SchoolConfigSerializer
    permission_classes = [IsAdminOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['active', 'academic_year']
