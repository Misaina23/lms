from decimal import Decimal

from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from matieres.models import Matiere
from users.models import CustomUser
from .models import Classe, MatiereCoefficient, TeacherAssignment


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
