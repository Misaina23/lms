from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def backend_root(request):
    return Response({
        'status': 'ok',
        'message': 'LMS API is running. Use the /api routes to access the application endpoints.',
        'frontend': 'https://lyceemidongysud.vercel.app',
    })


urlpatterns = [
    path('', backend_root, name='backend-root'),
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
