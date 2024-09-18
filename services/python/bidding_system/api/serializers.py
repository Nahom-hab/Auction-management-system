from core.models import Auction,Item
from rest_framework import serializers
class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'item_name', 'preview_image', 'images_url']
class AuctionSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only = True)
    items = ItemSerializer(many = True,read_only = True)
    class Meta:
        model = Auction
        fields = ['id','user','auction_style','auction_category','auction_type','auction_description','starting_bid','increment_amount','bid_starting_time','bid_closing_time','items','status']
        read_only_fields = ['user']
    def create(self, validated_data):
        request = self.context.get('request')  
        validated_data['user'] = request.user 
        return super().create(validated_data)