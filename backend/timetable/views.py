from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer
from users.permissions import IsAdminOrReadOnly, IsAdminOnly


class TimetableSlotViewSet(viewsets.ModelViewSet):
    queryset = TimetableSlot.objects.select_related('classe', 'matiere', 'professeur').all()
    serializer_class = TimetableSlotSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['classe', 'matiere', 'professeur', 'day_of_week', 'academic_year']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter out deleted or archived slots
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def conflicts(self, request):
        from datetime import time
        day = request.query_params.get('day')
        slot_id = request.query_params.get('exclude')
        conflicts = []
        if day is not None:
            qset = TimetableSlot.objects.filter(day_of_week=int(day))
            if slot_id:
                qset = qset.exclude(id=slot_id)
            for slot in qset:
                overlaps = slot.has_conflict()
                if overlaps:
                    conflicts.append(TimetableSlotSerializer(overlap).data)
        return Response({'conflicts': conflicts})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_schedule(self, request):
        user = request.user
        if user.role not in ('ADMIN', 'PROFESSEUR'):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        queryset = self.get_queryset().filter(
            Q(professeur=user) | Q(classe__teacher_assignments__professeur=user)
        ).distinct()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
