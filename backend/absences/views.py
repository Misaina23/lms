from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Absence
from .serializers import AbsenceSerializer
from users.permissions import IsAdminOrReadOnly, CanManageAttendance


class AbsenceViewSet(viewsets.ModelViewSet):
    serializer_class = AbsenceSerializer
    permission_classes = [CanManageAttendance]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['etudiant', 'professeur', 'date_absence', 'statut', 'justifiee']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Absence.objects.all()
        elif user.role == 'SURVEILLANT':
            # Surveillants can see all attendance (read-only)
            return Absence.objects.all()
        elif user.role == 'PROFESSEUR':
            # Teachers can only see attendance for their classes
            from classes.models import TeacherAssignment
            classe_ids = TeacherAssignment.objects.filter(
                professeur=user
            ).values_list('classe_id', flat=True)
            return Absence.objects.filter(etudiant__classe_id__in=classe_ids)
        return Absence.objects.none()

    def perform_create(self, serializer):
        serializer.save(professeur=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='sync')
    def sync_offline(self, request):
        user = request.user
        if user.role not in ('ADMIN', 'PROFESSEUR'):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        
        sync_data = request.data.get('records', [])
        synced_count = 0
        conflicts = []
        for record in sync_data:
            client_uuid = record.get('client_uuid')
            statut = record.get('statut')
            if client_uuid:
                existing = Absence.objects.filter(client_uuid=client_uuid).first()
                if existing:
                    # Check if teacher has permission to modify this absence
                    if user.role == 'PROFESSEUR':
                        from classes.models import TeacherAssignment
                        if not TeacherAssignment.objects.filter(
                            professeur=user,
                            classe=existing.etudiant.classe
                        ).exists():
                            conflicts.append({
                                'client_uuid': client_uuid,
                                'error': 'Not authorized for this class',
                            })
                            continue
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