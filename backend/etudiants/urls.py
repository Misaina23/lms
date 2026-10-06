from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EtudiantViewSet, EnrollmentViewSet, StudentOrientationViewSet, AuditLogViewSet, NotificationViewSet, StudentOfficePassViewSet

router = DefaultRouter()
router.register(r'etudiants', EtudiantViewSet, basename='etudiant')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'orientations', StudentOrientationViewSet, basename='orientation')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'office-passes', StudentOfficePassViewSet, basename='office-pass')

urlpatterns = [
    path('', include(router.urls)),
]
