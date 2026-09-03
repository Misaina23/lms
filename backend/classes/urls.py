from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ClasseViewSet, RoomViewSet, TeacherAssignmentViewSet,
    MatiereCoefficientViewSet, SchoolConfigViewSet,
)

router = DefaultRouter()
router.register(r'classes', ClasseViewSet, basename='classe')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'teacher-assignments', TeacherAssignmentViewSet, basename='teacher-assignment')
router.register(r'matiere-coefficients', MatiereCoefficientViewSet, basename='matiere-coefficient')
router.register(r'school-config', SchoolConfigViewSet, basename='school-config')

urlpatterns = [
    path('', include(router.urls)),
]
