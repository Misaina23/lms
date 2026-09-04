from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BudgetCategoryViewSet, BudgetItemViewSet, BudgetSummaryViewSet, BudgetReportViewSet
)

router = DefaultRouter()
router.register(r'categories', BudgetCategoryViewSet, basename='budget-category')
router.register(r'items', BudgetItemViewSet, basename='budget-item')
router.register(r'summaries', BudgetSummaryViewSet, basename='budget-summary')
router.register(r'reports', BudgetReportViewSet, basename='budget-report')

urlpatterns = [
    path('', include(router.urls)),
]