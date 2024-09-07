from core.models import Auction,Item
from rest_framework import serializers
class AuctionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auction
        fields = ['id','user','auction_style','auction_category','auction_type','auction_description','starting_bid','increment_amount','bid_starting_time','bid_closing_time']
class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'auction', 'item_name', 'preview_image', 'images_url']