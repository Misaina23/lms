from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Note
from matieres.models import ExamPeriod
from .serializers import NoteSerializer, ExamPeriodSerializer
from users.permissions import IsAdminOrReadOnly, CanManageGrades, CanViewSchedule


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [CanManageGrades]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['etudiant', 'matiere', 'professeur', 'date_evaluation', 'exam_period', 'status']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Note.objects.all()
        elif user.role == 'SURVEILLANT':
            # Surveillants can see all grades (read-only)
            return Note.objects.all()
        elif user.role == 'PROFESSEUR':
            # Teachers can only see grades for their assigned classes/subjects
            from classes.models import TeacherAssignment
            assignments = TeacherAssignment.objects.filter(
                professeur=user,
                academic_year__in=ExamPeriod.objects.values_list('academic_year', flat=True).distinct()
            ).values_list('classe_id', 'matiere_id')
            classe_matiere_pairs = list(assignments)
            q_objects = Q()
            for classe_id, matiere_id in classe_matiere_pairs:
                q_objects |= Q(etudiant__classe_id=classe_id, matiere_id=matiere_id)
            return Note.objects.filter(q_objects)
        return Note.objects.none()

    def perform_create(self, serializer):
        # Auto-set the professeur to the current user if teacher
        if self.request.user.role == 'PROFESSEUR':
            serializer.save(professeur=self.request.user, updated_by=self.request.user)
        else:
            serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ExamPeriodViewSet(viewsets.ModelViewSet):
    queryset = ExamPeriod.objects.all()
    serializer_class = ExamPeriodSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['period_type', 'is_locked']