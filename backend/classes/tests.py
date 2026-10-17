from decimal import Decimal
from datetime import time

from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from matieres.models import Matiere
from users.models import CustomUser
from .models import Classe, MatiereCoefficient, SchoolConfig, TeacherAssignment
from timetable.models import TimetableSlot


class ClasseViewSetTests(APITestCase):
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

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_classes(self):
        url = reverse('classe-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_classe(self):
        url = reverse('classe-list')
        data = {'nom': '5eme B', 'niveau': Classe.Niveau.SECONDAIRE_GENERAL, 'capacite': 35}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Classe.objects.count(), 2)

    def test_retrieve_classe(self):
        url = reverse('classe-detail', args=[self.classe.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['nom'], '6eme A')


class ClasseBusinessRuleTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = CustomUser.objects.create_user(
            username='coverage-admin',
            email='coverage-admin@lycee.com',
            password='AdminPassword123!',
            first_name='Admin',
            last_name='Coverage',
            matricule='COVADM1',
            role=CustomUser.Role.ADMIN,
        )
        cls.teacher_user = CustomUser.objects.create_user(
            username='coverage-teacher',
            email='coverage-teacher@lycee.com',
            password='TeacherPassword123!',
            first_name='Teacher',
            last_name='Coverage',
            matricule='COVTCH1',
            role=CustomUser.Role.PROFESSEUR,
        )
        cls.admin_token = Token.objects.create(user=cls.admin_user)
        cls.teacher_token = Token.objects.create(user=cls.teacher_user)

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')

    def test_coverage_endpoints_are_not_public_and_reject_non_admins(self):
        for url_name in ('classe-coverage', 'classe-coverage-alerts'):
            with self.subTest(url_name=url_name, role='anonymous'):
                self.client.credentials()
                response = self.client.get(reverse(url_name))
                self.assertEqual(response.status_code, 401)

            with self.subTest(url_name=url_name, role='teacher'):
                self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.teacher_token.key}')
                response = self.client.get(reverse(url_name))
                self.assertEqual(response.status_code, 403)

    def test_matiere_coefficient_is_resolved_by_class_stream(self):
        matiere = Matiere.objects.create(code='MATH', nom='Mathématiques', coefficient=1)
        classe_s = Classe.objects.create(nom='Première S', niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.SCIENTIFIQUE, capacite=30)
        classe_ose = Classe.objects.create(nom='Première OSE', niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.SOCIO_ECONOMIQUE, capacite=30)
        classe_l = Classe.objects.create(nom='Première L', niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.LITTERAIRE, capacite=30)

        MatiereCoefficient.objects.create(matiere=matiere, niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.SCIENTIFIQUE, coefficient=Decimal('5.00'))
        MatiereCoefficient.objects.create(matiere=matiere, niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.SOCIO_ECONOMIQUE, coefficient=Decimal('3.00'))
        MatiereCoefficient.objects.create(matiere=matiere, niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.LITTERAIRE, coefficient=Decimal('2.00'))

        self.assertEqual(matiere.get_coefficient_for_class(classe_s), Decimal('5.00'))
        self.assertEqual(matiere.get_coefficient_for_class(classe_ose), Decimal('3.00'))
        self.assertEqual(matiere.get_coefficient_for_class(classe_l), Decimal('2.00'))

    def test_class_coefficient_overrides_stream_coefficient(self):
        matiere = Matiere.objects.create(code='ANGL', nom='Anglais', coefficient=1)
        premiere_s = Classe.objects.create(
            nom='Première S',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            capacite=30,
        )
        terminale_s = Classe.objects.create(
            nom='Terminale S',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            capacite=30,
        )
        MatiereCoefficient.objects.create(
            matiere=matiere,
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            coefficient=Decimal('2.00'),
        )
        MatiereCoefficient.objects.create(
            matiere=matiere,
            classe=premiere_s,
            niveau=premiere_s.niveau,
            stream=premiere_s.stream,
            coefficient=Decimal('3.00'),
        )
        MatiereCoefficient.objects.create(
            matiere=matiere,
            classe=terminale_s,
            niveau=terminale_s.niveau,
            stream=terminale_s.stream,
            coefficient=Decimal('4.00'),
        )

        self.assertEqual(matiere.get_coefficient_for_class(premiere_s), Decimal('3.00'))
        self.assertEqual(matiere.get_coefficient_for_class(terminale_s), Decimal('4.00'))

    def test_matiere_coefficient_api_accepts_multiple_classes_in_same_stream(self):
        matiere = Matiere.objects.create(code='HIST', nom='Histoire', coefficient=1)
        first_class = Classe.objects.create(
            nom='Première S',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            capacite=30,
        )
        second_class = Classe.objects.create(
            nom='Terminale S',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            capacite=30,
        )

        first_response = self.client.post(reverse('matiere-coefficient-list'), {
            'matiere': matiere.id,
            'classe': first_class.id,
            'coefficient': '5.00',
        })
        second_response = self.client.post(reverse('matiere-coefficient-list'), {
            'matiere': matiere.id,
            'classe': second_class.id,
            'coefficient': '2.00',
        })

        self.assertEqual(first_response.status_code, 201, first_response.data)
        self.assertEqual(second_response.status_code, 201, second_response.data)
        self.assertEqual(matiere.get_coefficient_for_class(first_class), Decimal('5.00'))
        self.assertEqual(matiere.get_coefficient_for_class(second_class), Decimal('2.00'))

    def test_school_config_stores_evaluation_period_type_per_year(self):
        response = self.client.post(reverse('school-config-list'), {
            'academic_year': '2026-2027',
            'evaluation_period_type': SchoolConfig.EvaluationPeriodType.BIMESTRE,
        })

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['evaluation_period_type'], 'BIMESTRE')
        self.assertEqual(
            SchoolConfig.objects.get(academic_year='2026-2027').evaluation_period_type,
            SchoolConfig.EvaluationPeriodType.BIMESTRE,
        )

    def test_general_classes_support_multiple_subdivisions(self):
        seconde_a = Classe.objects.create(nom='Seconde A', niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.GENERAL, capacite=35)
        seconde_b = Classe.objects.create(nom='Seconde B', niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.GENERAL, capacite=35)

        self.assertTrue(seconde_a.is_general_subdivision)
        self.assertTrue(seconde_b.is_general_subdivision)
        self.assertEqual(Classe.objects.filter(niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.GENERAL).count(), 2)

    def test_substitute_teacher_assignment_can_cover_missing_subject(self):
        teacher = CustomUser.objects.create_user(
            username='math-cover',
            email='math-cover@lycee.com',
            password='StrongPassw0rd!',
            first_name='Math',
            last_name='Cover',
            matricule='TCHCOV1',
            role=CustomUser.Role.PROFESSEUR,
            status=CustomUser.Status.ACTIVE,
        )
        classe = Classe.objects.create(nom='Première S', niveau=Classe.Niveau.SECONDAIRE_GENERAL, stream=Classe.Stream.SCIENTIFIQUE, capacite=30)
        physique = Matiere.objects.create(code='PHY', nom='Physique', coefficient=4)

        assignment = TeacherAssignment.objects.create(
            professeur=teacher,
            classe=classe,
            matiere=physique,
            academic_year='2024-2025',
            is_main_teacher=False,
            is_substitute=True,
            coverage_reason='Manque de prof titulaire en physique',
        )

        self.assertTrue(assignment.is_substitute)
        self.assertEqual(assignment.coverage_reason, 'Manque de prof titulaire en physique')
        self.assertIn('remplacement', str(assignment))

    def test_coverage_endpoint_lists_missing_subjects_and_suggested_teachers(self):
        classe = Classe.objects.create(
            nom='Terminale A',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            academic_year='2024-2025',
            capacite=30,
        )
        physique = Matiere.objects.create(code='PHY', nom='Physique', coefficient=4)
        maths = Matiere.objects.create(code='MATH', nom='Mathématiques', coefficient=5)
        teacher = CustomUser.objects.create_user(
            username='math-teacher-cover',
            email='math-teacher-cover@lycee.com',
            password='StrongPassw0rd!',
            first_name='Marie',
            last_name='Ndiaye',
            matricule='TCHMATH1',
            role=CustomUser.Role.PROFESSEUR,
            status=CustomUser.Status.ACTIVE,
            matiere=maths,
        )

        response = self.client.get(reverse('classe-coverage'))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data['missing_subjects']) >= 1)
        self.assertIn('suggested_teachers', response.data['missing_subjects'][0])
        math_gap = next(
            item for item in response.data['missing_subjects']
            if item['matiere']['nom'] == 'Mathématiques' and item['classe']['id'] == classe.id
        )
        physics_gap = next(
            item for item in response.data['missing_subjects']
            if item['matiere']['nom'] == 'Physique' and item['classe']['id'] == classe.id
        )
        self.assertTrue(any(t['id'] == teacher.id for t in math_gap['suggested_teachers']))
        self.assertEqual(physics_gap['suggested_teachers'], [])

    def test_coverage_endpoint_prioritizes_best_match_teachers(self):
        classe = Classe.objects.create(
            nom='Première C',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            academic_year='2024-2025',
            capacite=30,
        )
        physique = Matiere.objects.create(code='PHY', nom='Physique', coefficient=4)
        maths = Matiere.objects.create(code='MATH', nom='Mathématiques', coefficient=5)
        matching_teacher = CustomUser.objects.create_user(
            username='physicist-main',
            email='physicist-main@lycee.com',
            password='StrongPassw0rd!',
            first_name='Jean',
            last_name='Lemoine',
            matricule='TCHPHY1',
            role=CustomUser.Role.PROFESSEUR,
            status=CustomUser.Status.ACTIVE,
            matiere=physique,
        )
        fallback_teacher = CustomUser.objects.create_user(
            username='fallback-physic',
            email='fallback-physic@lycee.com',
            password='StrongPassw0rd!',
            first_name='Alice',
            last_name='Dupont',
            matricule='TCHPHY2',
            role=CustomUser.Role.PROFESSEUR,
            status=CustomUser.Status.ACTIVE,
            matiere=maths,
        )
        overloaded_teacher = CustomUser.objects.create_user(
            username='physicist-overloaded',
            email='physicist-overloaded@lycee.com',
            password='StrongPassw0rd!',
            first_name='Amelie',
            last_name='Chargee',
            matricule='TCHPHY3',
            role=CustomUser.Role.PROFESSEUR,
            status=CustomUser.Status.ACTIVE,
            teacher_type=CustomUser.TeacherType.SUPPLEANT,
            matiere=physique,
        )
        for day in (0, 1):
            TimetableSlot.objects.create(
                classe=classe,
                matiere=physique,
                professeur=overloaded_teacher,
                day_of_week=day,
                start_hour=time(8, 0),
                end_hour=time(14, 0),
                academic_year='2024-2025',
            )

        response = self.client.get(reverse('classe-coverage'))
        physics_gap = next(
            item for item in response.data['missing_subjects']
            if item['matiere']['nom'] == 'Physique' and item['classe']['id'] == classe.id
        )

        self.assertTrue(physics_gap['suggested_teachers'])
        self.assertEqual(physics_gap['suggested_teachers'][0]['id'], matching_teacher.id)
        self.assertEqual(
            [teacher['id'] for teacher in physics_gap['suggested_teachers']],
            [matching_teacher.id, overloaded_teacher.id],
        )
        self.assertNotIn(fallback_teacher.id, [teacher['id'] for teacher in physics_gap['suggested_teachers']])
        self.assertEqual(physics_gap['suggested_teachers'][1]['weekly_scheduled_hours'], 12)
        self.assertGreater(
            physics_gap['suggested_teachers'][0]['priority_score'],
            physics_gap['suggested_teachers'][1]['priority_score'],
        )

    def test_coverage_alerts_detect_urgent_missing_subjects(self):
        classe = Classe.objects.create(
            nom='Terminale B',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            academic_year='2024-2025',
            capacite=30,
        )
        Matiere.objects.create(code='CHM', nom='Chimie', coefficient=4)

        response = self.client.get(reverse('classe-coverage-alerts'))

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data['count'], 1)
        self.assertIn('severity', response.data['alerts'][0])
        self.assertIn('recommended_action', response.data['alerts'][0])
