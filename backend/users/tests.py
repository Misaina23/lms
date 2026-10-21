from datetime import timedelta
from io import BytesIO, StringIO

from django.contrib.auth import authenticate
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from classes.models import Classe, TeacherAssignment
from matieres.models import Matiere
from .models import CustomUser
from .serializers import CustomUserSerializer


def create_valid_photo(name='avatar.png'):
    buffer = BytesIO()
    Image.new('RGB', (10, 10), color='white').save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


class EnsureSuperuserCommandTests(TestCase):
    def test_weak_password_is_rejected_without_creating_admin(self):
        with self.assertRaises(CommandError):
            call_command(
                'ensure_superuser',
                email='new-admin@lycee.com',
                password='123456',
                stdout=StringIO(),
            )

        self.assertFalse(CustomUser.objects.filter(email='new-admin@lycee.com').exists())

    def test_strong_password_creates_admin(self):
        call_command(
            'ensure_superuser',
            email='new-admin@lycee.com',
            password='K7v!nR4$wZ9#qL2p',
            stdout=StringIO(),
        )

        admin = CustomUser.objects.get(email='new-admin@lycee.com')
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password('K7v!nR4$wZ9#qL2p'))


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class LoginProtectionTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='login-protection',
            email='login-protection@lycee.com',
            password='StrongPassw0rd!',
            first_name='Login',
            last_name='Protection',
            matricule='LOGIN001',
            role=CustomUser.Role.ADMIN,
        )
        self.url = reverse('login')

    def test_five_failed_attempts_temporarily_lock_account(self):
        for attempt in range(4):
            response = self.client.post(self.url, {
                'email': self.user.email,
                'password': 'wrong-password',
            })
            self.assertEqual(response.status_code, 400, msg=f'failed attempt {attempt + 1}')

        self.user.refresh_from_db()
        self.assertEqual(self.user.login_failed_attempts, 4)
        response = self.client.post(self.url, {
            'email': self.user.email,
            'password': 'wrong-password',
        })

        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response['Retry-After']), 0)
        self.user.refresh_from_db()
        self.assertEqual(self.user.login_failed_attempts, 0)
        self.assertIsNotNone(self.user.login_locked_until)

        valid_login = self.client.post(self.url, {
            'email': self.user.email,
            'password': 'StrongPassw0rd!',
        })
        self.assertEqual(valid_login.status_code, 429)

    def test_lock_expires_and_successful_login_resets_failed_attempts(self):
        self.user.login_failed_attempts = 3
        self.user.login_locked_until = timezone.now() - timedelta(seconds=1)
        self.user.save(update_fields=['login_failed_attempts', 'login_locked_until'])

        response = self.client.post(self.url, {
            'email': self.user.email,
            'password': 'StrongPassw0rd!',
        })

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.login_failed_attempts, 0)
        self.assertIsNone(self.user.login_locked_until)


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
            'photo': create_valid_photo('teacher.png'),
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

    def test_account_holder_can_be_created_without_a_photo(self):
        serializer = CustomUserSerializer(data={
            'username': 'photo-missing',
            'matricule': 'PRFPHOTO',
            'first_name': 'No',
            'last_name': 'Photo',
            'email': 'no-photo@lycee.com',
            'password': 'StrongPassw0rd!',
            'role': CustomUser.Role.PROFESSEUR,
            'phone': '+261331234567',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

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

    def test_public_registration_rejects_admin_accounts(self):
        self.client.credentials()
        response = self.client.post(reverse('register'), {
            'username': 'selfadmin',
            'matricule': 'ADM002',
            'first_name': 'Self',
            'last_name': 'Admin',
            'email': 'selfadmin@lycee.com',
            'password': 'SafePassword123!',
            'role': CustomUser.Role.ADMIN,
            'photo': create_valid_photo('admin.png'),
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(CustomUser.objects.filter(email='selfadmin@lycee.com').exists())

    def test_registration_options_exposes_only_public_signup_roles(self):
        self.client.credentials()
        response = self.client.get(reverse('registration-options'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data['roles'],
            [
                {'value': CustomUser.Role.PROFESSEUR, 'label': 'Professeur'},
                {'value': CustomUser.Role.SURVEILLANT, 'label': 'Surveillant'},
            ],
        )

    def test_public_registration_requires_matiere_for_teacher_and_creates_coverage_assignment_on_approval(self):
        self.client.credentials()
        matiere = Matiere.objects.create(nom='Physique', code='PHY')
        classe = Classe.objects.create(
            nom='Terminale A',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            stream=Classe.Stream.SCIENTIFIQUE,
            academic_year='2024-2025',
            capacite=30,
        )

        response = self.client.post(reverse('register'), {
            'username': 'teacher-matiere',
            'matricule': 'PRF010',
            'first_name': 'Alice',
            'last_name': 'Martin',
            'email': 'teacher-matiere@lycee.com',
            'password': 'SafePassword123!',
            'role': CustomUser.Role.PROFESSEUR,
            'teacher_type': CustomUser.TeacherType.FONCTIONNAIRE,
            'matiere': matiere.id,
        })

        self.assertEqual(response.status_code, 201)
        user = CustomUser.objects.get(email='teacher-matiere@lycee.com')
        self.assertEqual(user.matiere_id, matiere.id)

        approval_response = self.client.post(reverse('user-approve', args=[user.id]), HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')
        self.assertEqual(approval_response.status_code, 200)
        self.assertTrue(
            TeacherAssignment.objects.filter(
                professeur=user,
                classe=classe,
                matiere=matiere,
                is_substitute=True,
            ).exists()
        )

    def test_user_directory_requires_staff_authentication(self):
        self.client.credentials()
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, 401)

    def test_backend_root_endpoint_is_available(self):
        response = self.client.get('/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'ok')
        self.assertIn('api', response.data['message'])

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
