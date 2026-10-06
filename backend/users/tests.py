from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from .models import CustomUser


class CustomUserViewSetTests(APITestCase):
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

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_users(self):
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_user(self):
        url = reverse('user-list')
        data = {
            'username': 'prof1',
            'matricule': 'PRF001',
            'first_name': 'Jean',
            'last_name': 'Dupont',
            'email': 'jean@lycee.com',
            'role': CustomUser.Role.PROFESSEUR,
            'password': 'TeacherPassword123!',
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(CustomUser.objects.count(), 2)

    def test_staff_creation_requires_an_initial_password(self):
        response = self.client.post(reverse('user-list'), {
            'username': 'prof-no-password',
            'matricule': 'PRF002',
            'first_name': 'Marie',
            'last_name': 'Dupont',
            'email': 'marie@lycee.com',
            'role': CustomUser.Role.PROFESSEUR,
        })

        self.assertEqual(response.status_code, 400)
        self.assertFalse(CustomUser.objects.filter(email='marie@lycee.com').exists())

    def test_admin_can_suspend_staff_account(self):
        teacher = CustomUser.objects.create_user(
            username='prof-suspend',
            email='prof-suspend@lycee.com',
            password='TeacherPassword123!',
            first_name='Jean',
            last_name='Dupont',
            matricule='PRF003',
            role=CustomUser.Role.PROFESSEUR,
        )

        response = self.client.post(reverse('user-suspend', args=[teacher.id]))

        self.assertEqual(response.status_code, 200)
        teacher.refresh_from_db()
        self.assertEqual(teacher.status, CustomUser.Status.SUSPENDED)
        self.assertFalse(teacher.is_active)

    def test_retrieve_user(self):
        url = reverse('user-detail', args=[self.admin_user.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'admin@lycee.com')

    def test_public_registration_only_accepts_teacher_role(self):
        self.client.credentials()
        response = self.client.post(reverse('register'), {
            'username': 'selfadmin',
            'matricule': 'ADM002',
            'first_name': 'Self',
            'last_name': 'Admin',
            'email': 'selfadmin@lycee.com',
            'password': 'SafePassword123!',
            'role': CustomUser.Role.ADMIN,
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(CustomUser.objects.filter(email='selfadmin@lycee.com').exists())

    def test_registration_options_only_exposes_teacher_signup(self):
        self.client.credentials()
        response = self.client.get(reverse('registration-options'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data['roles'],
            [{'value': CustomUser.Role.PROFESSEUR, 'label': 'Professeur'}],
        )

    def test_user_directory_requires_staff_authentication(self):
        self.client.credentials()
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, 401)
