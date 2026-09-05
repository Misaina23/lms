from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BudgetCategoryViewSet, BudgetItemViewSet, BudgetSummaryViewSet, BudgetReportViewSet
)

router = DefaultRouter()
router.register(r'budget/categories', BudgetCategoryViewSet, basename='budget-category')
router.register(r'budget/items', BudgetItemViewSet, basename='budget-item')
router.register(r'budget/summaries', BudgetSummaryViewSet, basename='budget-summary')
router.register(r'budget/reports', BudgetReportViewSet, basename='budget-report')

urlpatterns = [
    path('', include(router.urls)),
]