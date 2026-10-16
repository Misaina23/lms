from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, content_negotiation_class, permission_classes
from rest_framework.response import Response
from rest_framework.negotiation import DefaultContentNegotiation
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, F, Q
from django.db import transaction
from django.utils import timezone
import datetime
import io
from decimal import Decimal
from .models import (
    AuditLog,
    CertificateRequest,
    Deliberation,
    Enrollment,
    Etudiant,
    Notification,
    StudentClassHistory,
    StudentOfficePass,
    StudentOrientation,
    StudentTransferRequest,
)
from .certificate_documents import generate_school_certificate
from .serializers import (
    AuditLogSerializer,
    CertificateRequestSerializer,
    DeliberationSerializer,
    EnrollmentSerializer,
    EtudiantSerializer,
    NotificationSerializer,
    StudentClassHistorySerializer,
    StudentOfficePassSerializer,
    StudentOrientationSerializer,
    StudentRegistrationSerializer,
    StudentTransferRequestSerializer,
)
from users.permissions import (
    CanManageEnrollment,
    CanManageOfficePass,
    CanManageStudents,
    CanRequestStudentTransfer,
    CanViewSchedule,
    IsAdminOnly,
    IsAdminOrReadOnly,
    IsStaffUser,
)
from users.models import CustomUser
from classes.models import Classe, TeacherAssignment
from matieres.models import ExamPeriod


def record_student_class(student, classe, academic_year, change_type, changed_by, reason=''):
    if classe is None:
        return None
    return StudentClassHistory.objects.create(
        student=student,
        classe=classe,
        academic_year=academic_year or classe.academic_year or '',
        change_type=change_type,
        changed_by=changed_by,
        reason=reason,
    )


def record_deliberation_class_history(
    student,
    previous_class_id,
    target_class,
    academic_year,
    decision,
    deliberation_created,
    changed_by,
):
    if (
        decision == Deliberation.Decision.ADMITTED
        and target_class
        and previous_class_id != target_class.id
    ):
        record_student_class(
            student=student,
            classe=target_class,
            academic_year=academic_year or target_class.academic_year or '',
            change_type=StudentClassHistory.ChangeType.PROMOTION,
            changed_by=changed_by,
            reason='Passage appliqué après délibération.',
        )
    elif (
        decision == Deliberation.Decision.REPEATER
        and deliberation_created
    ):
        record_student_class(
            student=student,
            classe=student.classe,
            academic_year=academic_year or (student.classe.academic_year if student.classe else ''),
            change_type=StudentClassHistory.ChangeType.REPEAT,
            changed_by=changed_by,
            reason='Redoublement décidé après délibération.',
        )


