from decimal import Decimal, InvalidOperation

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
            return Note.objects.filter(q_objects) if classe_matiere_pairs else Note.objects.none()
        return Note.objects.none()

    def perform_create(self, serializer):
        # Auto-set the professeur to the current user if teacher
        if self.request.user.role == 'PROFESSEUR':
            serializer.save(professeur=self.request.user, updated_by=self.request.user)
        else:
            serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='reports')
    def reports(self, request):
        period_id = request.query_params.get('exam_period')
        if period_id:
            period = ExamPeriod.objects.filter(pk=period_id).first()
            if period is None:
                return Response(
                    {'exam_period': 'Période d’examen introuvable.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            period = ExamPeriod.objects.order_by('-start_date', '-id').first()
        if period is None:
            return Response(
                {'detail': 'Aucune période d’examen n’est configurée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            threshold = Decimal(request.query_params.get('threshold', '9.75'))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {'threshold': 'Le seuil doit être un nombre compris entre 0 et 20.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not threshold.is_finite() or not Decimal('0') <= threshold <= Decimal('20'):
            return Response(
                {'threshold': 'Le seuil doit être un nombre compris entre 0 et 20.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = self.get_queryset().filter(
            exam_period=period,
            status__in=(Note.Status.APPROVED, Note.Status.LOCKED),
            etudiant__actif=True,
            etudiant__statut='ENROLLED',
        ).filter(
            Q(etudiant__classe__academic_year=period.academic_year)
            | Q(etudiant__classe__academic_year__isnull=True),
        ).select_related(
            'etudiant__classe',
            'matiere',
            'exam_period',
        )

        if request.user.role == 'PROFESSEUR':
            from classes.models import TeacherAssignment

            assignments = TeacherAssignment.objects.filter(
                professeur=request.user,
                academic_year=period.academic_year,
            ).values_list('classe_id', 'matiere_id')
            assignment_filter = Q()
            for class_id, subject_id in assignments:
                assignment_filter |= Q(
                    etudiant__classe_id=class_id,
                    matiere_id=subject_id,
                )
            notes = notes.filter(assignment_filter) if assignment_filter else notes.none()

        groups = {}
        total_weighted_score = Decimal('0')
        total_coefficient = Decimal('0')
        passed_count = 0
        student_ids = set()

        for note in notes:
            score = Decimal(str(note.note))
            coefficient = note.coefficient or Decimal('1')
            student = note.etudiant
            class_id = student.classe_id
            class_name = student.classe.nom if class_id else 'Sans classe'
            key = (class_id, note.matiere_id)
            group = groups.setdefault(key, {
                'class_id': class_id,
                'class_name': class_name,
                'subject_id': note.matiere_id,
                'subject_name': note.matiere.nom,
                'weighted_total': Decimal('0'),
                'coefficient_total': Decimal('0'),
                'student_ids': set(),
                'passed_count': 0,
            })
            group['weighted_total'] += score * coefficient
            group['coefficient_total'] += coefficient
            group['student_ids'].add(student.pk)
            total_weighted_score += score * coefficient
            total_coefficient += coefficient
            student_ids.add(student.pk)
            if score >= threshold:
                group['passed_count'] += 1
                passed_count += 1

        results = []
        for group in groups.values():
            note_count = len(group['student_ids'])
            results.append({
                'class_id': group['class_id'],
                'class_name': group['class_name'],
                'subject_id': group['subject_id'],
                'subject_name': group['subject_name'],
                'student_count': note_count,
                'average': str(
                    (group['weighted_total'] / group['coefficient_total']).quantize(Decimal('0.01'))
                ),
                'passed_count': group['passed_count'],
                'pass_rate': str(
                    (Decimal(group['passed_count']) * 100 / note_count).quantize(Decimal('0.01'))
                ),
            })
        results.sort(key=lambda item: (item['class_name'], item['subject_name']))

        note_count = sum(len(group['student_ids']) for group in groups.values())
        return Response({
            'period': {
                'id': period.id,
                'label': period.label,
                'code': period.code,
                'academic_year': period.academic_year,
            },
            'threshold': str(threshold),
            'summary': {
                'student_count': len(student_ids),
                'subject_class_count': len(results),
                'note_count': note_count,
                'average': str(
                    (total_weighted_score / total_coefficient).quantize(Decimal('0.01'))
                    if total_coefficient
                    else Decimal('0.00')
                ),
                'passed_count': passed_count,
                'pass_rate': str(
                    (Decimal(passed_count) * 100 / note_count).quantize(Decimal('0.01'))
                    if note_count
                    else Decimal('0.00')
                ),
            },
            'results': results,
        })

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
