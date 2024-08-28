from djoser.serializers import UserSerializer as BaseUserSerializer,UserCreateSerializer as BaseUserCreateSerializer

class UserCreatSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        fields = ['id','password','email','first_name','last_name']
class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer):
        fields = ['id','password','email','first_name','last_name']