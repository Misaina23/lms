from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Note
from matieres.models import ExamPeriod
from .serializers import NoteSerializer
from matieres.serializers import ExamPeriodSerializer
from users.permissions import IsAdminOnly, IsAdminOrReadOnly, CanManageGrades


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
                professeur=user
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

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        note = self.get_object()
        if request.user.role != 'PROFESSEUR' or note.professeur_id != request.user.id:
            return Response({'detail': 'Seul l’enseignant responsable peut transmettre cette note.'}, status=status.HTTP_403_FORBIDDEN)
        if note.status not in (Note.Status.DRAFT, Note.Status.REJECTED):
            return Response({'detail': 'Cette note ne peut plus être transmise.'}, status=status.HTTP_400_BAD_REQUEST)
        note.status = Note.Status.SUBMITTED
        note.updated_by = request.user
        note.save(update_fields=['status', 'updated_by', 'updated_at'])
        return Response(self.get_serializer(note).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def approve(self, request, pk=None):
        note = self.get_object()
        if note.status != Note.Status.SUBMITTED:
            return Response({'detail': 'Seules les notes soumises peuvent être validées.'}, status=status.HTTP_400_BAD_REQUEST)
        note.status = Note.Status.APPROVED
        note.updated_by = request.user
        note.save(update_fields=['status', 'updated_by', 'updated_at'])
        return Response(self.get_serializer(note).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def reject(self, request, pk=None):
        note = self.get_object()
        if note.status != Note.Status.SUBMITTED:
            return Response({'detail': 'Seules les notes soumises peuvent être renvoyées.'}, status=status.HTTP_400_BAD_REQUEST)
        comment = request.data.get('commentaire', note.commentaire)
        if not isinstance(comment, str):
            return Response({'commentaire': 'Le commentaire doit être du texte.'}, status=status.HTTP_400_BAD_REQUEST)
        note.status = Note.Status.REJECTED
        note.commentaire = comment
        note.updated_by = request.user
        note.save(update_fields=['status', 'commentaire', 'updated_by', 'updated_at'])
        return Response(self.get_serializer(note).data)


class ExamPeriodViewSet(viewsets.ModelViewSet):
    queryset = ExamPeriod.objects.all()
    serializer_class = ExamPeriodSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['period_type', 'is_locked']

    def get_queryset(self):
        queryset = super().get_queryset()
        academic_year = self.request.query_params.get('academic_year')
        if academic_year:
            queryset = queryset.filter(academic_year=academic_year)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOnly()]
        return [IsAdminOrReadOnly()]