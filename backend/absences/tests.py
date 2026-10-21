from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import CustomUser
from classes.models import Classe, TeacherAssignment
from etudiants.models import Etudiant
from matieres.models import Matiere
from .models import Absence, TeacherUnavailabilityReport
from etudiants.models import AuditLog, Notification


class AbsenceViewSetTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = CustomUser.objects.create_user(
            username='admin',
            email='admin@lycee.com',
            password='adminpass',
            first_name='Admin',
            last_name='User',
            matricule='ADM001',
            role=CustomUser.Role.ADMIN,
        )
        Token.objects.create(user=cls.admin_user)
        cls.professeur = CustomUser.objects.create_user(
            username='prof',
            email='prof@lycee.com',
            password='profpass',
            first_name='Jean',
            last_name='Dupont',
            matricule='PRF001',
            role=CustomUser.Role.PROFESSEUR,
        )
        cls.classe = Classe.objects.create(nom='6eme A', niveau=Classe.Niveau.SECONDAIRE_GENERAL, capacite=40)
        cls.etudiant = Etudiant.objects.create(
            matricule='ELV001',
            first_name='Marie',
            last_name='Durand',
            classe=cls.classe,
            date_inscription='2024-09-01',
            actif=True,
        )
        cls.absence = Absence.objects.create(
            etudiant=cls.etudiant,
            professeur=cls.professeur,
            date_absence='2024-10-01',
            heure_debut='08:00:00',
            heure_fin='10:00:00',
            motif='Maladie',
            justifiee=True,
        )

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_absences(self):
        url = reverse('absence-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_absence(self):
        url = reverse('absence-list')
        data = {
            'etudiant': self.etudiant.id,
            'professeur': self.professeur.id,
            'date_absence': '2024-10-02',
            'heure_debut': '08:00:00',
            'heure_fin': '10:00:00',
            'motif': 'RDV médical',
            'justifiee': True,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Absence.objects.count(), 2)

    def test_teacher_reports_unavailability_and_notifies_active_administrators(self):
        subject = Matiere.objects.create(nom='Mathématiques', code='MATH-U')
        assignment = TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=subject,
            academic_year='2026-2027',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')

        response = self.client.post(reverse('teacher-unavailability-report-list'), {
            'assignment': assignment.id,
            'date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'start_time': '08:00',
            'end_time': '10:00',
            'reason': 'Empêchement médical',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        report = TeacherUnavailabilityReport.objects.get()
        self.assertEqual(report.status, TeacherUnavailabilityReport.Status.PENDING)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.admin_user,
                notification_type='TEACHER_UNAVAILABILITY',
            ).count(),
            1,
        )
        self.assertTrue(AuditLog.objects.filter(
            entity_type='TeacherUnavailabilityReport',
            entity_id=str(report.id),
            action=AuditLog.Action.CREATE,
        ).exists())

    def test_teacher_cannot_report_another_teachers_assignment(self):
        subject = Matiere.objects.create(nom='Mathématiques', code='MATH-U2')
        other_teacher = CustomUser.objects.create_user(
            username='other-prof',
            email='other-prof@lycee.com',
            password='profpass',
            first_name='Paul',
            last_name='Autre',
            matricule='PRF002',
            role=CustomUser.Role.PROFESSEUR,
        )
        assignment = TeacherAssignment.objects.create(
            professeur=other_teacher,
            classe=self.classe,
            matiere=subject,
            academic_year='2026-2027',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')

        response = self.client.post(reverse('teacher-unavailability-report-list'), {
            'assignment': assignment.id,
            'date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'start_time': '08:00',
            'end_time': '10:00',
            'reason': 'Empêchement',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(TeacherUnavailabilityReport.objects.exists())

    def test_only_admin_can_update_teacher_unavailability_status(self):
        subject = Matiere.objects.create(nom='Mathématiques', code='MATH-U3')
        assignment = TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=subject,
            academic_year='2026-2027',
        )
        report = TeacherUnavailabilityReport.objects.create(
            assignment=assignment,
            date=timezone.localdate() + timedelta(days=1),
            start_time='08:00',
            end_time='10:00',
            reason='Empêchement',
        )
        response = self.client.post(
            reverse('teacher-unavailability-report-update-status', args=[report.id]),
            {'status': TeacherUnavailabilityReport.Status.RESOLVED, 'admin_response': 'Remplaçant prévu.'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        report.refresh_from_db()
        self.assertEqual(report.status, TeacherUnavailabilityReport.Status.RESOLVED)
        self.assertEqual(report.admin_response, 'Remplaçant prévu.')
        self.assertTrue(AuditLog.objects.filter(
            entity_type='TeacherUnavailabilityReport',
            entity_id=str(report.id),
            action=AuditLog.Action.STATUS_CHANGE,
        ).exists())

    def test_retrieve_absence(self):
        url = reverse('absence-detail', args=[self.absence.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['motif'], 'Maladie')

    def test_admin_can_scan_student_qr_for_attendance(self):
        url = reverse('absence-scan')
        payload = {
            'matricule': self.etudiant.matricule,
            'classe': self.classe.id,
            'date_absence': '2026-10-06',
            'heure_debut': '10:00:00',
            'heure_fin': '12:00:00',
        }

        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['statut'], Absence.Status.PRESENT)
        self.assertIsNotNone(response.data['recorded_at'])

    def test_scan_rejects_duplicate_student_for_same_class_period(self):
        url = reverse('absence-scan')
        payload = {
            'matricule': self.etudiant.matricule,
            'classe': self.classe.id,
            'date_absence': '2026-10-06',
            'heure_debut': '10:00:00',
            'heure_fin': '12:00:00',
        }

        self.assertEqual(self.client.post(url, payload).status_code, 201)
        duplicate_response = self.client.post(url, payload)

        self.assertEqual(duplicate_response.status_code, 409)

    def test_scan_requires_the_selected_class_to_match_student(self):
        other_class = Classe.objects.create(
            nom='6eme B',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            capacite=40,
        )
        response = self.client.post(reverse('absence-scan'), {
            'matricule': self.etudiant.matricule,
            'classe': other_class.id,
            'date_absence': '2026-10-06',
            'heure_debut': '11:00:00',
            'heure_fin': '12:00:00',
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn('classe', response.data)
        self.assertEqual(Absence.objects.count(), 1)

    def test_scan_requires_a_selected_class(self):
        response = self.client.post(reverse('absence-scan'), {
            'matricule': self.etudiant.matricule,
            'date_absence': '2026-10-06',
            'heure_debut': '11:00:00',
            'heure_fin': '12:00:00',
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn('classe', response.data)
        self.assertEqual(Absence.objects.count(), 1)

    def test_secretariat_cannot_record_attendance_by_qr(self):
        secretary = CustomUser.objects.create_user(
            username='secretariat-attendance',
            email='secretariat-attendance@lycee.com',
            password='secretariatpass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='SECATT001',
            role=CustomUser.Role.SECRETARIAT,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=secretary).key}')

        response = self.client.post(reverse('absence-scan'), {
            'matricule': self.etudiant.matricule,
            'date_absence': '2026-10-06',
            'heure_debut': '10:00:00',
            'heure_fin': '12:00:00',
        })

        self.assertEqual(response.status_code, 403)

    def test_teacher_can_scan_only_students_in_assigned_classes(self):
        matiere = Matiere.objects.create(nom='Mathématiques', code='MATH')
        TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=matiere,
            academic_year='2026-2027',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')
        payload = {
            'matricule': self.etudiant.matricule,
            'classe': self.classe.id,
            'date_absence': '2026-10-06',
            'heure_debut': '13:00:00',
            'heure_fin': '14:00:00',
        }

        response = self.client.post(reverse('absence-scan'), payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['professeur'], self.professeur.id)

    def test_teacher_cannot_create_attendance_for_unassigned_class(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')

        response = self.client.post(reverse('absence-list'), {
            'etudiant': self.etudiant.id,
            'date_absence': '2026-10-06',
            'heure_debut': '15:00:00',
            'heure_fin': '16:00:00',
            'statut': 'PRESENT',
        }, format='json')

        self.assertEqual(response.status_code, 400)

    def test_risk_alerts_count_distinct_unexcused_absence_days_within_window(self):
        today = timezone.localdate()
        for day_offset in (2, 4, 6, 6):
            Absence.objects.create(
                etudiant=self.etudiant,
                professeur=self.professeur,
                date_absence=today - timedelta(days=day_offset),
                heure_debut='08:00:00',
                heure_fin='10:00:00',
                statut=Absence.Status.ABSENT,
                justifiee=False,
            )
        Absence.objects.create(
            etudiant=self.etudiant,
            professeur=self.professeur,
            date_absence=today - timedelta(days=8),
            heure_debut='10:00:00',
            heure_fin='12:00:00',
            statut=Absence.Status.ABSENT,
            justifiee=True,
        )

        response = self.client.get(reverse('absence-risk-alerts'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['window_days'], 30)
        self.assertEqual(len(response.data['results']), 1)
        alert = response.data['results'][0]
        self.assertEqual(alert['student_id'], self.etudiant.id)
        self.assertEqual(alert['absence_days'], 3)
        self.assertEqual(alert['severity'], 'WARNING')
        self.assertEqual(alert['latest_absence'], today - timedelta(days=2))

    def test_risk_alerts_are_limited_to_teacher_assigned_classes(self):
        assigned_subject = Matiere.objects.create(nom='Français', code='FR')
        TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=assigned_subject,
            academic_year='2026-2027',
        )
        other_class = Classe.objects.create(
            nom='6eme B',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            capacite=40,
        )
        other_student = Etudiant.objects.create(
            matricule='ELV002',
            first_name='Paul',
            last_name='Martin',
            classe=other_class,
            date_inscription='2024-09-01',
            actif=True,
        )
        today = timezone.localdate()
        for student, days in ((self.etudiant, (1, 3, 5)), (other_student, (1, 3, 5, 7, 9))):
            for day_offset in days:
                Absence.objects.create(
                    etudiant=student,
                    professeur=self.professeur,
                    date_absence=today - timedelta(days=day_offset),
                    heure_debut='08:00:00',
                    heure_fin='10:00:00',
                    statut=Absence.Status.ABSENT,
                    justifiee=False,
                )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')
        response = self.client.get(reverse('absence-risk-alerts'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['student_id'] for item in response.data['results']], [self.etudiant.id])

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')
        admin_response = self.client.get(reverse('absence-risk-alerts'))
        self.assertEqual(
            {item['student_id'] for item in admin_response.data['results']},
            {self.etudiant.id, other_student.id},
        )
        severities = {
            item['student_id']: item['severity']
            for item in admin_response.data['results']
        }
        self.assertEqual(severities[other_student.id], 'HIGH')

    def test_attendance_alert_command_notifies_admin_and_assigned_teacher_once_per_day(self):
        from datetime import timedelta

        from django.core.management import call_command
        from django.utils import timezone

        matiere = Matiere.objects.create(nom='Histoire', code='HIST')
        TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=matiere,
            academic_year='2026-2027',
        )
        today = timezone.localdate()
        for day_offset in (1, 2, 3):
            Absence.objects.create(
                etudiant=self.etudiant,
                professeur=self.professeur,
                date_absence=today - timedelta(days=day_offset),
                heure_debut='08:00:00',
                heure_fin='10:00:00',
                statut=Absence.Status.ABSENT,
                justifiee=False,
            )

        call_command('send_attendance_alerts')
        call_command('send_attendance_alerts')

        notifications = Notification.objects.filter(notification_type='REPEATED_ABSENCE')
        self.assertEqual(notifications.count(), 2)
        self.assertSetEqual(
            set(notifications.values_list('recipient_id', flat=True)),
            {self.admin_user.id, self.professeur.id},
        )
        notification = notifications.get(recipient=self.professeur)
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertEqual(notification.payload['absence_days'], 3)
        self.assertEqual(notification.payload['class_id'], self.classe.id)
