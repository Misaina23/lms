from datetime import date
from io import StringIO

from django.core.exceptions import ValidationError
from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import CustomUser
from classes.models import Classe
from classes.models import TeacherAssignment
from matieres.models import Matiere, ExamPeriod
from notes.models import Note
from budget.models import BudgetItem
from .models import (
    AuditLog,
    CertificateRequest,
    Deliberation,
    Enrollment,
    Etudiant,
    Notification,
    StudentClassHistory,
    StudentOfficePass,
    StudentTransferRequest,
)


class DemoPortalSeedCommandTests(TestCase):
    @override_settings(DEBUG=True)
    def test_demo_command_seeds_requested_users_classes_and_five_students_per_class_idempotently(self):
        call_command('seed_demo_portal', allow_insecure_passwords=True, stdout=StringIO())
        call_command('seed_demo_portal', allow_insecure_passwords=True, stdout=StringIO())

        today = date.today()
        academic_year = f'{today.year}-{today.year + 1}' if today.month >= 9 else f'{today.year - 1}-{today.year}'
        self.assertEqual(CustomUser.objects.get(email='admin@gmail.com').role, CustomUser.Role.ADMIN)
        self.assertTrue(CustomUser.objects.get(email='admin@gmail.com').check_password('123456'))
        self.assertEqual(CustomUser.objects.get(email='enseignantmath@gmail.com').role, CustomUser.Role.PROFESSEUR)
        self.assertEqual(CustomUser.objects.get(email='surveillant1@gmail.com').role, CustomUser.Role.SURVEILLANT)
        self.assertEqual(Classe.objects.filter(academic_year=academic_year).count(), 9)
        self.assertEqual(Etudiant.objects.filter(classe__academic_year=academic_year).count(), 45)
        for classe in Classe.objects.filter(academic_year=academic_year):
            self.assertEqual(classe.etudiants.count(), 5)

    @override_settings(DEBUG=False)
    def test_demo_command_refuses_weak_accounts_outside_debug(self):
        with self.assertRaises(CommandError):
            call_command('seed_demo_portal', allow_insecure_passwords=True, stdout=StringIO())
        self.assertFalse(CustomUser.objects.filter(email='admin@gmail.com').exists())

    @override_settings(DEBUG=False)
    def test_production_seed_creates_same_demo_data_with_generated_passwords(self):
        output = StringIO()
        call_command('seed_demo_portal', production=True, stdout=output)

        today = date.today()
        academic_year = f'{today.year}-{today.year + 1}' if today.month >= 9 else f'{today.year - 1}-{today.year}'
        self.assertEqual(Classe.objects.filter(academic_year=academic_year).count(), 9)
        self.assertEqual(Etudiant.objects.filter(classe__academic_year=academic_year).count(), 45)

        generated = {}
        for line in output.getvalue().splitlines():
            if '@gmail.com :' in line:
                email, password = line.strip().split(' : ', maxsplit=1)
                generated[email] = password
        self.assertEqual(set(generated), {
            'admin@gmail.com',
            'enseignantmath@gmail.com',
            'surveillant1@gmail.com',
        })
        for email, password in generated.items():
            self.assertGreaterEqual(len(password), 32)
            self.assertNotEqual(password, '123456')
            self.assertTrue(CustomUser.objects.get(email=email).check_password(password))

        admin_password = generated['admin@gmail.com']
        call_command('seed_demo_portal', production=True, stdout=StringIO())
        self.assertTrue(CustomUser.objects.get(email='admin@gmail.com').check_password(admin_password))
        self.assertEqual(Classe.objects.filter(academic_year=academic_year).count(), 9)
        self.assertEqual(Etudiant.objects.filter(classe__academic_year=academic_year).count(), 45)


class AdmissionAndCertificateWorkflowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = CustomUser.objects.create_user(
            username='admin-workflow',
            email='admin-workflow@lycee.com',
            password='adminpass',
            first_name='Admin',
            last_name='Workflow',
            matricule='ADMWF001',
            role=CustomUser.Role.ADMIN,
        )
        Token.objects.create(user=cls.admin_user)
        cls.classe = Classe.objects.create(
            nom='1ère S',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream='S',
            capacite=35,
        )
        cls.period = ExamPeriod.objects.create(
            code='T1',
            label='Trimestre 1',
            period_type=ExamPeriod.PeriodType.TRIMESTRE_1,
            academic_year='2026-2027',
            start_date='2026-10-01',
            end_date='2026-12-31',
        )
        cls.math = Matiere.objects.create(nom='Mathématiques', code='MATH')
        cls.fr = Matiere.objects.create(nom='Français', code='FR')
        cls.ses = Matiere.objects.create(nom='SES', code='SES')

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_bulk_import_and_export_students_for_class(self):
        response = self.client.post(reverse('etudiant-import'), {
            'classe_id': self.classe.id,
            'students': [
                {'matricule': 'IMP-001', 'first_name': 'Rija', 'last_name': 'Rakoto', 'date_inscription': '2026-09-01'},
                {'matricule': 'IMP-002', 'first_name': 'Solo', 'last_name': 'Ravel', 'date_inscription': '2026-09-01'},
            ],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Etudiant.objects.filter(classe=self.classe).count(), 2)

        export_response = self.client.get(reverse('etudiant-export'), {'classe_id': self.classe.id, 'format': 'xls'})
        self.assertEqual(export_response.status_code, 200)
        self.assertIn('application/vnd.ms-excel', export_response['Content-Type'])

    def test_deliberation_analyze_uses_threshold_and_decides_admission(self):
        candidate = Etudiant.objects.create(
            matricule='DEL-01',
            first_name='Lina',
            last_name='A',
            classe=self.classe,
            date_inscription='2026-09-01',
        )
        repeater = Etudiant.objects.create(
            matricule='DEL-02',
            first_name='Tom',
            last_name='B',
            classe=self.classe,
            date_inscription='2026-09-01',
        )

        for etudiant, scores in [
            (candidate, {'MATH': 16.0, 'FR': 12.0, 'SES': 11.0}),
            (repeater, {'MATH': 7.0, 'FR': 8.5, 'SES': 9.0}),
        ]:
            for code, score in scores.items():
                matiere = Matiere.objects.get(code=code)
                Note.objects.create(
                    etudiant=etudiant,
                    matiere=matiere,
                    professeur=self.admin_user,
                    exam_period=self.period,
                    score_1=score,
                    coefficient=1,
                    date_evaluation='2026-11-15',
                    status=Note.Status.APPROVED,
                )

        response = self.client.post(reverse('deliberation-analyze'), {
            'threshold': '9.75',
            'academic_year': '2026-2027',
            'stream': 'S',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Deliberation.objects.filter(student=candidate, decision='ADMITTED').exists())
        self.assertTrue(Deliberation.objects.filter(student=repeater, decision='REPEATER').exists())
        self.assertTrue(StudentClassHistory.objects.filter(
            student=repeater,
            classe=self.classe,
            academic_year='2026-2027',
            change_type=StudentClassHistory.ChangeType.REPEAT,
        ).exists())

    def test_certificate_request_verifies_school_fees_and_allows_negotiation(self):
        student = Etudiant.objects.create(
            matricule='CERT-01',
            first_name='Nadia',
            last_name='C',
            classe=self.classe,
            date_inscription='2026-09-01',
        )
        Enrollment.objects.create(
            student=student,
            classe=self.classe,
            academic_year='2026-2027',
            frais_total='150000.00',
            frais_verses='150000.00',
            payment_status=Enrollment.PaymentStatus.PAID,
        )

        create_response = self.client.post(reverse('certificate-request-list'), {
            'student': student.id,
            'academic_year': '2026-2027',
        }, format='json')
        self.assertEqual(create_response.status_code, 201)
        request_obj = CertificateRequest.objects.get(student=student)
        self.assertEqual(request_obj.status, CertificateRequest.Status.PENDING)

        review_response = self.client.post(reverse('certificate-request-review', args=[request_obj.id]), {
            'status': CertificateRequest.Status.APPROVED,
            'fee_verified': True,
            'decision_reason': 'Frais validés et classe conforme.',
        }, format='json')
        self.assertEqual(review_response.status_code, 200)
        self.assertEqual(review_response.data['status'], CertificateRequest.Status.APPROVED)
        self.assertTrue(review_response.data['fee_verified'])
        self.assertEqual(review_response.data['decided_by'], self.admin_user.id)
        audit_log = AuditLog.objects.get(entity_type='CertificateRequest', entity_id=str(request_obj.id))
        self.assertEqual(audit_log.actor, self.admin_user)
        self.assertEqual(audit_log.new_value['status'], CertificateRequest.Status.APPROVED)

    def test_certificate_cannot_be_approved_with_unpaid_fees_without_negotiation(self):
        student = Etudiant.objects.create(
            matricule='CERT-UNPAID',
            first_name='Lina',
            last_name='D',
            classe=self.classe,
            date_inscription='2026-09-01',
        )
        Enrollment.objects.create(
            student=student,
            classe=self.classe,
            academic_year='2026-2027',
            frais_total='150000.00',
            frais_verses='25000.00',
            payment_status=Enrollment.PaymentStatus.PARTIAL,
        )
        certificate = CertificateRequest.objects.create(
            student=student,
            academic_year='2026-2027',
        )

        response = self.client.post(
            reverse('certificate-request-review', args=[certificate.id]),
            {'status': CertificateRequest.Status.APPROVED},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(AuditLog.objects.filter(entity_type='CertificateRequest').exists())
        certificate.refresh_from_db()
        self.assertEqual(certificate.status, CertificateRequest.Status.PENDING)
        self.assertIsNone(certificate.decided_by)

    def test_certificate_negotiation_override_requires_reason_and_is_audited(self):
        student = Etudiant.objects.create(
            matricule='CERT-OVERRIDE',
            first_name='Nadia',
            last_name='E',
            classe=self.classe,
            date_inscription='2026-09-01',
        )
        Enrollment.objects.create(
            student=student,
            classe=self.classe,
            academic_year='2026-2027',
            frais_total='150000.00',
            frais_verses='25000.00',
            payment_status=Enrollment.PaymentStatus.PARTIAL,
        )
        certificate = CertificateRequest.objects.create(
            student=student,
            academic_year='2026-2027',
        )
        url = reverse('certificate-request-detail', args=[certificate.id])

        missing_reason = self.client.post(
            f'{url}review/',
            {
                'status': CertificateRequest.Status.APPROVED,
                'negotiation_approved': True,
            },
            format='json',
        )
        self.assertEqual(missing_reason.status_code, 400)
        self.assertIn('decision_reason', missing_reason.data)

        approved = self.client.post(
            reverse('certificate-request-review', args=[certificate.id]),
            {
                'status': CertificateRequest.Status.APPROVED,
                'negotiation_approved': True,
                'decision_reason': 'Échéancier validé par la direction.',
            },
            format='json',
        )

        self.assertEqual(approved.status_code, 200)
        self.assertFalse(approved.data['fee_verified'])
        self.assertTrue(approved.data['negotiation_approved'])
        self.assertEqual(approved.data['decided_by'], self.admin_user.id)
        self.assertIsNotNone(approved.data['decided_at'])
        audit_log = AuditLog.objects.get(entity_type='CertificateRequest', entity_id=str(certificate.id))
        self.assertEqual(audit_log.reason, 'Échéancier validé par la direction.')
        self.assertEqual(audit_log.new_value['negotiation_approved'], True)

    def test_certificate_review_rejects_truthy_string_as_negotiation_approval(self):
        student = Etudiant.objects.create(
            matricule='CERT-BOOL',
            first_name='Sara',
            last_name='F',
            classe=self.classe,
            date_inscription='2026-09-01',
        )
        certificate = CertificateRequest.objects.create(
            student=student,
            academic_year='2026-2027',
        )

        response = self.client.post(
            reverse('certificate-request-review', args=[certificate.id]),
            {
                'status': CertificateRequest.Status.APPROVED,
                'negotiation_approved': 'false',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('negotiation_approved', response.data)

    def test_certificate_approval_requires_enrollment_in_matching_school_year(self):
        student = Etudiant.objects.create(
            matricule='CERT-WRONG-YEAR',
            first_name='Mia',
            last_name='G',
            classe=self.classe,
            date_inscription='2026-09-01',
        )
        certificate = CertificateRequest.objects.create(
            student=student,
            academic_year='2025-2026',
        )

        response = self.client.post(
            reverse('certificate-request-review', args=[certificate.id]),
            {
                'status': CertificateRequest.Status.APPROVED,
                'negotiation_approved': True,
                'decision_reason': 'Test',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(AuditLog.objects.filter(entity_type='CertificateRequest').exists())


class EtudiantViewSetTests(APITestCase):
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
        cls.classe = Classe.objects.create(
            nom='6eme A',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            capacite=40,
        )
        cls.etudiant = Etudiant.objects.create(
            matricule='ELV001',
            first_name='Marie',
            last_name='Dupont',
            classe=cls.classe,
            date_inscription='2024-09-01',
            actif=True,
        )

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_etudiants(self):
        url = reverse('etudiant-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_etudiant(self):
        url = reverse('etudiant-list')
        data = {
            'matricule': 'ELV002',
            'first_name': 'Pierre',
            'last_name': 'Martin',
            'classe': self.classe.id,
            'date_inscription': '2024-09-01',
            'actif': True,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Etudiant.objects.count(), 2)

    def test_retrieve_etudiant(self):
        url = reverse('etudiant-detail', args=[self.etudiant.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['actif'], True)

    def test_student_matricule_cannot_be_changed_through_api_or_model(self):
        response = self.client.patch(
            reverse('etudiant-detail', args=[self.etudiant.id]),
            {'matricule': 'ELV-CHANGED'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.etudiant.refresh_from_db()
        self.assertEqual(self.etudiant.matricule, 'ELV001')

        self.etudiant.matricule = 'ELV-CHANGED'
        with self.assertRaises(ValidationError):
            self.etudiant.save()

    def test_enrollment_class_must_match_its_academic_year(self):
        classe_2026 = Classe.objects.create(
            nom='6eme B',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=40,
        )
        response = self.client.post(reverse('enrollment-list'), {
            'student': self.etudiant.id,
            'classe': classe_2026.id,
            'academic_year': '2025-2026',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('classe', response.data)

    def test_enrollment_class_changes_require_transfer_and_new_enrollment_is_historized(self):
        enrollment = self.client.post(reverse('enrollment-list'), {
            'student': self.etudiant.id,
            'classe': self.classe.id,
            'academic_year': '2024-2025',
        }, format='json')

        self.assertEqual(enrollment.status_code, 201)
        self.assertTrue(StudentClassHistory.objects.filter(
            student=self.etudiant,
            classe=self.classe,
            academic_year='2024-2025',
            change_type=StudentClassHistory.ChangeType.INITIAL,
        ).exists())

        other_class = Classe.objects.create(
            nom='6eme D',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            capacite=40,
        )
        changed = self.client.patch(
            reverse('enrollment-detail', args=[enrollment.data['id']]),
            {'classe': other_class.id},
            format='json',
        )
        self.assertEqual(changed.status_code, 400)
        self.assertIn('classe', changed.data)

    def test_registration_class_must_match_academic_year(self):
        classe_2026 = Classe.objects.create(
            nom='6eme C',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=40,
        )
        response = self.client.post(reverse('etudiant-register'), {
            'matricule': 'ELV-DIFF-YEAR',
            'first_name': 'Aina',
            'last_name': 'Rasoanaivo',
            'classe': classe_2026.id,
            'date_inscription': '2025-09-01',
            'academic_year': '2025-2026',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('academic_year', response.data)
        self.assertFalse(Etudiant.objects.filter(matricule='ELV-DIFF-YEAR').exists())

    def test_secretariat_can_register_student_without_payment(self):
        secretary = CustomUser.objects.create_user(
            username='secretariat',
            email='secretariat@lycee.com',
            password='secretariatpass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='SEC001',
            role=CustomUser.Role.SECRETARIAT,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=secretary).key}')

        response = self.client.post(reverse('etudiant-register'), {
            'matricule': 'ELV003',
            'first_name': 'Aina',
            'last_name': 'Rasoanaivo',
            'classe': self.classe.id,
            'date_inscription': '2026-10-06',
            'academic_year': '2026-2027',
        })

        self.assertEqual(response.status_code, 201)
        student = Etudiant.objects.get(matricule='ELV003')
        enrollment = Enrollment.objects.get(student=student)
        self.assertEqual(student.statut, Etudiant.StudentStatus.ENROLLED)
        self.assertTrue(student.actif)
        self.assertEqual(enrollment.payment_status, Enrollment.PaymentStatus.UNPAID)
        self.assertIsNone(enrollment.frais_total)
        self.assertNotIn('frais_total', response.data)

    def test_secretariat_cannot_read_payment_details_or_manage_budget(self):
        secretary = CustomUser.objects.create_user(
            username='secretariat2',
            email='secretariat2@lycee.com',
            password='secretariatpass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='SEC002',
            role=CustomUser.Role.SECRETARIAT,
        )
        enrollment = Enrollment.objects.create(
            student=self.etudiant,
            classe=self.classe,
            academic_year='2026-2027',
            frais_total='100000.00',
            frais_verses='25000.00',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=secretary).key}')

        enrollment_response = self.client.get(reverse('enrollment-list'))
        self.assertEqual(enrollment_response.status_code, 200)
        self.assertNotIn('frais_total', enrollment_response.data['results'][0])
        self.assertNotIn('frais_verses', enrollment_response.data['results'][0])
        self.assertNotIn('payment_status', enrollment_response.data['results'][0])

        budget_response = self.client.get(reverse('budget-item-list'))
        self.assertEqual(budget_response.status_code, 403)

    def test_admin_can_broadcast_in_app_alert_to_selected_staff(self):
        teacher = CustomUser.objects.create_user(
            username='teacher-alert',
            email='teacher-alert@lycee.com',
            password='teacherpass',
            first_name='Jean',
            last_name='Teacher',
            matricule='TEAALERT',
            role=CustomUser.Role.PROFESSEUR,
        )
        response = self.client.post(reverse('notification-broadcast'), {
            'title': 'Changement de salle',
            'message': 'Le cours de demain aura lieu en salle 2.',
            'recipient_roles': ['PROFESSEUR'],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        notification = Notification.objects.get(recipient=teacher)
        self.assertEqual(notification.title, 'Changement de salle')
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertFalse(notification.is_read)

    def test_non_admin_cannot_broadcast_alert(self):
        secretary = CustomUser.objects.create_user(
            username='secretariat-alert',
            email='secretariat-alert@lycee.com',
            password='secretariatpass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='SECALERT',
            role=CustomUser.Role.SECRETARIAT,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=secretary).key}')

        response = self.client.post(reverse('notification-broadcast'), {
            'title': 'Alerte',
            'message': 'Message',
            'recipient_roles': ['PROFESSEUR'],
        })

        self.assertEqual(response.status_code, 403)

    def test_recipient_can_mark_notification_read(self):
        secretary = CustomUser.objects.create_user(
            username='secretariat-read',
            email='secretariat-read@lycee.com',
            password='secretariatpass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='SECREAD',
            role=CustomUser.Role.SECRETARIAT,
        )
        notification = Notification.objects.create(
            recipient=secretary,
            channel=Notification.Channel.PUSH,
            notification_type='ANNOUNCEMENT',
            title='Alerte',
            message='Message important',
            payload={},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=secretary).key}')

        response = self.client.post(reverse('notification-mark-read', args=[notification.id]))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_read'])

    def test_class_alert_is_limited_to_assigned_teachers(self):
        assigned_teacher = CustomUser.objects.create_user(
            username='assigned-teacher',
            email='assigned-teacher@lycee.com',
            password='teacherpass',
            first_name='Jean',
            last_name='Affecte',
            matricule='TEAASSIGN',
            role=CustomUser.Role.PROFESSEUR,
        )
        unassigned_teacher = CustomUser.objects.create_user(
            username='unassigned-teacher',
            email='unassigned-teacher@lycee.com',
            password='teacherpass',
            first_name='Paul',
            last_name='Autre',
            matricule='TEAUNASSIGN',
            role=CustomUser.Role.PROFESSEUR,
        )
        matiere = Matiere.objects.create(nom='Français', code='FR')
        TeacherAssignment.objects.create(
            professeur=assigned_teacher,
            classe=self.classe,
            matiere=matiere,
            academic_year='2026-2027',
        )

        response = self.client.post(reverse('notification-broadcast'), {
            'title': 'Réunion',
            'message': 'Réunion de classe à 14 h.',
            'recipient_roles': ['PROFESSEUR'],
            'classe': self.classe.id,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Notification.objects.filter(recipient=assigned_teacher).exists())
        self.assertFalse(Notification.objects.filter(recipient=unassigned_teacher).exists())

    def test_secretariat_can_issue_and_complete_student_office_pass(self):
        secretary = CustomUser.objects.create_user(
            username='secretariat-pass',
            email='secretariat-pass@lycee.com',
            password='secretariatpass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='SECPASS',
            role=CustomUser.Role.SECRETARIAT,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=secretary).key}')
        response = self.client.post(reverse('office-pass-list'), {
            'student': self.etudiant.id,
            'kind': StudentOfficePass.Kind.CONVOCATION,
            'reason': 'Entretien avec le surveillant général.',
            'destination': 'Bureau de vie scolaire',
            'scheduled_for': '2026-10-07T09:00:00+03:00',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        office_pass = StudentOfficePass.objects.get(id=response.data['id'])
        self.assertEqual(office_pass.issued_by, secretary)
        used_response = self.client.post(reverse('office-pass-mark-used', args=[office_pass.id]))
        self.assertEqual(used_response.status_code, 200)
        self.assertEqual(used_response.data['status'], StudentOfficePass.Status.USED)

    def test_teacher_cannot_issue_student_office_pass(self):
        teacher = CustomUser.objects.create_user(
            username='teacher-pass',
            email='teacher-pass@lycee.com',
            password='teacherpass',
            first_name='Jean',
            last_name='Teacher',
            matricule='TEAPASS',
            role=CustomUser.Role.PROFESSEUR,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=teacher).key}')

        response = self.client.post(reverse('office-pass-list'), {
            'student': self.etudiant.id,
            'kind': StudentOfficePass.Kind.ENTRY,
            'reason': 'Retard justifié.',
        }, format='json')

        self.assertEqual(response.status_code, 403)


class StudentTransferWorkflowTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username='transfer-admin',
            email='transfer-admin@lycee.com',
            password='adminpass',
            first_name='Admin',
            last_name='Transfer',
            matricule='TRANSFER-ADMIN',
            role=CustomUser.Role.ADMIN,
        )
        self.secretary = CustomUser.objects.create_user(
            username='transfer-secretary',
            email='transfer-secretary@lycee.com',
            password='secretarypass',
            first_name='Secretaire',
            last_name='Transfer',
            matricule='TRANSFER-SECRETARY',
            role=CustomUser.Role.SECRETARIAT,
        )
        self.current_class = Classe.objects.create(
            nom='1ere A',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=30,
        )
        self.target_class = Classe.objects.create(
            nom='1ere B',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=30,
        )
        self.student = Etudiant.objects.create(
            matricule='TRANSFER-STUDENT',
            first_name='Aina',
            last_name='Rasoanaivo',
            classe=self.current_class,
            date_inscription='2026-09-01',
            statut=Etudiant.StudentStatus.ENROLLED,
            actif=True,
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            classe=self.current_class,
            academic_year='2026-2027',
        )

    def authenticate(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=user).key}')

    def create_request(self):
        return self.client.post(reverse('student-transfer-request-list'), {
            'student': self.student.id,
            'target_class': self.target_class.id,
            'academic_year': '2026-2027',
            'reason': 'Déménagement de la famille.',
        }, format='json')

    def test_secretariat_can_request_transfer_and_admin_can_approve_with_history_and_audit(self):
        self.authenticate(self.secretary)
        requested = self.create_request()

        self.assertEqual(requested.status_code, 201)
        transfer_request = StudentTransferRequest.objects.get(id=requested.data['id'])
        self.assertEqual(transfer_request.requested_by, self.secretary)
        self.assertEqual(
            self.client.get(reverse('student-transfer-request-list')).data['results'][0]['id'],
            transfer_request.id,
        )

        self.authenticate(self.admin)
        approved = self.client.post(
            reverse('student-transfer-request-review', args=[transfer_request.id]),
            {
                'status': StudentTransferRequest.Status.APPROVED,
                'decision_reason': 'Transfert accepté après vérification des places.',
            },
            format='json',
        )

        self.assertEqual(approved.status_code, 200)
        self.student.refresh_from_db()
        self.enrollment.refresh_from_db()
        transfer_request.refresh_from_db()
        self.assertEqual(self.student.classe, self.target_class)
        self.assertEqual(self.enrollment.classe, self.target_class)
        self.assertEqual(transfer_request.reviewed_by, self.admin)
        self.assertTrue(StudentClassHistory.objects.filter(
            student=self.student,
            classe=self.target_class,
            academic_year='2026-2027',
            change_type=StudentClassHistory.ChangeType.TRANSFER,
        ).exists())
        self.assertTrue(AuditLog.objects.filter(
            entity_type='StudentTransferRequest',
            entity_id=str(transfer_request.id),
            actor=self.admin,
            reason='Transfert accepté après vérification des places.',
        ).exists())

    def test_request_rejects_invalid_duplicate_and_full_class_cases(self):
        self.authenticate(self.secretary)
        invalid = self.client.post(reverse('student-transfer-request-list'), {
            'student': 'invalid',
            'target_class': self.target_class.id,
            'reason': 'Motif',
        }, format='json')
        self.assertEqual(invalid.status_code, 400)

        first_request = self.create_request()
        self.assertEqual(first_request.status_code, 201)
        duplicate = self.create_request()
        self.assertEqual(duplicate.status_code, 409)

        other_class = Classe.objects.create(
            nom='1ere C',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=1,
        )
        Etudiant.objects.create(
            matricule='TRANSFER-OCCUPANT',
            first_name='Miora',
            last_name='R.',
            classe=other_class,
            date_inscription='2026-09-01',
        )
        full_class = self.client.post(reverse('student-transfer-request-list'), {
            'student': self.student.id,
            'target_class': other_class.id,
            'reason': 'Déménagement.',
            'academic_year': '2026-2027',
        }, format='json')
        self.assertEqual(full_class.status_code, 409)

    def test_admin_rejection_is_traced_and_decisions_cannot_be_repeated(self):
        self.authenticate(self.secretary)
        response = self.create_request()
        transfer_request_id = response.data['id']

        self.authenticate(self.admin)
        url = reverse('student-transfer-request-review', args=[transfer_request_id])
        missing_reason = self.client.post(url, {
            'status': StudentTransferRequest.Status.REJECTED,
        }, format='json')
        self.assertEqual(missing_reason.status_code, 400)
        self.assertEqual(self.client.post(url, {
            'status': StudentTransferRequest.Status.REJECTED,
            'decision_reason': 'Capacité indisponible.',
        }, format='json').status_code, 200)
        self.assertEqual(self.client.post(url, {
            'status': StudentTransferRequest.Status.APPROVED,
            'decision_reason': 'Décision déjà prise.',
        }, format='json').status_code, 400)

        transfer_request = StudentTransferRequest.objects.get(id=transfer_request_id)
        self.assertEqual(transfer_request.status, StudentTransferRequest.Status.REJECTED)
        self.assertEqual(self.student.classe, self.current_class)
        self.assertTrue(AuditLog.objects.filter(
            entity_type='StudentTransferRequest',
            entity_id=str(transfer_request.id),
            reason='Capacité indisponible.',
        ).exists())

    def test_approval_rechecks_capacity_and_secreteriat_cannot_decide(self):
        self.target_class.capacite = 1
        self.target_class.save(update_fields=['capacite'])
        self.authenticate(self.secretary)
        response = self.create_request()
        transfer_request_id = response.data['id']

        forbidden = self.client.post(
            reverse('student-transfer-request-review', args=[transfer_request_id]),
            {
                'status': StudentTransferRequest.Status.APPROVED,
                'decision_reason': 'Pas autorisé.',
            },
            format='json',
        )
        self.assertEqual(forbidden.status_code, 403)
        Etudiant.objects.create(
            matricule='TRANSFER-LATE-OCCUPANT',
            first_name='Lova',
            last_name='R.',
            classe=self.target_class,
            date_inscription='2026-09-01',
        )

        self.authenticate(self.admin)
        full = self.client.post(
            reverse('student-transfer-request-review', args=[transfer_request_id]),
            {
                'status': StudentTransferRequest.Status.APPROVED,
                'decision_reason': 'Réévaluation.',
            },
            format='json',
        )
        self.assertEqual(full.status_code, 409)
        self.student.refresh_from_db()
        self.assertEqual(self.student.classe, self.current_class)
        self.assertEqual(
            StudentTransferRequest.objects.get(id=transfer_request_id).status,
            StudentTransferRequest.Status.PENDING,
        )

    def test_approval_rejects_request_when_student_has_moved_since_request(self):
        self.authenticate(self.secretary)
        response = self.create_request()
        transfer_request_id = response.data['id']
        intervening_class = Classe.objects.create(
            nom='1ere C',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=30,
        )
        self.student.classe = intervening_class
        self.student.save(update_fields=['classe'])
        self.enrollment.classe = intervening_class
        self.enrollment.save(update_fields=['classe'])

        self.authenticate(self.admin)
        approval = self.client.post(
            reverse('student-transfer-request-review', args=[transfer_request_id]),
            {
                'status': StudentTransferRequest.Status.APPROVED,
                'decision_reason': 'Vérification de la classe actuelle.',
            },
            format='json',
        )

        self.assertEqual(approval.status_code, 400)
        self.student.refresh_from_db()
        self.assertEqual(self.student.classe, intervening_class)
        self.assertEqual(
            StudentTransferRequest.objects.get(id=transfer_request_id).status,
            StudentTransferRequest.Status.PENDING,
        )

    def test_legacy_transfer_endpoint_creates_request_for_secretariat(self):
        self.authenticate(self.secretary)
        response = self.client.post(
            reverse('etudiant-transfer', args=[self.student.id]),
            {
                'target_class_id': self.target_class.id,
                'academic_year': '2026-2027',
                'reason': 'Réorganisation familiale.',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.student.classe, self.current_class)
        self.assertEqual(StudentTransferRequest.objects.count(), 1)
