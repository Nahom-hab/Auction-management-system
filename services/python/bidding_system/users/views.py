from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from .models import UserAuthentication
from .serializers import CustomTokenObtainPairSerializer, UserSerializer,UserImageSerializer
from django.contrib.auth import get_user_model
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('user_authentication').all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        elif self.action == 'list':
            return [permissions.IsAdminUser()]
        elif self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance != request.user and not request.user.is_staff:
            raise PermissionDenied("You do not have permission to view this profile.")
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        password = request.data.get('password')
        if password:
            user.set_password(password)
            user.save()
        return Response({'status': 'User created'}, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance != request.user and not request.user.is_staff:
            raise PermissionDenied("You do not have permission to update this profile.")
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'status': 'User updated'}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance != request.user and not request.user.is_staff:
            raise PermissionDenied("You do not have permission to delete this profile.")
        self.perform_destroy(instance)
        return Response({'status': 'User deleted'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reset_password(self, request):
        email = request.data.get('email')
        security_answer = request.data.get('user_authentication.security_question_ans')

        new_password = request.data.get('password')

        try:
            user = User.objects.get(email=email)
            user_auth = UserAuthentication.objects.get(user=user)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserAuthentication.DoesNotExist:
            return Response({'error': 'Security question not set'}, status=status.HTTP_400_BAD_REQUEST)

        if user_auth.security_question_ans != security_answer:
            return Response({'error': 'Security question answer is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password:
            user.set_password(new_password)
            user.save()
            return Response({'status': 'Password has been reset.'}, status=status.HTTP_200_OK)

        return Response({'error': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)
class UserImageViewSet(ModelViewSet):
    serializer_class = UserImageSerializer

    def get_queryset(self):
        return User.objects.filter(id=self.kwargs['user_pk'])

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"view": self})
        return context
