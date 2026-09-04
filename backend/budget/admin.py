from django.contrib import admin
from .models import BudgetCategory, BudgetItem, BudgetSummary, BudgetReport


@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_type', 'is_system', 'created_at']
    list_filter = ['category_type', 'is_system']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'is_system']


@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'item_type', 'category', 'academic_year', 'date', 'amount', 'devise', 'is_validated', 'created_at']
    list_filter = ['item_type', 'category', 'academic_year', 'revenue_source', 'expense_type', 'is_validated']
    search_fields = ['description', 'designation', 'reference_number']
    readonly_fields = ['id', 'created_at', 'updated_at', 'created_by', 'validated_by', 'is_validated']
    date_hierarchy = 'date'
    raw_id_fields = ['category', 'created_by', 'validated_by', 'related_enrollment']


@admin.register(BudgetSummary)
class BudgetSummaryAdmin(admin.ModelAdmin):
    list_display = ['academic_year', 'total_revenue', 'total_expense', 'balance', 'last_calculated']
    readonly_fields = ['last_calculated']


@admin.register(BudgetReport)
class BudgetReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'academic_year', 'period_type', 'period_start', 'period_end', 'status', 'generated_by', 'created_at']
    list_filter = ['academic_year', 'period_type', 'status']
    readonly_fields = ['id', 'created_at', 'completed_at', 'generated_by', 'data_json']
    date_hierarchy = 'created_at'