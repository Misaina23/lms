from rest_framework import mixins, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Absence, TeacherUnavailabilityReport
from .serializers import AbsenceSerializer, TeacherUnavailabilityReportSerializer
from .alerts import (
    RISK_ALERT_ABSENCE_DAYS,
    RISK_ALERT_WINDOW_DAYS,
    get_repeated_absence_alerts,
)
from users.permissions import CanManageAttendance, IsTeacherOrAdmin, IsAdminOnly
from etudiants.models import AuditLog, Etudiant, Notification
from classes.models import TeacherAssignment
from users.models import CustomUser
from django.db import transaction
from django.utils import timezone


class _AbsenceViewSet(viewsets.ModelViewSet):
    serializer_class = AbsenceSerializer
    permission_classes = [CanManageAttendance]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['etudiant', 'professeur', 'date_absence', 'statut', 'justifiee']

    def get_queryset(self):
        user = self.request.user
        absences = Absence.objects.select_related('etudiant', 'etudiant__classe')
        if user.role == 'ADMIN':
            return absences
        elif user.role == 'SURVEILLANT':
            # Surveillants can see all attendance (read-only)
            return absences
        elif user.role == 'PROFESSEUR':
            # Teachers can only see attendance for their classes
            from classes.models import TeacherAssignment
            classe_ids = TeacherAssignment.objects.filter(
                professeur=user
            ).values_list('classe_id', flat=True)
            return absences.filter(etudiant__classe_id__in=classe_ids)
        return absences.none()

    def perform_create(self, serializer):
        teacher = self.request.user if self.request.user.role == 'PROFESSEUR' else None
        serializer.save(professeur=teacher)

    @action(detail=False, methods=['get'], url_path='risk-alerts')
    def risk_alerts(self, request):
        alerts = get_repeated_absence_alerts(
            teacher_id=request.user.pk if request.user.role == 'PROFESSEUR' else None,
        )
        return Response({
            'window_days': RISK_ALERT_WINDOW_DAYS,
            'threshold_days': RISK_ALERT_ABSENCE_DAYS,
            'results': alerts,
        })


class TeacherUnavailabilityReportViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = TeacherUnavailabilityReportSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        reports = TeacherUnavailabilityReport.objects.select_related(
            'assignment__professeur',
            'assignment__classe',
            'assignment__matiere',
        )
        if self.request.user.role == 'ADMIN':
            return reports
        return reports.filter(assignment__professeur=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            report = serializer.save()
            admins = CustomUser.objects.filter(
                role=CustomUser.Role.ADMIN,
                status=CustomUser.Status.ACTIVE,
                is_active=True,
            )
            assignment = report.assignment
            notification_message = (
                f"{assignment.professeur.get_full_name()} ne peut pas assurer "
                f"{assignment.matiere.nom} avec {assignment.classe.nom} "
                f"le {report.date} de {report.start_time:%H:%M} à {report.end_time:%H:%M}. "
                f"Motif : {report.reason}"
            )
            Notification.objects.bulk_create([
                Notification(
                    recipient=admin,
                    channel=Notification.Channel.PUSH,
                    notification_type='TEACHER_UNAVAILABILITY',
                    title='Indisponibilité d’un enseignant',
                    message=notification_message,
                    payload={'report_id': report.id},
                    status=Notification.Status.SENT,
                    sent_at=timezone.now(),
                )
                for admin in admins
            ])
            AuditLog.objects.create(
                actor=request.user,
                entity_type='TeacherUnavailabilityReport',
                entity_id=str(report.id),
                action=AuditLog.Action.CREATE,
                new_value={
                    'assignment': assignment.id,
                    'date': report.date.isoformat(),
                    'start_time': report.start_time.isoformat(),
                    'end_time': report.end_time.isoformat(),
                    'status': report.status,
                },
                reason=report.reason,
            )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly], url_path='update-status')
    def update_status(self, request, pk=None):
        report = self.get_object()
        new_status = request.data.get('status')
        allowed_statuses = {
            TeacherUnavailabilityReport.Status.ACKNOWLEDGED,
            TeacherUnavailabilityReport.Status.RESOLVED,
        }
        if new_status not in allowed_statuses:
            return Response(
                {'status': 'Choisissez « Pris en compte » ou « Traité ».'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = report.status
        report.status = new_status
        report.admin_response = str(request.data.get('admin_response', '')).strip()
        report.save(update_fields=['status', 'admin_response', 'updated_at'])
        AuditLog.objects.create(
            actor=request.user,
            entity_type='TeacherUnavailabilityReport',
            entity_id=str(report.id),
            action=AuditLog.Action.STATUS_CHANGE,
            old_value={'status': old_status},
            new_value={'status': report.status, 'admin_response': report.admin_response},
            reason=report.admin_response,
        )
        return Response(self.get_serializer(report).data)

class AbsenceViewSet(_AbsenceViewSet):
    @action(detail=False, methods=['post'], permission_classes=[IsTeacherOrAdmin])
    def scan(self, request):
        matricule = request.data.get('matricule', '').strip()
        if not matricule:
            return Response({'matricule': 'Le matricule est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

        etudiant = Etudiant.objects.filter(matricule=matricule, actif=True).first()
        if etudiant is None:
            return Response({'matricule': 'Aucun élève actif ne correspond à ce QR code.'}, status=status.HTTP_404_NOT_FOUND)

        selected_class = request.data.get('classe')
        if selected_class and str(etudiant.classe_id) != str(selected_class):
            return Response(
                {'classe': 'Le matricule ou QR code ne correspond pas à la classe choisie.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
