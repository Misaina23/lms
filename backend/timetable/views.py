from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer


class TimetableSlotViewSet(viewsets.ModelViewSet):
    queryset = TimetableSlot.objects.all()
    serializer_class = TimetableSlotSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['classe', 'professeur', 'matiere', 'day_of_week', 'academic_year']

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser], url_path='check-conflicts')
    def check_conflicts(self, request):
        academic_year = request.query_params.get('academic_year')
        day_of_week = request.query_params.get('day_of_week')
        filters = {}
        if academic_year:
            filters['academic_year'] = academic_year
        if day_of_week:
            filters['day_of_week'] = int(day_of_week)
        slots = TimetableSlot.objects.filter(**filters)
        conflicts = []
        for slot in slots:
            overlapping = slot.has_conflict()
            for other in overlapping:
                conflicts.append({
                    'classe_a': f"{slot.classe.nom} - {slot.matiere.nom} ({slot.get_day_of_week_display()} {slot.start_hour.strftime('%H:%M')}-{slot.end_hour.strftime('%H:%M')})",
                    'classe_b': f"{other.classe.nom} - {other.matiere.nom} ({other.get_day_of_week_display()} {other.start_hour.strftime('%H:%M')}-{other.end_hour.strftime('%H:%M')})",
                    'type': 'CLASH',
                })
        return Response({'conflicts': conflicts, 'count': len(conflicts)}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='validate')
    def validate_slot(self, request, pk=None):
        slot = self.get_object()
        conflicts = slot.has_conflict()
        if conflicts:
            return Response({
                'valid': False,
                'conflicts': [f"{c.classe.nom} - {c.matiere.nom}" for c in conflicts],
            }, status=status.HTTP_400_BAD_REQUEST)
        return Response({'valid': True}, status=status.HTTP_200_OK)
