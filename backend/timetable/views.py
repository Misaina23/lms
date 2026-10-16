from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer
from users.permissions import IsAdminOnly, CanViewSchedule


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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOnly()]
        return super().get_permissions()

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