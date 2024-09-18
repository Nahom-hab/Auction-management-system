from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import UserAuthentication
from django.contrib.auth import get_user_model
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        token['name'] = user.first_name
        token['email'] = user.email

        return token
    
User = get_user_model()

class UserAuthenticationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAuthentication
        fields = ['security_question_ans']

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    verified = serializers.BooleanField(read_only=True)
    user_authentication = UserAuthenticationSerializer(required=True, write_only =True)

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number', 'profile_img_url', 'verified', 'created_at', 'updated_at', 'password','user_authentication']
        read_only_fields = ['id', 'verified', 'created_at', 'updated_at']

    def create(self, validated_data):
        user_auth_data = validated_data.pop('user_authentication', None)
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        if user_auth_data:
            UserAuthentication.objects.create(user=user, **user_auth_data)
        return user

    def update(self, instance, validated_data):
        validated_data.pop('user_authentication', None)
        validated_data.pop('password', None)
        
        instance = super().update(instance, validated_data)
        instance.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):
    security_question_ans = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        user = self.context['user']

        user_auth = user.user_authentication
        if not user_auth or user_auth.security_question_ans != data['security_question_ans']:
            raise serializers.ValidationError("Security question answer is incorrect.")
        return data