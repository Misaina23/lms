from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from django.test import SimpleTestCase
from users.models import CustomUser
from .models import ExamPeriod, Matiere
from .serializers import ExamPeriodSerializer


class MatiereViewSetTests(APITestCase):
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
        cls.matiere = Matiere.objects.create(nom='Mathématiques', code='MATH')

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_matieres(self):
        url = reverse('matiere-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_matiere(self):
        url = reverse('matiere-list')
        data = {'nom': 'Physique', 'code': 'PHYS'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Matiere.objects.count(), 2)

    def test_retrieve_matiere(self):
        url = reverse('matiere-detail', args=[self.matiere.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['code'], 'MATH')


class ExamPeriodBulletinWeightTests(SimpleTestCase):
    def setUp(self):
        self.period = ExamPeriod(
            code='26T3',
            label='Trimestre 3',
            period_type='T3',
            academic_year='2026-2027',
            start_date='2027-04-01',
            end_date='2027-07-01',
        )

    def test_positive_bulletin_weight_is_valid(self):
        serializer = ExamPeriodSerializer(
            instance=self.period,
            data={'bulletin_weight': '3.00'},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_zero_bulletin_weight_is_rejected(self):
        serializer = ExamPeriodSerializer(
            instance=self.period,
            data={'bulletin_weight': '0.00'},
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('bulletin_weight', serializer.errors)
