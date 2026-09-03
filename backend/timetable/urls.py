from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimetableSlotViewSet

router = DefaultRouter()
router.register(r'slots', TimetableSlotViewSet, basename='timetable-slot')

urlpatterns = [
    path('', include(router.urls)),
]
