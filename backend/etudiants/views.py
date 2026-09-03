from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, F
from .models import Etudiant, Enrollment, StudentOrientation, AuditLog, Notification
from .serializers import EtudiantSerializer, EnrollmentSerializer, StudentOrientationSerializer, AuditLogSerializer, NotificationSerializer
from users.permissions import IsAdminOrReadOnly


class EtudiantViewSet(viewsets.ModelViewSet):
    queryset = Etudiant.objects.all()
    serializer_class = EtudiantSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['classe', 'actif', 'statut', 'date_inscription']

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
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
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['classe', 'payment_status', 'academic_year']

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='confirm-payment')
    def confirm_payment(self, request, pk=None):
        enrollment = self.get_object()
        old_status = enrollment.payment_status
        enrollment.payment_status = Enrollment.PaymentStatus.PAID
        enrollment.frais_verses = request.data.get('frais_verses', enrollment.frais_verses or enrollment.frais_total)
        if request.data.get('devise'):
            enrollment.devise = request.data['devise']
        enrollment.save()
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
    queryset = StudentOrientation.objects.select_related('student__user').all()
    serializer_class = StudentOrientationSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'status', 'recommended_stream']

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='generate')
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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='confirm')
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
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['entity_type', 'action', 'actor']


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['recipient', 'channel', 'notification_type', 'status']
