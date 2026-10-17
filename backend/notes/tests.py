from decimal import Decimal

from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import CustomUser
from classes.models import Classe, MatiereCoefficient, SchoolConfig, TeacherAssignment
from etudiants.models import Etudiant
from matieres.models import Matiere, ExamPeriod
from .models import Note


class NoteViewSetTests(APITestCase):
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
        cls.matiere = Matiere.objects.create(nom='Mathématiques', code='MATH')
        cls.exam_period = ExamPeriod.objects.create(
            code='T1',
            label='Trimestre 1',
            period_type=ExamPeriod.PeriodType.TRIMESTRE_1,
            academic_year='2024-2025',
            start_date='2024-10-01',
            end_date='2024-12-31',
        )
        cls.note = Note.objects.create(
            etudiant=cls.etudiant,
            matiere=cls.matiere,
            professeur=cls.professeur,
            exam_period=cls.exam_period,
            score_1=14.50,
            coefficient=2.00,
            date_evaluation='2024-10-01',
        )

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_notes(self):
        url = reverse('note-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_note(self):
        url = reverse('note-list')
        second_period = ExamPeriod.objects.create(
            code='T2',
            label='Trimestre 2',
            period_type=ExamPeriod.PeriodType.TRIMESTRE_2,
            academic_year='2024-2025',
            start_date='2025-01-01',
            end_date='2025-03-31',
        )
        data = {
            'etudiant': self.etudiant.id,
            'matiere': self.matiere.id,
            'professeur': self.professeur.id,
            'exam_period': second_period.id,
            'score_1': 16.00,
            'coefficient': 1.00,
            'date_evaluation': '2024-10-05',
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Note.objects.count(), 2)

    def test_create_note_uses_coefficient_configured_for_class(self):
        second_period = ExamPeriod.objects.create(
            code='T2',
            label='Trimestre 2',
            period_type=ExamPeriod.PeriodType.TRIMESTRE_2,
            academic_year='2024-2025',
            start_date='2025-01-01',
            end_date='2025-03-31',
        )
        MatiereCoefficient.objects.create(
            matiere=self.matiere,
            classe=self.classe,
            niveau=self.classe.niveau,
            stream=self.classe.stream,
            coefficient='5.00',
        )

        response = self.client.post(reverse('note-list'), {
            'etudiant': self.etudiant.id,
            'matiere': self.matiere.id,
            'professeur': self.professeur.id,
            'exam_period': second_period.id,
            'score_1': '16.00',
            'coefficient': '1.00',
            'date_evaluation': '2025-01-05',
        })

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['coefficient'], '5.00')
        self.assertEqual(
            Note.objects.get(exam_period=second_period).coefficient,
            Decimal('5.00'),
        )

    def test_exam_period_can_configure_one_note_for_an_academic_year(self):
        response = self.client.post(reverse('exam-period-list'), {
            'code': '26T1',
            'label': 'Trimestre 1',
            'period_type': ExamPeriod.PeriodType.TRIMESTRE_1,
            'academic_year': '2026-2027',
            'start_date': '2026-09-01',
            'end_date': '2026-12-20',
            'number_of_notes': 1,
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['number_of_notes'], 1)
        self.assertEqual(response.data['weight_note_1'], '1.00')
        self.assertEqual(response.data['weight_note_2'], '0.00')

    def test_exam_period_type_uses_academic_year_configuration(self):
        SchoolConfig.objects.create(
            academic_year='2026-2027',
            evaluation_period_type=SchoolConfig.EvaluationPeriodType.BIMESTRE,
        )
        period_data = {
            'code': '26B1',
            'label': 'Bimestre 1',
            'period_type': 'B1',
            'academic_year': '2026-2027',
            'start_date': '2026-09-01',
            'end_date': '2026-10-31',
        }
        accepted = self.client.post(reverse('exam-period-list'), period_data)

        self.assertEqual(accepted.status_code, 201, accepted.data)
        self.assertEqual(accepted.data['period_type'], 'B1')

        rejected = self.client.post(reverse('exam-period-list'), {
            **period_data,
            'code': '26T1',
            'label': 'Trimestre 1',
            'period_type': 'T1',
        })
        self.assertEqual(rejected.status_code, 400)
        self.assertIn('period_type', rejected.data)

    def test_teacher_cannot_submit_note_for_unassigned_class(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')
        response = self.client.post(reverse('note-list'), {
            'etudiant': self.etudiant.id,
            'matiere': self.matiere.id,
            'exam_period': self.exam_period.id,
            'score_1': 16.00,
            'coefficient': 1.00,
            'date_evaluation': '2024-10-05',
        })
        self.assertEqual(response.status_code, 400)

    def test_retrieve_note(self):
        url = reverse('note-detail', args=[self.note.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['score_1'], '14.50')

    def test_reports_aggregate_validated_results_by_class_and_subject(self):
        self.note.score_1 = '8.00'
        self.note.coefficient = '2.00'
        self.note.status = Note.Status.APPROVED
        self.note.save()
        second_student = Etudiant.objects.create(
            matricule='ELV002',
            first_name='Paul',
            last_name='Rabe',
            classe=self.classe,
            date_inscription='2024-09-01',
            actif=True,
        )
        Note.objects.create(
            etudiant=second_student,
            matiere=self.matiere,
            professeur=self.professeur,
            exam_period=self.exam_period,
            score_1='12.00',
            coefficient='1.00',
            date_evaluation='2024-10-02',
            status=Note.Status.LOCKED,
        )
        Note.objects.create(
            etudiant=second_student,
            matiere=Matiere.objects.create(nom='Français', code='FR'),
            professeur=self.professeur,
            exam_period=self.exam_period,
            score_1='10.50',
            coefficient='1.00',
            date_evaluation='2024-10-03',
            status=Note.Status.APPROVED,
        )

        response = self.client.get(reverse('note-reports'), {
            'exam_period': self.exam_period.id,
            'threshold': '9.75',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['summary'], {
            'student_count': 2,
            'subject_class_count': 2,
            'note_count': 3,
            'average': '9.62',
            'passed_count': 2,
            'pass_rate': '66.67',
        })
        mathematics = next(
            row for row in response.data['results']
            if row['subject_id'] == self.matiere.id
        )
        self.assertEqual(mathematics['average'], '9.33')
        self.assertEqual(mathematics['pass_rate'], '50.00')
        self.assertEqual(mathematics['student_count'], 2)

    def test_reports_validate_threshold_and_require_a_valid_period(self):
        invalid_threshold = self.client.get(reverse('note-reports'), {
            'exam_period': self.exam_period.id,
            'threshold': 'NaN',
        })
        self.assertEqual(invalid_threshold.status_code, 400)
        self.assertIn('threshold', invalid_threshold.data)

        invalid_period = self.client.get(reverse('note-reports'), {
            'exam_period': '999999',
        })
        self.assertEqual(invalid_period.status_code, 400)
        self.assertIn('exam_period', invalid_period.data)

    def test_teacher_submits_note_and_admin_approves_it(self):
        TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=self.matiere,
            academic_year='2024-2025',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')

        submitted = self.client.post(reverse('note-submit', args=[self.note.id]))

        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.data['status'], Note.Status.SUBMITTED)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

        approved = self.client.post(reverse('note-approve', args=[self.note.id]))

        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.data['status'], Note.Status.APPROVED)

    def test_teacher_reports_include_only_their_assigned_class_and_subject(self):
        self.note.status = Note.Status.APPROVED
        self.note.save()
        other_class = Classe.objects.create(
            nom='6eme B',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            capacite=40,
            academic_year='2024-2025',
        )
        other_student = Etudiant.objects.create(
            matricule='ELV-OTHER-CLASS',
            first_name='Aro',
            last_name='Other',
            classe=other_class,
            date_inscription='2024-09-01',
            actif=True,
        )
        Note.objects.create(
            etudiant=other_student,
            matiere=self.matiere,
            professeur=self.professeur,
            exam_period=self.exam_period,
            score_1='18.00',
            coefficient='1.00',
            date_evaluation='2024-10-02',
            status=Note.Status.APPROVED,
        )
        TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=self.matiere,
            academic_year='2024-2025',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')

        response = self.client.get(reverse('note-reports'), {
            'exam_period': self.exam_period.id,
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['summary']['note_count'], 1)
        self.assertEqual(response.data['results'][0]['class_id'], self.classe.id)

    def test_teacher_cannot_edit_note_after_submission(self):
        self.note.status = Note.Status.SUBMITTED
        self.note.save()
        TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=self.matiere,
            academic_year='2024-2025',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')

        response = self.client.patch(reverse('note-detail', args=[self.note.id]), {'score_1': '18.00'})

        self.assertEqual(response.status_code, 400)
