from datetime import timedelta

from django.db.models import Count, F, Max, Q
from django.utils import timezone

from classes.models import TeacherAssignment
from etudiants.models import Etudiant, Notification
from users.models import CustomUser


RISK_ALERT_WINDOW_DAYS = 30
RISK_ALERT_ABSENCE_DAYS = 3
RISK_ALERT_HIGH_ABSENCE_DAYS = 5


def get_repeated_absence_alerts(today=None, teacher_id=None):
    today = today or timezone.localdate()
    window_start = today - timedelta(days=RISK_ALERT_WINDOW_DAYS - 1)
    students = Etudiant.objects.filter(
        actif=True,
        absences__statut='ABSENT',
        absences__justifiee=False,
        absences__date_absence__range=(window_start, today),
    )
    if teacher_id is not None:
        assigned_classes = TeacherAssignment.objects.filter(
            professeur_id=teacher_id,
        ).filter(
            Q(classe__academic_year__isnull=True)
            | Q(academic_year=F('classe__academic_year')),
        ).values_list('classe_id', flat=True)
        students = students.filter(classe_id__in=assigned_classes)

    rows = students.select_related('classe').annotate(
        absence_days=Count('absences__date_absence', distinct=True),
        latest_absence=Max('absences__date_absence'),
    ).filter(
        absence_days__gte=RISK_ALERT_ABSENCE_DAYS,
    ).order_by('-absence_days', 'last_name', 'first_name')

    return [
        {
            'student_id': student.id,
            'matricule': student.matricule,
            'student_name': student.get_full_name(),
            'class_id': student.classe_id,
            'class_name': student.classe.nom if student.classe_id else 'Sans classe',
            'academic_year': student.classe.academic_year if student.classe_id else None,
            'absence_days': student.absence_days,
            'latest_absence': student.latest_absence,
            'severity': 'HIGH' if student.absence_days >= RISK_ALERT_HIGH_ABSENCE_DAYS else 'WARNING',
        }
        for student in rows
    ]


def send_repeated_absence_notifications(today=None):
    today = today or timezone.localdate()
    sent_at = timezone.now()
    alerts = get_repeated_absence_alerts(today=today)
    admins = CustomUser.objects.filter(
        role=CustomUser.Role.ADMIN,
        status=CustomUser.Status.ACTIVE,
        is_active=True,
    )
    created_count = 0

    for alert in alerts:
        teachers = CustomUser.objects.filter(
            assignments__classe_id=alert['class_id'],
            role=CustomUser.Role.PROFESSEUR,
            status=CustomUser.Status.ACTIVE,
            is_active=True,
        )
        if alert['academic_year']:
            teachers = teachers.filter(assignments__academic_year=alert['academic_year'])
        teachers = teachers.distinct()
        recipients = list(admins) + list(teachers)
        severity_label = 'prioritaire' if alert['severity'] == 'HIGH' else 'à suivre'
        for recipient in recipients:
            alert_key = f"ABSENCE_RISK:{today.isoformat()}:{alert['student_id']}:{recipient.pk}"
            if Notification.objects.filter(
                recipient=recipient,
                notification_type='REPEATED_ABSENCE',
                payload__alert_key=alert_key,
            ).exists():
                continue
            Notification.objects.create(
                recipient=recipient,
                channel=Notification.Channel.PUSH,
                notification_type='REPEATED_ABSENCE',
                title=f"Absences répétées — {alert['student_name']}",
                message=(
                    f"{alert['student_name']} ({alert['matricule']}), classe "
                    f"{alert['class_name']}, cumule {alert['absence_days']} jours "
                    f"d’absence non justifiée sur les {RISK_ALERT_WINDOW_DAYS} derniers jours. "
                    f"Alerte {severity_label}."
                ),
                payload={
                    **alert,
                    'latest_absence': alert['latest_absence'].isoformat(),
                    'alert_key': alert_key,
                    'alert_date': today.isoformat(),
                },
                status=Notification.Status.SENT,
                sent_at=sent_at,
            )
            created_count += 1

    return created_count
