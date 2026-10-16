from datetime import date
from decimal import Decimal

from django.utils import timezone

from etudiants.models import Enrollment, Notification
from users.models import CustomUser


def send_tuition_payment_reminders(today=None):
    today = today or timezone.localdate()
    sent_at = timezone.now()
    admins = list(CustomUser.objects.filter(
        role=CustomUser.Role.ADMIN,
        status=CustomUser.Status.ACTIVE,
        is_active=True,
    ))
    enrollments = Enrollment.objects.filter(
        student__actif=True,
        student__statut='ENROLLED',
        payment_status__in=(
            Enrollment.PaymentStatus.UNPAID,
            Enrollment.PaymentStatus.PARTIAL,
        ),
    ).select_related('student', 'classe')
    created_count = 0

    for enrollment in enrollments:
        if enrollment.frais_total is not None:
            remaining = enrollment.frais_total - (enrollment.frais_verses or Decimal('0'))
            if remaining <= 0:
                continue
        else:
            remaining = None

        severity = (
            'HIGH'
            if enrollment.payment_status == Enrollment.PaymentStatus.UNPAID
            else 'WARNING'
        )
        amount_text = (
            f"Reste à payer : {remaining:,.0f} {enrollment.devise}."
            if remaining is not None
            else 'Montant restant à confirmer par l’administration.'
        )
        for admin in admins:
            alert_key = (
                f"TUITION_PAYMENT:{today.isoformat()}:{enrollment.pk}:{admin.pk}"
            )
            if Notification.objects.filter(
                recipient=admin,
                notification_type='TUITION_PAYMENT_REMINDER',
                payload__alert_key=alert_key,
            ).exists():
                continue
            Notification.objects.create(
                recipient=admin,
                channel=Notification.Channel.PUSH,
                notification_type='TUITION_PAYMENT_REMINDER',
                title=f"Règlement à vérifier — {enrollment.student.get_full_name()}",
                message=(
                    f"{enrollment.student.get_full_name()} "
                    f"({enrollment.student.matricule}), classe "
                    f"{enrollment.classe.nom if enrollment.classe_id else 'non attribuée'}, "
                    f"année {enrollment.academic_year} : "
                    f"{'inscription non payée' if severity == 'HIGH' else 'paiement partiel'}. "
                    f"{amount_text}"
                ),
                payload={
                    'alert_key': alert_key,
                    'alert_date': today.isoformat(),
                    'enrollment_id': str(enrollment.pk),
                    'student_id': enrollment.student_id,
                    'student_name': enrollment.student.get_full_name(),
                    'matricule': enrollment.student.matricule,
                    'class_id': enrollment.classe_id,
                    'academic_year': enrollment.academic_year,
                    'payment_status': enrollment.payment_status,
                    'amount_remaining': str(remaining) if remaining is not None else None,
                    'currency': enrollment.devise,
                    'severity': severity,
                },
                status=Notification.Status.SENT,
                sent_at=sent_at,
            )
            created_count += 1

    return created_count
