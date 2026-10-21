from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AbsenceViewSet, TeacherUnavailabilityReportViewSet

router = DefaultRouter()
router.register(r'absences', AbsenceViewSet, basename='absence')
router.register(r'teacher-unavailability-reports', TeacherUnavailabilityReportViewSet, basename='teacher-unavailability-report')

urlpatterns = [
    path('', include(router.urls)),
]
