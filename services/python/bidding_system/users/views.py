from django.conf import settings
from django.core.exceptions import ValidationError, PermissionDenied
from django.core.mail import send_mail
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.http import JsonResponse
from rest_framework import status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView
from .serializers import ChangePasswordSerializer, CustomTokenObtainPairSerializer, UserSerializer
from .models import User

signer = TimestampSigner()

def generate_verification_token(email):
    token = signer.sign(email)
    return token

def decode_verification_token(token, max_age=3600):
    try:
        email = signer.unsign(token, max_age=max_age)
        return email
    except (BadSignature, SignatureExpired):
        return None

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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        password = request.data.get('password')
        if password:
            user.set_password(password)
            user.save()

        token = generate_verification_token(user.email)
        verification_url = request.build_absolute_uri(reverse('verify_email', args=[token]))

        try:
            send_mail(
                'Verify your email',
                f'Please verify your email by clicking the following link: {verification_url}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            user.delete()
            raise ValidationError(f"Error sending verification email: {str(e)}")

        return Response({'status': 'User created, verification email sent'}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance != request.user and not request.user.is_staff:
            raise PermissionDenied("You do not have permission to view this profile.")
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


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

class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data, context={'user': user})
        
        if serializer.is_valid():
            user_auth = user.user_authentication
            if not user_auth or user_auth.security_question_ans != serializer.validated_data['security_question_ans']:
                raise PermissionDenied("Security question answer is incorrect.")

            user.set_password(serializer.validated_data['new_password'])
            user.save()

            return Response({'status': 'Password has been changed successfully.'}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    def get(self, request, token):
        email = decode_verification_token(token)
        if email:
            try:
                user = User.objects.get(email=email)
                user.verified = True
                user.save()
                return Response({'status': 'Email verified'}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