def _create_student_transfer_request(request, student_id, target_class_id, reason, academic_year=None):
    if not str(student_id or '').isdigit() or not str(target_class_id or '').isdigit():
        return Response(
            {'detail': 'Les identifiants de l’élève et de la classe doivent être numériques.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        student = Etudiant.objects.select_for_update().select_related('classe').filter(
            pk=student_id,
            actif=True,
            statut=Etudiant.StudentStatus.ENROLLED,
        ).first()
        if student is None:
            return Response(
                {'detail': 'Élève actif et inscrit introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        target_class = Classe.objects.select_for_update().filter(pk=target_class_id).first()
        if target_class is None:
            return Response({'detail': 'Classe cible introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if not isinstance(reason, str) or not reason.strip():
            return Response(
                {'reason': 'Un motif est obligatoire pour demander un transfert.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        year = academic_year or target_class.academic_year or (
            student.classe.academic_year if student.classe else None
        )
        if not year:
            return Response(
                {'academic_year': 'L’année scolaire du transfert est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            student.classe is None
            or student.classe_id == target_class.id
            or not student.classe.academic_year
            or student.classe.academic_year != year
            or not target_class.academic_year
            or target_class.academic_year != year
        ):
            return Response(
                {'target_class': 'L’élève et la classe cible doivent appartenir à la même année scolaire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        enrollment = Enrollment.objects.select_for_update().filter(
            student=student,
            academic_year=year,
        ).first()
        if enrollment is None or enrollment.classe_id != student.classe_id:
            return Response(
                {'detail': 'L’inscription de l’élève ne correspond pas à sa classe actuelle pour cette année.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if StudentTransferRequest.objects.filter(
            student=student,
            academic_year=year,
            status=StudentTransferRequest.Status.PENDING,
        ).exists():
            return Response(
                {'detail': 'Une demande de transfert est déjà en attente pour cet élève.'},
                status=status.HTTP_409_CONFLICT,
            )
        current_count = Etudiant.objects.filter(classe=target_class, actif=True).exclude(pk=student.pk).count()
        reserved_places = StudentTransferRequest.objects.filter(
            target_class=target_class,
            academic_year=year,
            status=StudentTransferRequest.Status.PENDING,
        ).count()
        if current_count + reserved_places >= target_class.capacite:
            return Response(
                {'detail': 'La classe cible a atteint sa capacité disponible.'},
                status=status.HTTP_409_CONFLICT,
            )

        transfer_request = StudentTransferRequest.objects.create(
            student=student,
            from_class=student.classe,
            target_class=target_class,
            academic_year=year,
            reason=reason.strip(),
            requested_by=request.user,
        )
        AuditLog.objects.create(
            actor=request.user,
            entity_type='StudentTransferRequest',
            entity_id=str(transfer_request.pk),
            action=AuditLog.Action.CREATE,
            new_value={
                'student': student.pk,
                'from_class': student.classe_id,
                'target_class': target_class.pk,
                'academic_year': year,
                'status': transfer_request.status,
            },
            reason=transfer_request.reason,
        )
    return Response(
        StudentTransferRequestSerializer(transfer_request).data,
        status=status.HTTP_201_CREATED,
    )


class StudentExportContentNegotiation(DefaultContentNegotiation):
    def filter_renderers(self, renderers, format):
        if format in {'xls', 'xlsx', 'pdf'}:
            return renderers
        return super().filter_renderers(renderers, format)


@api_view(['POST'])
@permission_classes([IsAdminOnly])
def import_students_endpoint(request):
    classe_id = request.data.get('classe_id')
    students = request.data.get('students', [])
    if not classe_id or not isinstance(students, list):
        return Response({'detail': 'classe_id et students sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)

    classe = Classe.objects.filter(id=classe_id).first()
    if classe is None:
        return Response({'detail': 'Classe introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    created = []
    for raw_student in students:
        matricule = (raw_student.get('matricule') or '').strip()
        if not matricule:
            continue
        student, created_flag = Etudiant.objects.get_or_create(
            matricule=matricule,
            defaults={
                'first_name': raw_student.get('first_name', '').strip(),
                'last_name': raw_student.get('last_name', '').strip(),
                'classe': classe,
                'date_inscription': raw_student.get('date_inscription') or datetime.date.today(),
                'statut': Etudiant.StudentStatus.ENROLLED,
                'actif': True,
            },
        )
        if created_flag:
            created.append(student)
            record_student_class(
                student=student,
                classe=classe,
                academic_year=classe.academic_year or '',
                change_type=StudentClassHistory.ChangeType.INITIAL,
                changed_by=request.user,
                reason='Import initial des élèves.',
            )
        else:
            student.actif = True
            student.save(update_fields=['actif'])
    return Response({'created': len(created), 'updated': len(students) - len(created), 'classe_id': classe.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@content_negotiation_class(StudentExportContentNegotiation)
@permission_classes([IsAdminOnly])
def export_students_endpoint(request):
    classe_id = request.query_params.get('classe_id')
    fmt = (request.query_params.get('format') or 'xls').lower()
    qs = Etudiant.objects.select_related('classe').all()
    if classe_id:
        qs = qs.filter(classe_id=classe_id)

    rows = [['Matricule', 'Nom', 'Prénom', 'Classe', 'Statut', 'Date inscription']]
    for student in qs:
        rows.append([
            student.matricule,
            student.last_name,
            student.first_name,
            getattr(student.classe, 'nom', ''),
            student.get_statut_display() if hasattr(student, 'get_statut_display') else student.statut,
            student.date_inscription,
        ])

    if fmt == 'pdf':
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        from reportlab.lib.units import cm
        buffer = io.BytesIO()
        pdf = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5 * cm, leftMargin=1.5 * cm)
        styles = getSampleStyleSheet()
        title = ParagraphStyle('title', parent=styles['Title'], fontSize=16, spaceAfter=20)
        story = [Paragraph('Liste des élèves', title), Spacer(1, 0.5 * cm)]
        table = Table(rows)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A3A36')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]))
        story.append(table)
        pdf.build(story)
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename='liste_eleves.pdf', content_type='application/pdf')

    import openpyxl
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = 'Etudiants'
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename='liste_eleves.xls', content_type='application/vnd.ms-excel')


@api_view(['POST'])
@permission_classes([CanRequestStudentTransfer])
def transfer_student_endpoint(request, pk=None):
    return _create_student_transfer_request(
        request,
        pk,
        request.data.get('target_class_id'),
        request.data.get('reason'),
        request.data.get('academic_year'),
    )


def _review_student_transfer(request, pk):
    with transaction.atomic():
        transfer_request = StudentTransferRequest.objects.select_for_update().select_related(
            'from_class',
            'target_class',
        ).filter(pk=pk).first()
        if transfer_request is None:
            return Response({'detail': 'Demande de transfert introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        transfer_request.student = Etudiant.objects.select_for_update().select_related(
            'classe',
        ).get(pk=transfer_request.student_id)
        if transfer_request.status != StudentTransferRequest.Status.PENDING:
            return Response(
                {'detail': 'Cette demande a déjà fait l’objet d’une décision.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision = request.data.get('status')
        if decision not in (StudentTransferRequest.Status.APPROVED, StudentTransferRequest.Status.REJECTED):
            return Response(
                {'status': 'La décision doit être APPROVED ou REJECTED.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision_reason = request.data.get('decision_reason')
        if not isinstance(decision_reason, str) or not decision_reason.strip():
            return Response(
                {'decision_reason': 'Une justification est obligatoire pour la décision.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision == StudentTransferRequest.Status.APPROVED:
            target_class = Classe.objects.select_for_update().get(pk=transfer_request.target_class_id)
            current_class = transfer_request.student.classe
            enrollment = Enrollment.objects.select_for_update().filter(
                student=transfer_request.student,
                academic_year=transfer_request.academic_year,
            ).first()
            if enrollment is None:
                return Response(
                    {'detail': 'Aucune inscription n’existe pour cet élève et cette année scolaire.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (
                current_class is None
                or transfer_request.from_class_id != current_class.id
                or target_class.id == current_class.id
                or current_class.academic_year != transfer_request.academic_year
                or target_class.academic_year != transfer_request.academic_year
                or enrollment.classe_id != current_class.id
            ):
                return Response(
                    {'detail': 'La classe actuelle, la classe cible et la demande doivent appartenir à la même année scolaire.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            current_count = Etudiant.objects.filter(classe=target_class, actif=True).exclude(
                pk=transfer_request.student_id,
            ).count()
            other_pending_count = StudentTransferRequest.objects.filter(
                target_class=target_class,
                academic_year=transfer_request.academic_year,
                status=StudentTransferRequest.Status.PENDING,
            ).exclude(pk=transfer_request.pk).count()
            if current_count + other_pending_count >= target_class.capacite:
                return Response(
                    {'detail': 'La classe cible a atteint sa capacité disponible.'},
                    status=status.HTTP_409_CONFLICT,
                )

        transfer_request.status = decision
        transfer_request.reviewed_by = request.user
        transfer_request.decision_reason = decision_reason.strip()
        transfer_request.reviewed_at = timezone.now()
        transfer_request.save(update_fields=[
            'status',
            'reviewed_by',
            'decision_reason',
            'reviewed_at',
        ])
        if decision == StudentTransferRequest.Status.APPROVED:
            _apply_student_transfer(transfer_request)
        AuditLog.objects.create(
            actor=request.user,
            entity_type='StudentTransferRequest',
            entity_id=str(transfer_request.pk),
            action=AuditLog.Action.STATUS_CHANGE,
            old_value={'status': StudentTransferRequest.Status.PENDING},
            new_value={
                'status': transfer_request.status,
                'student': transfer_request.student_id,
                'from_class': transfer_request.from_class_id,
                'target_class': transfer_request.target_class_id,
                'academic_year': transfer_request.academic_year,
                'decision_reason': transfer_request.decision_reason,
            },
            reason=transfer_request.decision_reason,
        )

    return Response(StudentTransferRequestSerializer(transfer_request).data)


def _apply_student_transfer(transfer_request):
    student = transfer_request.student
    old_class_id = student.classe_id
    student.classe = transfer_request.target_class
    student.statut = Etudiant.StudentStatus.ENROLLED
    student.save(update_fields=['classe', 'statut'])
    Enrollment.objects.filter(
        student=student,
        academic_year=transfer_request.academic_year,
    ).update(classe=transfer_request.target_class)
    record_student_class(
        student=student,
        classe=transfer_request.target_class,
        academic_year=transfer_request.academic_year,
        change_type=StudentClassHistory.ChangeType.TRANSFER,
        changed_by=transfer_request.reviewed_by,
        reason=transfer_request.decision_reason or transfer_request.reason,
    )
    AuditLog.objects.create(
        actor=transfer_request.reviewed_by,
        entity_type='Etudiant',
        entity_id=str(student.pk),
        action=AuditLog.Action.STATUS_CHANGE,
        old_value={'classe': old_class_id},
        new_value={
            'classe': transfer_request.target_class_id,
            'academic_year': transfer_request.academic_year,
            'transfer_request': transfer_request.pk,
        },
        reason=transfer_request.decision_reason or transfer_request.reason,
    )


@api_view(['POST'])
@permission_classes([IsAdminOnly])
def review_certificate_request_endpoint(request, pk=None):
    return _review_certificate_request(request, pk)


def _review_certificate_request(request, pk):
    with transaction.atomic():
        certificate = CertificateRequest.objects.select_for_update().select_related(
            'student',
            'student__classe',
        ).filter(pk=pk).first()
        if certificate is None:
            return Response(
                {'detail': 'Demande de certificat introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        status_value = request.data.get('status', certificate.status)
        if status_value not in dict(CertificateRequest.Status.choices):
            return Response(
                {'detail': 'Statut de certificat invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        negotiation_approved = request.data.get(
            'negotiation_approved',
            False,
        )
        if not isinstance(negotiation_approved, bool):
            return Response(
                {'negotiation_approved': 'Ce champ doit être un booléen.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision_reason = request.data.get('decision_reason', certificate.decision_reason)
        if not isinstance(decision_reason, str):
            return Response(
                {'decision_reason': 'La justification doit être un texte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision_reason = decision_reason.strip()

        fee_verified = False
        if status_value == CertificateRequest.Status.APPROVED:
            student = certificate.student
            classe = student.classe
            if (
                not student.actif
                or student.statut != Etudiant.StudentStatus.ENROLLED
                or classe is None
                or (classe.academic_year and classe.academic_year != certificate.academic_year)
            ):
                return Response(
                    {'detail': 'Le certificat exige un élève actif et inscrit dans une classe de cette année scolaire.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            enrollment = Enrollment.objects.select_for_update().filter(
                student=student,
                academic_year=certificate.academic_year,
                classe=classe,
            ).first()
            if enrollment is None:
                return Response(
                    {'detail': 'Aucune inscription n’existe pour cet élève et cette année scolaire.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            fee_verified = bool(
                (
                    enrollment.payment_status == Enrollment.PaymentStatus.PAID
                    or (
                        enrollment.frais_total is not None
                        and (enrollment.frais_verses or Decimal('0')) >= enrollment.frais_total
                    )
                )
            )
            if not fee_verified and not negotiation_approved:
                return Response(
                    {'detail': 'Les frais ne sont pas soldés. Une dérogation de négociation est requise.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not fee_verified and (
                not decision_reason
                or 'decision_reason' not in request.data
            ):
                return Response(
                    {'decision_reason': 'Une justification est obligatoire pour autoriser le certificat malgré les frais dus.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        old_values = {
            'status': certificate.status,
            'fee_verified': certificate.fee_verified,
            'negotiation_approved': certificate.negotiation_approved,
            'decision_reason': certificate.decision_reason,
        }
        certificate.status = status_value
        certificate.fee_verified = fee_verified
        certificate.negotiation_approved = negotiation_approved
        certificate.decision_reason = decision_reason
        certificate.decided_by = request.user
        certificate.decided_at = timezone.now()
        certificate.save(update_fields=[
            'status',
            'fee_verified',
            'negotiation_approved',
            'decision_reason',
            'decided_by',
            'decided_at',
        ])
        AuditLog.objects.create(
            actor=request.user,
            entity_type='CertificateRequest',
            entity_id=str(certificate.pk),
            action=AuditLog.Action.STATUS_CHANGE,
            old_value=old_values,
            new_value={
                'status': certificate.status,
                'fee_verified': certificate.fee_verified,
                'negotiation_approved': certificate.negotiation_approved,
                'decision_reason': certificate.decision_reason,
            },
            reason=certificate.decision_reason,
        )

    return Response({
        'status': certificate.status,
        'fee_verified': certificate.fee_verified,
        'negotiation_approved': certificate.negotiation_approved,
        'decision_reason': certificate.decision_reason,
        'decided_by': certificate.decided_by_id,
        'decided_at': certificate.decided_at,
    })


@api_view(['POST'])
@permission_classes([IsAdminOnly])
def analyze_deliberations_endpoint(request):
    threshold = Decimal(request.data.get('threshold', '9.75'))
    academic_year = request.data.get('academic_year')
    stream = request.data.get('stream')
    period_id = request.data.get('exam_period_id')
    period = None
    if period_id:
        period = ExamPeriod.objects.filter(id=period_id).first()
    if period is None:
        period = ExamPeriod.objects.filter(academic_year=academic_year).order_by('-start_date').first() if academic_year else ExamPeriod.objects.order_by('-start_date').first()
    if not period:
        return Response({'detail': 'Aucune période d’examen n’est disponible.'}, status=status.HTTP_400_BAD_REQUEST)

    students = Etudiant.objects.select_related('classe').filter(actif=True)
    if academic_year:
        students = students.filter(Q(classe__academic_year=academic_year) | Q(classe__academic_year__isnull=True))
    if stream:
        students = students.filter(classe__stream=stream)

    analyses = []
    for student in students:
        notes = student.notes.filter(status__in=['APPROVED', 'LOCKED'])
        if not notes.exists():
            continue

        weighted_total = Decimal('0')
        coefficient_total = Decimal('0')
        for note in notes.select_related('matiere'):
            value = Decimal(str(note.note))
            coeff = Decimal(str(note.coefficient or 1))
            weighted_total += value * coeff
            coefficient_total += coeff
        if coefficient_total == 0:
            continue
        average = (weighted_total / coefficient_total).quantize(Decimal('0.01'))
        decision = Deliberation.Decision.ADMITTED if average >= threshold else Deliberation.Decision.REPEATER
        previous_class_id = student.classe_id
        recommended_stream = stream or (student.classe.stream if student.classe else None)
        target_class = None
        if recommended_stream:
            target_academic_year = academic_year or (student.classe.academic_year if student.classe and student.classe.academic_year else academic_year)
            target_class = Classe.objects.filter(academic_year=target_academic_year, stream=recommended_stream).order_by('nom').first()
        if decision == Deliberation.Decision.ADMITTED and target_class:
            student.classe = target_class
            student.save(update_fields=['classe'])
        deliberation, created = Deliberation.objects.update_or_create(
            student=student,
            exam_period=period,
            defaults={
                'average': average,
                'admission_threshold': threshold,
                'decision': decision,
                'recommended_stream': recommended_stream,
                'target_class': target_class,
                'decided_by': request.user,
                'applied_at': timezone.now(),
            },
        )
        record_deliberation_class_history(
            student=student,
            previous_class_id=previous_class_id,
            target_class=target_class,
            academic_year=academic_year or period.academic_year,
            decision=decision,
            deliberation_created=created,
            changed_by=request.user,
        )
        analyses.append({
            'student_id': student.id,
            'matricule': student.matricule,
            'average': str(average),
            'decision': decision,
            'recommended_stream': recommended_stream,
            'target_class_id': target_class.id if target_class else None,
        })

    return Response({'count': len(analyses), 'results': analyses}, status=status.HTTP_200_OK)


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

    def perform_create(self, serializer):
        student = serializer.save()
        if student.classe_id:
            record_student_class(
                student=student,
                classe=student.classe,
                academic_year=student.classe.academic_year or '',
                change_type=StudentClassHistory.ChangeType.INITIAL,
                changed_by=self.request.user,
                reason='Création du dossier élève.',
            )

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
            record_student_class(
                student=student,
                classe=data.get('classe'),
                academic_year=data['academic_year'],
                change_type=StudentClassHistory.ChangeType.INITIAL,
                changed_by=request.user,
                reason='Inscription scolaire.',
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

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOnly], url_path='import', url_name='import')
    def import_students(self, request):
        classe_id = request.data.get('classe_id')
        students = request.data.get('students', [])
        if not classe_id or not isinstance(students, list):
            return Response({'detail': 'classe_id et students sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)

        classe = Classe.objects.filter(id=classe_id).first()
        if classe is None:
            return Response({'detail': 'Classe introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        created = []
        for raw_student in students:
            matricule = (raw_student.get('matricule') or '').strip()
            if not matricule:
                continue
            student, created_flag = Etudiant.objects.get_or_create(
                matricule=matricule,
                defaults={
                    'first_name': raw_student.get('first_name', '').strip(),
                    'last_name': raw_student.get('last_name', '').strip(),
                    'classe': classe,
                    'date_inscription': raw_student.get('date_inscription') or datetime.date.today(),
                    'statut': Etudiant.StudentStatus.ENROLLED,
                    'actif': True,
                },
            )
            if created_flag:
                created.append(student)
                if classe.academic_year:
                    record_student_class(
                        student=student,
                        classe=classe,
                        academic_year=classe.academic_year,
                        change_type=StudentClassHistory.ChangeType.INITIAL,
                        changed_by=request.user,
                        reason='Import initial des élèves.',
                    )
            else:
                student.actif = True
                student.save(update_fields=['actif'])
        return Response({'created': len(created), 'updated': len(students) - len(created), 'classe_id': classe.id}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOnly], url_path='export', url_name='export')
    def export_students(self, request):
        classe_id = request.query_params.get('classe_id')
        fmt = (request.query_params.get('format') or 'xls').lower()
        qs = Etudiant.objects.select_related('classe').all()
        if classe_id:
            qs = qs.filter(classe_id=classe_id)

        rows = [['Matricule', 'Nom', 'Prénom', 'Classe', 'Statut', 'Date inscription']]
        for student in qs:
            rows.append([
                student.matricule,
                student.last_name,
                student.first_name,
                getattr(student.classe, 'nom', ''),
                student.get_statut_display() if hasattr(student, 'get_statut_display') else student.statut,
                student.date_inscription,
            ])

        if fmt == 'pdf':
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
            from reportlab.lib.units import cm
            buffer = io.BytesIO()
            pdf = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5 * cm, leftMargin=1.5 * cm)
            styles = getSampleStyleSheet()
            title = ParagraphStyle('title', parent=styles['Title'], fontSize=16, spaceAfter=20)
            story = [Paragraph('Liste des élèves', title), Spacer(1, 0.5 * cm)]
            table = Table(rows)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A3A36')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ]))
            story.append(table)
            pdf.build(story)
            buffer.seek(0)
            return FileResponse(buffer, as_attachment=True, filename='liste_eleves.pdf', content_type='application/pdf')

        import openpyxl
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = 'Etudiants'
        for row in rows:
            sheet.append(row)
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename='liste_eleves.xls', content_type='application/vnd.ms-excel')

    @action(detail=True, methods=['post'], permission_classes=[CanRequestStudentTransfer], url_path='transfer', url_name='transfer')
    def transfer_student(self, request, pk=None):
        etudiant = self.get_object()
        return _create_student_transfer_request(
            request,
            etudiant.pk,
            request.data.get('target_class_id'),
            request.data.get('reason'),
            request.data.get('academic_year'),
        )


class StudentClassHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StudentClassHistory.objects.select_related(
        'student',
        'classe',
        'changed_by',
    )
    serializer_class = StudentClassHistorySerializer
    permission_classes = [CanManageStudents]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'academic_year', 'change_type']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == CustomUser.Role.PROFESSEUR:
            class_ids = TeacherAssignment.objects.filter(
                professeur=self.request.user,
            ).values_list('classe_id', flat=True)
            return queryset.filter(classe_id__in=class_ids)
        return queryset


class StudentTransferRequestViewSet(viewsets.ModelViewSet):
    queryset = StudentTransferRequest.objects.select_related(
        'student',
        'student__classe',
        'from_class',
        'target_class',
        'requested_by',
        'reviewed_by',
    )
    serializer_class = StudentTransferRequestSerializer
    permission_classes = [IsAdminOnly]
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'academic_year', 'status', 'target_class']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'create'):
            return [CanRequestStudentTransfer()]
        if self.action == 'review':
            return [IsAdminOnly()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == CustomUser.Role.SECRETARIAT:
            return queryset.filter(requested_by=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
        return _create_student_transfer_request(
            request,
            request.data.get('student'),
            request.data.get('target_class'),
            request.data.get('reason'),
            request.data.get('academic_year'),
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def review(self, request, pk=None):
        return _review_student_transfer(request, pk)


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

    def perform_create(self, serializer):
        with transaction.atomic():
            enrollment = serializer.save()
            has_class_history = StudentClassHistory.objects.filter(
                student=enrollment.student,
                academic_year=enrollment.academic_year,
            ).exists()
            if not has_class_history:
                record_student_class(
                    student=enrollment.student,
                    classe=enrollment.classe,
                    academic_year=enrollment.academic_year,
                    change_type=StudentClassHistory.ChangeType.INITIAL,
                    changed_by=self.request.user,
                    reason='Inscription scolaire.',
                )

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


class CertificateRequestViewSet(viewsets.ModelViewSet):
    queryset = CertificateRequest.objects.select_related(
        'student',
        'student__classe',
        'requested_by',
        'decided_by',
    ).prefetch_related('student__enrollments')
    serializer_class = CertificateRequestSerializer
    permission_classes = [IsAdminOnly]

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student')
        academic_year = request.data.get('academic_year')
        if not student_id or not academic_year:
            return Response({'detail': 'student et academic_year sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(academic_year, str) or not academic_year.strip():
            return Response({'academic_year': 'Année scolaire invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        academic_year = academic_year.strip()
        student = Etudiant.objects.select_related('classe').filter(id=student_id).first()
        if student is None:
            return Response({'detail': 'Étudiant introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if (
            not student.actif
            or student.statut != Etudiant.StudentStatus.ENROLLED
            or student.classe_id is None
            or (
                student.classe.academic_year
                and student.classe.academic_year != academic_year
            )
            or not Enrollment.objects.filter(
                student=student,
                academic_year=academic_year,
                classe=student.classe,
            ).exists()
        ):
            return Response(
                {'detail': 'Une demande exige un élève actif, inscrit dans une classe et une inscription correspondantes à cette année scolaire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if CertificateRequest.objects.filter(
            student=student,
            academic_year=academic_year,
            status=CertificateRequest.Status.PENDING,
        ).exists():
            return Response(
                {'detail': 'Une demande de certificat est déjà en attente pour cet élève et cette année.'},
                status=status.HTTP_409_CONFLICT,
            )
        instance = CertificateRequest.objects.create(
            student=student,
            academic_year=academic_year,
            requested_by=request.user,
            status=CertificateRequest.Status.PENDING,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly], url_path='review')
    def review(self, request, pk=None):
        return _review_certificate_request(request, pk)

    @action(detail=True, methods=['get'], permission_classes=[IsAdminOnly], url_path='download')
    def download(self, request, pk=None):
        certificate = self.get_object()
        try:
            buffer, certificate_number = generate_school_certificate(certificate)
        except ValueError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return FileResponse(
            buffer,
            as_attachment=True,
            filename=f'{certificate_number}.pdf',
            content_type='application/pdf',
        )


class DeliberationViewSet(viewsets.ModelViewSet):
    queryset = Deliberation.objects.select_related('student', 'student__classe', 'exam_period', 'target_class')
    serializer_class = DeliberationSerializer
    permission_classes = [IsAdminOnly]

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOnly], url_path='analyze')
    def analyze(self, request):
        threshold = Decimal(request.data.get('threshold', '9.75'))
        academic_year = request.data.get('academic_year')
        stream = request.data.get('stream')
        period_id = request.data.get('exam_period_id')
        period = None
        if period_id:
            period = ExamPeriod.objects.filter(id=period_id).first()
        if period is None:
            period = ExamPeriod.objects.filter(academic_year=academic_year).order_by('-start_date').first() if academic_year else ExamPeriod.objects.order_by('-start_date').first()
        if not period:
            return Response({'detail': 'Aucune période d’examen n’est disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        students = Etudiant.objects.select_related('classe').filter(actif=True)
        if academic_year:
            students = students.filter(Q(classe__academic_year=academic_year) | Q(classe__academic_year__isnull=True))
        if stream:
            students = students.filter(classe__stream=stream)

        analyses = []
        for student in students:
            notes = student.notes.filter(status__in=['APPROVED', 'LOCKED'])
            if not notes.exists():
                continue

            weighted_total = Decimal('0')
            coefficient_total = Decimal('0')
            for note in notes.select_related('matiere'):
                value = Decimal(str(note.note))
                coeff = Decimal(str(note.coefficient or 1))
                weighted_total += value * coeff
                coefficient_total += coeff
            if coefficient_total == 0:
                continue
            average = (weighted_total / coefficient_total).quantize(Decimal('0.01'))
            decision = Deliberation.Decision.ADMITTED if average >= threshold else Deliberation.Decision.REPEATER
            previous_class_id = student.classe_id
            recommended_stream = stream or (student.classe.stream if student.classe else None)
            target_class = None
            if recommended_stream:
                target_academic_year = academic_year or (student.classe.academic_year if student.classe and student.classe.academic_year else academic_year)
                target_class = Classe.objects.filter(academic_year=target_academic_year, stream=recommended_stream).order_by('nom').first()
            if decision == Deliberation.Decision.ADMITTED and target_class:
                student.classe = target_class
                student.save(update_fields=['classe'])
            deliberation, created = Deliberation.objects.update_or_create(
                student=student,
                exam_period=period,
                defaults={
                    'average': average,
                    'admission_threshold': threshold,
                    'decision': decision,
                    'recommended_stream': recommended_stream,
                    'target_class': target_class,
                    'decided_by': request.user,
                    'applied_at': timezone.now(),
                },
            )
            record_deliberation_class_history(
                student=student,
                previous_class_id=previous_class_id,
                target_class=target_class,
                academic_year=academic_year or period.academic_year,
                decision=decision,
                deliberation_created=created,
                changed_by=request.user,
            )
            analyses.append({
                'student_id': student.id,
                'matricule': student.matricule,
                'average': str(average),
                'decision': decision,
                'recommended_stream': recommended_stream,
                'target_class_id': target_class.id if target_class else None,
            })

        return Response({'count': len(analyses), 'results': analyses}, status=status.HTTP_200_OK)


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