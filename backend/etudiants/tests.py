from datetime import date
from io import StringIO

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
from .models import Etudiant, Enrollment, Notification, StudentOfficePass, CertificateRequest, Deliberation


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
