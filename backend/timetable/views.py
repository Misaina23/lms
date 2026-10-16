from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Q
from classes.models import Classe, TeacherAssignment
from users.models import CustomUser
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer
from users.permissions import IsAdminOnly, CanViewSchedule
from .generator import find_plan_conflict, generate_schedule


class TimetableSlotViewSet(viewsets.ModelViewSet):
    queryset = TimetableSlot.objects.select_related('classe', 'matiere', 'professeur').all()
    serializer_class = TimetableSlotSerializer
    permission_classes = [CanViewSchedule]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['classe', 'matiere', 'professeur', 'day_of_week', 'academic_year']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return TimetableSlot.objects.select_related('classe', 'matiere', 'professeur').all()
        elif user.role in ('PROFESSEUR', 'SURVEILLANT', 'SECRETARIAT'):
            # Teachers and surveillants can see all schedules for coordination
            return TimetableSlot.objects.select_related('classe', 'matiere', 'professeur').all()
        return TimetableSlot.objects.none()

    def get_permissions(self):
        if self.action in [
            'create',
            'update',
            'partial_update',
            'destroy',
            'generation_options',
            'generate',
            'generate_apply',
        ]:
            return [IsAdminOnly()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='generation-options')
    def generation_options(self, request):
        academic_year = request.query_params.get('academic_year', '').strip()
        if not academic_year:
            return Response(
                {'academic_year': 'L’année scolaire est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignments = TeacherAssignment.objects.filter(
            academic_year=academic_year,
            classe__academic_year=academic_year,
            professeur__role=CustomUser.Role.PROFESSEUR,
            professeur__status=CustomUser.Status.ACTIVE,
            professeur__is_active=True,
        ).select_related('classe', 'matiere', 'professeur').order_by(
            'classe__nom',
            'matiere__nom',
            'professeur__last_name',
            'professeur__first_name',
        )
        return Response({
            'academic_year': academic_year,
            'classes': [
                {'id': classe.id, 'name': classe.nom}
                for classe in Classe.objects.filter(
                    academic_year=academic_year,
                ).order_by('nom')
            ],
            'assignments': [
                {
                    'class_id': assignment.classe_id,
                    'class_name': assignment.classe.nom,
                    'subject_id': assignment.matiere_id,
                    'subject_name': assignment.matiere.nom,
                    'teacher_id': assignment.professeur_id,
                    'teacher_name': assignment.professeur.get_full_name(),
                }
                for assignment in assignments
            ],
        })

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        academic_year = request.data.get('academic_year')
        requested_sessions = request.data.get('sessions')
        if not isinstance(academic_year, str) or not academic_year.strip():
            return Response(
                {'academic_year': 'L’année scolaire est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(requested_sessions, list) or not requested_sessions:
            return Response(
                {'sessions': 'Ajoutez au moins une matière et son volume hebdomadaire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(requested_sessions) > 200:
            return Response(
                {'sessions': 'La demande ne peut pas contenir plus de 200 couples classe/matière.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized = []
        for index, item in enumerate(requested_sessions):
            if not isinstance(item, dict):
                return Response(
                    {'sessions': {index: 'Chaque volume horaire doit être un objet.'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            class_id = item.get('class_id')
            subject_id = item.get('subject_id')
            weekly_sessions = item.get('weekly_sessions')
            if (
                type(class_id) is not int
                or type(subject_id) is not int
                or type(weekly_sessions) is not int
                or not 1 <= weekly_sessions <= 6
            ):
                return Response(
                    {'sessions': {
                        index: 'Classe, matière et nombre de séances (1 à 6) sont obligatoires.',
                    }},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            normalized.append({
                'class_id': class_id,
                'subject_id': subject_id,
                'weekly_sessions': weekly_sessions,
            })
        if sum(item['weekly_sessions'] for item in normalized) > 500:
            return Response(
                {'sessions': 'Le planning demandé ne peut pas dépasser 500 créneaux.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            slots = generate_schedule(academic_year.strip(), normalized)
        except ValueError as error:
            detail = error.args[0]
            return Response(
                detail if isinstance(detail, dict) else {'detail': detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({
            'academic_year': academic_year.strip(),
            'lesson_duration_minutes': 60,
            'days': 6,
            'slots': slots,
        })

    @action(detail=False, methods=['post'], url_path='generate/apply')
    def generate_apply(self, request):
        academic_year = request.data.get('academic_year')
        slots = request.data.get('slots')
        if not isinstance(academic_year, str) or not academic_year.strip():
            return Response(
                {'academic_year': 'L’année scolaire est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(slots, list) or not slots or len(slots) > 500:
            return Response(
                {'slots': 'La liste des créneaux proposée est invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            scheduled = list(
                TimetableSlot.objects.select_for_update().filter(
                    academic_year=academic_year.strip(),
                ).select_related('classe', 'professeur')
            )
            proposed = []
            errors = []
            for index, raw_slot in enumerate(slots):
                if not isinstance(raw_slot, dict):
                    errors.append({'index': index, 'detail': 'Le créneau doit être un objet.'})
                    continue
                data = {**raw_slot, 'academic_year': academic_year.strip()}
                serializer = TimetableSlotSerializer(data=data)
                if not serializer.is_valid():
                    errors.append({'index': index, 'errors': serializer.errors})
                    continue
                candidate = TimetableSlot(**serializer.validated_data)
                if candidate.classe.academic_year != academic_year.strip():
                    errors.append({
                        'index': index,
                        'detail': 'La classe ne correspond pas à l’année scolaire demandée.',
                    })
                    continue
                assignment_exists = TeacherAssignment.objects.filter(
                    classe=candidate.classe,
                    matiere=candidate.matiere,
                    professeur=candidate.professeur,
                    academic_year=academic_year.strip(),
                    professeur__role=CustomUser.Role.PROFESSEUR,
                    professeur__status=CustomUser.Status.ACTIVE,
                    professeur__is_active=True,
                ).exists()
                if not assignment_exists:
                    errors.append({
                        'index': index,
                        'detail': 'Le professeur ne possède pas d’affectation active pour cette classe et cette matière.',
                    })
                    continue
                conflict = find_plan_conflict(candidate, scheduled + proposed)
                if conflict:
                    errors.append({
                        'index': index,
                        'detail': f'Conflit de créneau pour {conflict}.',
                    })
                    continue
                proposed.append(candidate)

            if errors:
                return Response(
                    {'detail': 'Le planning proposé contient des erreurs.', 'errors': errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            created = TimetableSlot.objects.bulk_create(proposed)
        return Response(
            self.get_serializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOnly])
    def conflicts(self, request):
        day = request.query_params.get('day')
        academic_year = request.query_params.get('academic_year')
        slot_id = request.query_params.get('exclude')
        qset = TimetableSlot.objects.select_related(
            'classe',
            'matiere',
            'professeur',
        ).all()
        if day is not None:
            qset = qset.filter(day_of_week=day)
        if academic_year:
            qset = qset.filter(academic_year=academic_year)
        if slot_id:
            qset = qset.exclude(id=slot_id)

        conflicts = []
        seen_pairs = set()
        for slot in qset:
            for other in slot.has_conflict():
                pair = tuple(sorted((slot.pk, other.pk)))
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)
                conflicts.append({
                    'slots': TimetableSlotSerializer(
                        [slot, other],
                        many=True,
                    ).data,
                })
        return Response({'conflicts': conflicts})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_schedule(self, request):
        user = request.user
        if user.role not in ('ADMIN', 'PROFESSEUR', 'SURVEILLANT'):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        queryset = self.get_queryset().filter(
            Q(professeur=user) | Q(classe__teacher_assignments__professeur=user)
        ).distinct()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)