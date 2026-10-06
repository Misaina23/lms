from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from .models import Absence
from .serializers import AbsenceSerializer
from users.permissions import CanManageAttendance, IsTeacherOrAdmin
from etudiants.models import Etudiant
from classes.models import TeacherAssignment


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
        teacher = self.request.user if self.request.user.role == 'PROFESSEUR' else None
        serializer.save(professeur=teacher)

    @action(detail=False, methods=['post'], permission_classes=[IsTeacherOrAdmin])
    def scan(self, request):
        matricule = request.data.get('matricule', '').strip()
        if not matricule:
            return Response({'matricule': 'Le matricule est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

        etudiant = Etudiant.objects.filter(matricule=matricule, actif=True).first()
        if etudiant is None:
            return Response({'matricule': 'Aucun élève actif ne correspond à ce QR code.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'PROFESSEUR':
            assigned = TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=etudiant.classe,
            ).exists()
            if not etudiant.classe_id or not assigned:
                return Response(
                    {'detail': 'Cet élève ne fait pas partie de vos classes affectées.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        scan_date = request.data.get('date_absence') or timezone.localdate()
        start_time = request.data.get('heure_debut')
        end_time = request.data.get('heure_fin')
        if not start_time or not end_time:
            return Response(
                {'detail': 'Les heures de début et de fin du cours sont obligatoires.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        duplicate = Absence.objects.filter(
            etudiant=etudiant,
            date_absence=scan_date,
            heure_debut=start_time,
            heure_fin=end_time,
        ).first()
        if duplicate:
            return Response(
                {'detail': 'Cet élève a déjà été pointé pour ce cours.', 'record': AbsenceSerializer(duplicate).data},
                status=status.HTTP_409_CONFLICT,
            )

        record = Absence.objects.create(
            etudiant=etudiant,
            professeur=request.user if request.user.role == 'PROFESSEUR' else None,
            date_absence=scan_date,
            heure_debut=start_time,
            heure_fin=end_time,
            statut=Absence.Status.PRESENT,
            recorded_at=timezone.now(),
        )
        return Response(AbsenceSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='sync')
    def sync_offline(self, request):
        user = request.user
        if user.role not in ('ADMIN', 'PROFESSEUR'):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        
        sync_data = request.data.get('records', [])
        if not isinstance(sync_data, list):
            return Response({'records': 'Une liste de pointages est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)
        synced_count = 0
        conflicts = []
        for record in sync_data:
            if not isinstance(record, dict):
                conflicts.append({'error': 'Chaque pointage doit être un objet.'})
                continue
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
                        continue
                    else:
                        existing.sync_source = Absence.SyncSource.OFFLINE_SYNCED
                        existing.save()
                        synced_count += 1
                        continue
            serializer = AbsenceSerializer(data={**record, 'professeur': request.user.id, 'sync_source': Absence.SyncSource.OFFLINE_SYNCED})
            if not serializer.is_valid():
                conflicts.append({'client_uuid': client_uuid, 'error': serializer.errors})
                continue
            serializer.save(
                professeur=request.user if user.role == 'PROFESSEUR' else None,
                recorded_at=timezone.now(),
            )
            synced_count += 1
        return Response({
            'synced': synced_count,
            'conflicts': conflicts,
        }, status=status.HTTP_200_OK)