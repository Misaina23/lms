from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework.reverse import reverse

from classes.models import SchoolConfig
from budget.models import BudgetCategory, BudgetItem, BudgetSummary

User = get_user_model()


class BudgetModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='ADMIN',
            matricule='ADM001',
        )
        self.category = BudgetCategory.objects.create(
            name='Scolarité élèves',
            category_type='REVENUE',
            is_system=True,
        )
        self.academic_year = '2024-2025'

    def test_create_budget_item(self):
        item = BudgetItem.objects.create(
            item_type=BudgetItem.ItemType.REVENUE,
            category=self.category,
            academic_year=self.academic_year,
            date='2024-10-01',
            amount=Decimal('100000'),
            description='Test revenue',
            created_by=self.user,
        )
        self.assertEqual(str(item), f"+ {item.amount} {item.devise} - {self.category.name} ({item.date})")

    def test_budget_summary_recalculate(self):
        BudgetItem.objects.create(
            item_type=BudgetItem.ItemType.REVENUE,
            category=self.category,
            academic_year=self.academic_year,
            date='2024-10-01',
            amount=Decimal('100000'),
            created_by=self.user,
        )
        expense_category = BudgetCategory.objects.create(
            name='Matériel ménage',
            category_type='EXPENSE',
        )
        BudgetItem.objects.create(
            item_type=BudgetItem.ItemType.EXPENSE,
            category=expense_category,
            academic_year=self.academic_year,
            date='2024-10-02',
            amount=Decimal('50000'),
            created_by=self.user,
        )
        
        summary = BudgetSummary.objects.create(academic_year=self.academic_year)
        summary.recalculate()
        
        self.assertEqual(summary.total_revenue, Decimal('100000'))
        self.assertEqual(summary.total_expense, Decimal('50000'))
        self.assertEqual(summary.balance, Decimal('50000'))


class BudgetAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            role='ADMIN',
            matricule='ADM001',
        )
        self.category = BudgetCategory.objects.create(
            name='Scolarité élèves',
            category_type='REVENUE',
        )
        SchoolConfig.objects.create(
            academic_year='2024-2025',
            school_name='Test School',
        )

    def test_list_categories(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/budget/categories/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_budget_item(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'item_type': 'REVENUE',
            'category': self.category.id,
            'academic_year': '2024-2025',
            'date': '2024-10-01',
            'amount': '100000',
            'devise': 'MGA',
            'description': 'Test revenue',
        }
        response = self.client.post('/api/budget/items/', data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['amount'], '100000.00')
        self.assertEqual(response.data['devise'], 'MGA')

    def test_export_pdf(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/budget/items/export_pdf/?academic_year=2024-2025')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_export_excel(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/budget/items/export_excel/?academic_year=2024-2025')
        self.assertEqual(response.status_code, 200)
        self.assertIn('spreadsheet', response['Content-Type'])

    def test_export_csv(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/budget/items/export_csv/?academic_year=2024-2025')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response['Content-Type'])


class BudgetReportTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            role='ADMIN',
            matricule='ADM001',
        )
        self.category = BudgetCategory.objects.create(
            name='Scolarité élèves',
            category_type='REVENUE',
        )

    def test_generate_report(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'academic_year': '2024-2025',
            'period_type': 'MONTHLY',
        }
        response = self.client.post('/api/budget/items/generate_report/', data)
        self.assertEqual(response.status_code, 201)
        self.assertIn('id', response.data)


class MobileRBACTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher',
            email='teacher@example.com',
            password='teacherpass123',
            first_name='Teacher',
            last_name='User',
            role='PROFESSEUR',
            matricule='TCH001',
        )
        self.surveillant = User.objects.create_user(
            username='surveillant',
            email='surveillant@example.com',
            password='survpass123',
            first_name='Surveillant',
            last_name='User',
            role='SURVEILLANT',
            matricule='SUR001',
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            role='ADMIN',
            matricule='ADM001',
        )

    def test_teacher_cannot_see_other_grades(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get('/api/notes/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 0)

    def test_surveillant_can_view_schedule(self):
        self.client.force_authenticate(user=self.surveillant)
        response = self.client.get('/api/timetable/')
        self.assertEqual(response.status_code, 200)

    def test_surveillant_can_view_chat(self):
        self.client.force_authenticate(user=self.surveillant)
        response = self.client.get('/api/chat-groups/')
        self.assertEqual(response.status_code, 200)