from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('classes.urls')),
    path('api/', include('matieres.urls')),
    path('api/', include('etudiants.urls')),
    path('api/', include('notes.urls')),
    path('api/', include('absences.urls')),
    path('api/', include('timetable.urls')),
    path('api/', include('messaging.urls')),
    path('api/', include('budget.urls')),
]
