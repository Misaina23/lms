from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Absence
from .serializers import AbsenceSerializer
from users.permissions import IsAdminOrReadOnly


class AbsenceViewSet(viewsets.ModelViewSet):
    queryset = Absence.objects.all()
    serializer_class = AbsenceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['etudiant', 'professeur', 'date_absence', 'statut', 'justifiee']

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='sync')
    def sync_offline(self, request):
        sync_data = request.data.get('records', [])
        synced_count = 0
        conflicts = []
        for record in sync_data:
            client_uuid = record.get('client_uuid')
            statut = record.get('statut')
            if client_uuid:
                existing = Absence.objects.filter(client_uuid=client_uuid).first()
                if existing:
                    if existing.statut != statut:
                        conflicts.append({
                            'client_uuid': client_uuid,
                            'server_statut': existing.statut,
                            'client_statut': statut,
                        })
                    else:
                        existing.sync_source = Absence.SyncSource.OFFLINE_SYNCED
                        existing.save()
                        synced_count += 1
                        continue
            serializer = AbsenceSerializer(data={**record, 'professeur': request.user.id, 'sync_source': Absence.SyncSource.OFFLINE_SYNCED})
            if serializer.is_valid():
                serializer.save()
                synced_count += 1
        return Response({
            'synced': synced_count,
            'conflicts': conflicts,
        }, status=status.HTTP_200_OK)
