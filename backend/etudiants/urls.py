from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EtudiantViewSet

router = DefaultRouter()
router.register(r'etudiants', EtudiantViewSet, basename='etudiant')

urlpatterns = [
    path('', include(router.urls)),
]
