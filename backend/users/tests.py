from django.contrib.auth import authenticate
from django.core.cache import cache
from django.core import mail
from django.test import override_settings
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

    def test_public_registration_accepts_portal_roles(self):
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
        self.assertEqual(response.status_code, 201)
        self.assertTrue(CustomUser.objects.filter(email='selfadmin@lycee.com').exists())
        self.assertEqual(CustomUser.objects.get(email='selfadmin@lycee.com').status, CustomUser.Status.PENDING_VERIFICATION)

    def test_registration_options_exposes_all_portal_signup_roles(self):
        self.client.credentials()
        response = self.client.get(reverse('registration-options'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data['roles'],
            [
                {'value': CustomUser.Role.PROFESSEUR, 'label': 'Professeur'},
                {'value': CustomUser.Role.ADMIN, 'label': 'Administrateur'},
                {'value': CustomUser.Role.SURVEILLANT, 'label': 'Surveillant'},
            ],
        )

    def test_user_directory_requires_staff_authentication(self):
        self.client.credentials()
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_non_portal_roles(self):
        self.client.credentials()
        student = CustomUser.objects.create_user(
            username='student-portal-block',
            email='student-portal-block@lycee.com',
            password='StrongPassw0rd!',
            first_name='Student',
            last_name='User',
            matricule='ELEVE001',
            role=CustomUser.Role.ELEVE,
            status=CustomUser.Status.ACTIVE,
        )

        response = self.client.post(reverse('login'), {
            'email': student.email,
            'password': 'StrongPassw0rd!',
        })

        self.assertEqual(response.status_code, 403)
        self.assertIn('autorisé', response.data['detail'])
        self.assertFalse(Token.objects.filter(user=student).exists())


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='http://localhost:3000',
    DEFAULT_FROM_EMAIL='Lycée Midongy Sud <noreply@example.com>',
    REST_FRAMEWORK={'DEFAULT_THROTTLE_RATES': {'password_reset': '100/hour'}},
)
class PasswordResetAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = CustomUser.objects.create_user(
            username='reset-user',
            email='reset@example.com',
            password='OriginalPassw0rd!',
            first_name='Reset',
            last_name='User',
            matricule='RESET001',
            role=CustomUser.Role.PROFESSEUR,
        )

    def setUp(self):
        cache.clear()

    def test_reset_request_sends_link_to_frontend(self):
        response = self.client.post(reverse('password-reset'), {'email': self.user.email})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('/reset-password?uid=', mail.outbox[0].body)
        self.assertIn('token=', mail.outbox[0].body)

    def test_reset_request_does_not_disclose_unknown_email(self):
        known = self.client.post(reverse('password-reset'), {'email': self.user.email})
        unknown = self.client.post(reverse('password-reset'), {'email': 'unknown@example.com'})

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend',
        EMAIL_HOST='',
    )
    def test_reset_request_reports_missing_production_mail_configuration(self):
        response = self.client.post(reverse('password-reset'), {'email': self.user.email})

        self.assertEqual(response.status_code, 503)
        self.assertIn('n’est pas encore configurée', response.data['detail'])

    def test_reset_confirmation_changes_password_and_invalidates_token(self):
        self.client.post(reverse('password-reset'), {'email': self.user.email})
        reset_link = next(
            line for line in mail.outbox[0].body.splitlines()
            if '/reset-password?' in line
        )
        query = reset_link.split('?', 1)[1]
        uid, token = [part.split('=', 1)[1] for part in query.split('&')]
        payload = {'uid': uid, 'token': token, 'password': 'NewStrongPassw0rd!'}

        response = self.client.post(reverse('password-reset-confirm'), payload)

        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(authenticate(username=self.user.email, password=payload['password']))
        self.assertEqual(self.client.post(reverse('password-reset-confirm'), payload).status_code, 400)

    def test_reset_confirmation_rejects_weak_password(self):
        self.client.post(reverse('password-reset'), {'email': self.user.email})
        reset_link = next(
            line for line in mail.outbox[0].body.splitlines()
            if '/reset-password?' in line
        )
        query = reset_link.split('?', 1)[1]
        uid, token = [part.split('=', 1)[1] for part in query.split('&')]

        response = self.client.post(reverse('password-reset-confirm'), {
            'uid': uid,
            'token': token,
            'password': '123456',
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn('mot de passe', response.data['detail'].lower())
