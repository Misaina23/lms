from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate
from .models import CustomUser
from .serializers import CustomUserSerializer
from .permissions import IsAdminOrReadOnly


class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role', 'is_active', 'date_of_birth']

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        user = self.get_object()
        if user.role != CustomUser.Role.PROFESSEUR:
            return Response({'detail': 'Cannot approve non-teacher account'}, status=status.HTTP_400_BAD_REQUEST)
        user.status = CustomUser.Status.ACTIVE
        user.is_active = True
        user.save()
        return Response({'status': 'approved', 'user': CustomUserSerializer(user).data})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        user = self.get_object()
        if user.role != CustomUser.Role.PROFESSEUR:
            return Response({'detail': 'Cannot reject non-teacher account'}, status=status.HTTP_400_BAD_REQUEST)
        user.status = CustomUser.Status.REJECTED
        user.is_active = False
        user.save()
        return Response({'status': 'rejected', 'user': CustomUserSerializer(user).data})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@authentication_classes([])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    user = authenticate(request, username=email, password=password)
    if user is not None:
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': CustomUserSerializer(user).data})
    return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
