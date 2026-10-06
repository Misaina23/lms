from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, F, Q
from django.db import transaction
from django.utils import timezone
import datetime
from .models import Etudiant, Enrollment, StudentOrientation, AuditLog, Notification, StudentOfficePass
from .serializers import EtudiantSerializer, EnrollmentSerializer, StudentOrientationSerializer, AuditLogSerializer, NotificationSerializer, StudentRegistrationSerializer, StudentOfficePassSerializer
from users.permissions import IsAdminOnly, IsAdminOrReadOnly, IsStaffUser, CanManageStudents, CanManageEnrollment, CanManageOfficePass, CanViewSchedule
from users.models import CustomUser
from classes.models import TeacherAssignment


class EtudiantViewSet(viewsets.ModelViewSet):
    serializer_class = EtudiantSerializer
    permission_classes = [CanViewSchedule]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['classe', 'actif', 'statut', 'date_inscription']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('ADMIN', 'SECRETARIAT', 'SURVEILLANT'):
            return Etudiant.objects.all()
        elif user.role == 'PROFESSEUR':
            # Teachers can only see students in their classes
            classe_ids = TeacherAssignment.objects.filter(
                professeur=user
            ).values_list('classe_id', flat=True)
            return Etudiant.objects.filter(classe_id__in=classe_ids)
        return Etudiant.objects.none()

    def get_permissions(self):
        if self.action == 'register':
            return [CanManageStudents()]
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'change_statut']:
            return [IsAdminOnly()]
        return super().get_permissions()

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            student = Etudiant.objects.create(
                matricule=data['matricule'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                date_of_birth=data.get('date_of_birth'),
                gender=data.get('gender'),
                phone=data.get('phone', ''),
                email_parent=data.get('email_parent', ''),
                phone_parent=data.get('phone_parent', ''),
                address=data.get('address', ''),
                classe=data.get('classe'),
                date_inscription=data['date_inscription'],
                statut=Etudiant.StudentStatus.ENROLLED,
                actif=True,
            )
            Enrollment.objects.create(
                student=student,
                classe=data.get('classe'),
                academic_year=data['academic_year'],
                payment_status=Enrollment.PaymentStatus.UNPAID,
            )
            AuditLog.objects.create(
                actor=request.user,
                entity_type='Etudiant',
                entity_id=str(student.id),
                action=AuditLog.Action.CREATE,
                new_value={
                    'matricule': student.matricule,
                    'classe': student.classe_id,
                    'academic_year': data['academic_year'],
                    'statut': student.statut,
                },
                reason='Inscription scolaire, indépendante des règlements.',
            )
        return Response(self.get_serializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def change_statut(self, request, pk=None):
        etudiant = self.get_object()
        new_statut = request.data.get('statut')
        valid_statuts = [Etudiant.StudentStatus.APPLICANT, Etudiant.StudentStatus.ENROLLED, Etudiant.StudentStatus.SUSPENDED, Etudiant.StudentStatus.GRADUATED]
        if new_statut not in valid_statuts:
            return Response({'detail': 'Invalid statut value'}, status=status.HTTP_400_BAD_REQUEST)
        old_statut = etudiant.statut
        etudiant.statut = new_statut
        etudiant.save()
        AuditLog.objects.create(
            actor=request.user,
            entity_type='Etudiant',
            entity_id=str(etudiant.id),
            action=AuditLog.Action.STATUS_CHANGE,
            old_value={'statut': old_statut},
            new_value={'statut': new_statut},
            reason=request.data.get('reason', ''),
        )
        return Response({'status': 'statut updated', 'old': old_statut, 'new': new_statut})


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [CanManageEnrollment]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['classe', 'payment_status', 'academic_year']

    def get_permissions(self):
        if self.action == 'confirm_payment':
            return [IsAdminOnly()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAdminOnly()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role in ('ADMIN', 'SURVEILLANT', 'SECRETARIAT'):
            return Enrollment.objects.all()
        elif user.role == 'PROFESSEUR':
            classe_ids = TeacherAssignment.objects.filter(
                professeur=user
            ).values_list('classe_id', flat=True)
            return Enrollment.objects.filter(classe_id__in=classe_ids)
        return Enrollment.objects.none()

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly], url_path='confirm-payment')
    def confirm_payment(self, request, pk=None):
        enrollment = self.get_object()
        old_status = enrollment.payment_status
        enrollment.payment_status = Enrollment.PaymentStatus.PAID
        enrollment.frais_verses = request.data.get('frais_verses', enrollment.frais_verses or enrollment.frais_total)
        if request.data.get('devise'):
            enrollment.devise = request.data['devise']
        enrollment.save()

        # Create budget item for tuition revenue
        from budget.models import BudgetItem, BudgetCategory, BudgetSummary
        tuition_category = BudgetCategory.objects.filter(name='Scolarité élèves', category_type='REVENUE').first()
        if tuition_category and enrollment.frais_verses:
            BudgetItem.objects.create(
                item_type=BudgetItem.ItemType.REVENUE,
                category=tuition_category,
                academic_year=enrollment.academic_year,
                date=datetime.date.today(),
                amount=enrollment.frais_verses,
                devise=enrollment.devise,
                description=f"Paiement scolarité - {enrollment.student.user.get_full_name()} - {enrollment.receipt_number}",
                designation="Scolarité élève",
                reference_number=enrollment.receipt_number,
                revenue_source=BudgetItem.RevenueSource.TUITION,
                related_enrollment=enrollment,
                created_by=request.user,
                is_validated=True,
                validated_by=request.user,
            )
            # Update budget summary
            summary, _ = BudgetSummary.objects.get_or_create(academic_year=enrollment.academic_year)
            summary.recalculate()

        AuditLog.objects.create(
            actor=request.user,
            entity_type='Enrollment',
            entity_id=str(enrollment.id),
            action=AuditLog.Action.STATUS_CHANGE,
            old_value={'payment_status': old_status},
            new_value={'payment_status': enrollment.payment_status},
            reason='Payment confirmed',
        )
        Notification.objects.create(
            recipient=enrollment.student.user,
            channel=Notification.Channel.SMS,
            notification_type='PAYMENT_CONFIRMED',
            title='Paiement confirmé',
            message=f"Le paiement de {enrollment.student.user.get_full_name()} a été confirmé. Reçu: {enrollment.receipt_number}",
            payload={'enrollment_id': enrollment.id, 'receipt_number': enrollment.receipt_number},
        )
        return Response({'status': 'payment confirmed', 'receipt_number': enrollment.receipt_number})


class StudentOrientationViewSet(viewsets.ModelViewSet):
    queryset = StudentOrientation.objects.select_related('student__classe').all()
    serializer_class = StudentOrientationSerializer
    permission_classes = [IsAdminOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'status', 'recommended_stream']

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOnly], url_path='generate')
    def generate_recommendations(self, request):
        from notes.models import Note
        from matieres.models import Matiere
        target_student_ids = request.data.get('student_ids', [])
        if target_student_ids:
            etudiants = Etudiant.objects.filter(id__in=target_student_ids)
        else:
            etudiants = Etudiant.objects.filter(classe__niveau='SECONDAIRE_GENERAL', statut=Etudiant.StudentStatus.ENROLLED)
        results = []
        for etudiant in etudiants:
            orientation = self._compute_orientation(etudiant)
            if orientation:
                results.append(orientation)
        return Response({'generated': len(results), 'orientations': StudentOrientationSerializer(results, many=True).data})

    def _compute_orientation(self, etudiant):
        from notes.models import Note
        from matieres.models import Matiere
        try:
            existing = StudentOrientation.objects.get(student=etudiant)
            if existing.status == StudentOrientation.Status.CONFIRMED:
                return None
        except StudentOrientation.DoesNotExist:
            pass
        matieres_scientifiques = Matiere.objects.filter(code__in=['MATH', 'PC', 'SVT'])
        matieres_literaires = Matiere.objects.filter(code__in=['FR', 'PHILO', 'HG', 'LV'])
        matieres_socio_economiques = Matiere.objects.filter(code__in=['SES', 'MATH', 'FR', 'HG'])
        scores = {}
        for stream_name, matieres_list, threshold in [
            ('S', matieres_scientifiques, 12),
            ('L', matieres_literaires, 12),
            ('OSE', matieres_socio_economiques, 11),
        ]:
            relevant_notes = Note.objects.filter(etudiant=etudiant, matiere__in=matieres_list)
            if relevant_notes.exists():
                avg_score = relevant_notes.aggregate(avg=Avg('note'))['avg']
                if avg_score and avg_score >= threshold:
                    scores[stream_name] = float(avg_score)
        if not scores:
            return None
        best_stream = max(scores, key=scores.get)
        best_score = scores[best_stream]
        max_possible = 20.0
        confidence = round((best_score / max_possible) * 100, 2)
        explanations = {
            'S': f"Performance forte en Mathématiques ({scores.get('S', 0)}/20) et Sciences Physiques.",
            'L': f"Performance forte en Français et Littérature ({scores.get('L', 0)}/20).",
            'OSE': f"Performance équilibrée en SES et Mathématiques ({scores.get('OSE', 0)}/20).",
        }
        orientation = StudentOrientation(
            student=etudiant,
            recommended_stream=StudentOrientation.Stream(best_stream),
            ai_confidence_score=confidence,
            ai_explanation=explanations.get(best_stream, f"Recommandation pour la filière {best_stream}."),
            ai_model_version='1.0.0',
            status=StudentOrientation.Status.PROPOSED,
        )
        orientation.save()
        return orientation

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly], url_path='confirm')
    def confirm_orientation(self, request, pk=None):
        orientation = self.get_object()
        if orientation.status == StudentOrientation.Status.CONFIRMED:
            return Response({'detail': 'Orientation already confirmed'}, status=status.HTTP_400_BAD_REQUEST)
        orientation.final_stream = request.data.get('final_stream', orientation.recommended_stream)
        orientation.status = StudentOrientation.Status.CONFIRMED
        orientation.decided_by = request.user
        orientation.save()
        AuditLog.objects.create(
            actor=request.user,
            entity_type='StudentOrientation',
            entity_id=str(orientation.id),
            action=AuditLog.Action.STATUS_CHANGE,
            old_value={'status': StudentOrientation.Status.PROPOSED},
            new_value={'status': StudentOrientation.Status.CONFIRMED, 'final_stream': orientation.final_stream},
            reason=request.data.get('reason', ''),
        )
        Notification.objects.create(
            recipient=orientation.student.user,
            channel=Notification.Channel.EMAIL,
            notification_type='ORIENTATION_CONFIRMED',
            title='Orientation confirmée',
            message=f"L'orientation de {orientation.student.user.get_full_name()} vers la filière {orientation.get_final_stream_display()} a été confirmée.",
            payload={'orientation_id': orientation.id, 'final_stream': orientation.final_stream},
        )
        return Response({'status': 'orientation confirmed', 'final_stream': orientation.final_stream})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['entity_type', 'action', 'actor']


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['recipient', 'channel', 'notification_type', 'status']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Notification.objects.all()
        return Notification.objects.filter(recipient=user)

    def get_permissions(self):
        if self.action == 'broadcast':
            return [IsAdminOnly()]
        if self.action == 'mark_read':
            return [IsStaffUser()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOnly])
    def broadcast(self, request):
        title = request.data.get('title', '').strip()
        message = request.data.get('message', '').strip()
        roles = request.data.get('recipient_roles', [])
        classe_id = request.data.get('classe')
        allowed_roles = {'PROFESSEUR', 'SURVEILLANT', 'SECRETARIAT'}

        if not title or len(title) > 200 or not message:
            return Response(
                {'detail': 'Un titre (200 caractères maximum) et un message sont obligatoires.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(roles, list) or any(role not in allowed_roles for role in roles):
            return Response({'recipient_roles': 'Les rôles sélectionnés ne sont pas valides.'}, status=status.HTTP_400_BAD_REQUEST)
        if not roles and not classe_id:
            return Response({'detail': 'Choisissez au moins un rôle ou une classe.'}, status=status.HTTP_400_BAD_REQUEST)

        recipients = CustomUser.objects.filter(
            is_active=True,
            status=CustomUser.Status.ACTIVE,
            role__in=roles or allowed_roles,
        )
        if classe_id:
            recipients = recipients.filter(assignments__classe_id=classe_id)
        recipients = recipients.distinct()
        if not recipients.exists():
            return Response({'detail': 'Aucun compte actif ne correspond à cette audience.'}, status=status.HTTP_400_BAD_REQUEST)

        sent_at = timezone.now()
        notifications = [
            Notification(
                recipient=recipient,
                channel=Notification.Channel.PUSH,
                notification_type='ANNOUNCEMENT',
                title=title,
                message=message,
                payload={'classe': classe_id} if classe_id else {},
                status=Notification.Status.SENT,
                sent_at=sent_at,
            )
            for recipient in recipients
        ]
        Notification.objects.bulk_create(notifications)
        return Response({'sent': len(notifications)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient_id != request.user.id:
            return Response({'detail': 'Cette notification ne vous est pas destinée.'}, status=status.HTTP_403_FORBIDDEN)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response(self.get_serializer(notification).data)


class StudentOfficePassViewSet(viewsets.ModelViewSet):
    serializer_class = StudentOfficePassSerializer
    permission_classes = [CanManageOfficePass]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'kind', 'status']

    def get_queryset(self):
        user = self.request.user
        queryset = StudentOfficePass.objects.select_related('student', 'student__classe', 'issued_by')
        if user.role in ('ADMIN', 'SURVEILLANT', 'SECRETARIAT'):
            return queryset
        classe_ids = TeacherAssignment.objects.filter(professeur=user).values_list('classe_id', flat=True)
        return queryset.filter(student__classe_id__in=classe_ids)

    def perform_create(self, serializer):
        office_pass = serializer.save(issued_by=self.request.user)
        AuditLog.objects.create(
            actor=self.request.user,
            entity_type='StudentOfficePass',
            entity_id=str(office_pass.id),
            action=AuditLog.Action.CREATE,
            new_value={
                'student': office_pass.student_id,
                'kind': office_pass.kind,
                'status': office_pass.status,
            },
        )

    @action(detail=True, methods=['post'], url_path='mark-used')
    def mark_used(self, request, pk=None):
        office_pass = self.get_object()
        if office_pass.status != StudentOfficePass.Status.OPEN:
            return Response(
                {'detail': 'Seul un billet en attente peut être marqué comme utilisé.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        office_pass.status = StudentOfficePass.Status.USED
        office_pass.attended_at = timezone.now()
        office_pass.save(update_fields=['status', 'attended_at'])
        AuditLog.objects.create(
            actor=request.user,
            entity_type='StudentOfficePass',
            entity_id=str(office_pass.id),
            action=AuditLog.Action.STATUS_CHANGE,
            old_value={'status': StudentOfficePass.Status.OPEN},
            new_value={'status': StudentOfficePass.Status.USED},
        )
        return Response(self.get_serializer(office_pass).data)