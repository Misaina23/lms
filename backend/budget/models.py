import uuid
from django.db import models
from users.models import CustomUser
from classes.models import SchoolConfig


class BudgetCategory(models.Model):
    """Categories for budget items (revenue and expense)."""
    class CategoryType(models.TextChoices):
        REVENUE = 'REVENUE', 'Recette'
        EXPENSE = 'EXPENSE', 'Dépense'

    name = models.CharField(max_length=100, unique=True)
    category_type = models.CharField(max_length=10, choices=CategoryType.choices)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False, help_text="System categories cannot be deleted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category_type', 'name']
        verbose_name = 'Catégorie budgétaire'
        verbose_name_plural = 'Catégories budgétaires'

    def __str__(self):
        return f"{self.get_category_type_display()} - {self.name}"


class BudgetItem(models.Model):
    """Individual budget line item (revenue or expense)."""
    class ItemType(models.TextChoices):
        REVENUE = 'REVENUE', 'Recette'
        EXPENSE = 'EXPENSE', 'Dépense'

    class RevenueSource(models.TextChoices):
        TUITION = 'TUITION', 'Scolarité élève'
        SUBSIDY = 'SUBSIDY', 'Subvention'
        DONATION = 'DONATION', 'Don'
        OTHER_REVENUE = 'OTHER_REVENUE', 'Autre recette'

    class ExpenseType(models.TextChoices):
        CLEANING = 'CLEANING', 'Matériel ménage'
        OFFICE_SUPPLIES = 'OFFICE_SUPPLIES', 'Fournitures bureau (stylos, papier)'
        TEACHER_NON_PERM = 'TEACHER_NON_PERM', 'Paiement enseignants non-fonctionnaires'
        SURVEILLANT = 'SURVEILLANT', 'Paiement surveillants'
        GUARD = 'GUARD', 'Paiement gardiens'
        SPORTS_EQUIPMENT = 'SPORTS_EQUIPMENT', 'Matériel sportif'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance/réparations'
        UTILITIES = 'UTILITIES', 'Eau/électricité/internet'
        OTHER_EXPENSE = 'OTHER_EXPENSE', 'Autre dépense'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_type = models.CharField(max_length=10, choices=ItemType.choices)
    category = models.ForeignKey(BudgetCategory, on_delete=models.PROTECT, related_name='items')
    academic_year = models.CharField(max_length=9, help_text="Format: YYYY-YYYY (ex: 2024-2025)")
    date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    devise = models.CharField(max_length=3, default='MGA')
    description = models.TextField(blank=True)
    designation = models.CharField(max_length=200, blank=True, help_text="Désignation pour subventions/dons")
    reference_number = models.CharField(max_length=100, blank=True, help_text="Numéro de pièce justificative")
    attachment = models.FileField(upload_to='budget/', null=True, blank=True)

    revenue_source = models.CharField(
        max_length=20,
        choices=RevenueSource.choices,
        blank=True,
        null=True,
    )
    expense_type = models.CharField(
        max_length=20,
        choices=ExpenseType.choices,
        blank=True,
        null=True,
    )

    related_enrollment = models.ForeignKey(
        'etudiants.Enrollment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='budget_items',
        help_text="Lien automatique avec l'inscription pour les paiements de scolarité"
    )
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='budget_items_created',
    )
    validated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='budget_items_validated',
    )
    is_validated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = 'Ligne budgétaire'
        verbose_name_plural = 'Lignes budgétaires'
        indexes = [
            models.Index(fields=['academic_year', 'item_type', 'date']),
            models.Index(fields=['category', 'item_type']),
        ]

    def __str__(self):
        prefix = '+' if self.item_type == 'REVENUE' else '-'
        return f"{prefix} {self.amount} {self.devise} - {self.category.name} ({self.date})"

    def save(self, *args, **kwargs):
        if self.item_type == 'REVENUE' and not self.revenue_source:
            self.revenue_source = self.RevenueSource.OTHER_REVENUE
        if self.item_type == 'EXPENSE' and not self.expense_type:
            self.expense_type = self.ExpenseType.OTHER_EXPENSE
        super().save(*args, **kwargs)


class BudgetSummary(models.Model):
    """Aggregated budget summary per academic year."""
    academic_year = models.CharField(max_length=9, unique=True)
    total_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_expense = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bilan budgétaire'
        verbose_name_plural = 'Bilans budgétaires'

    def __str__(self):
        return f"Budget {self.academic_year} - Solde: {self.balance} XOF"

    def recalculate(self):
        from django.db.models import Sum, Q
        revenue = BudgetItem.objects.filter(
            academic_year=self.academic_year,
            item_type=BudgetItem.ItemType.REVENUE
        ).aggregate(total=Sum('amount'))['total'] or 0
        expense = BudgetItem.objects.filter(
            academic_year=self.academic_year,
            item_type=BudgetItem.ItemType.EXPENSE
        ).aggregate(total=Sum('amount'))['total'] or 0
        self.total_revenue = revenue
        self.total_expense = expense
        self.balance = revenue - expense
        self.save()


class BudgetReport(models.Model):
    """Generated budget reports."""
    class Period(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Mensuel'
        QUARTERLY = 'QUARTERLY', 'Trimestriel (3 derniers mois)'
        YEARLY = 'YEARLY', 'Annuel (année scolaire)'

    class Status(models.TextChoices):
        GENERATING = 'GENERATING', 'Génération en cours'
        READY = 'READY', 'Prêt'
        FAILED = 'FAILED', 'Échec'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.CharField(max_length=9)
    period_type = models.CharField(max_length=20, choices=Period.choices)
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.GENERATING)
    file = models.FileField(upload_to='budget/reports/', null=True, blank=True)
    data_json = models.JSONField(null=True, blank=True, help_text="Données du rapport pour affichage web")
    generated_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='budget_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Rapport budgétaire'
        verbose_name_plural = 'Rapports budgétaires'

    def __str__(self):
        return f"Rapport {self.get_period_type_display()} {self.academic_year} ({self.period_start} → {self.period_end})"