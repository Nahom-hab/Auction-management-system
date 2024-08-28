from django.contrib import admin
from .models import UserAuthentication, Transaction, Auction, Item, AuctionHistory, Bid, ProxyBidding, Escrow, Feedback, Balance

@admin.register(UserAuthentication)
class UserAuthenticationAdmin(admin.ModelAdmin):
    list_display = ('user', 'security_question_ans')
    search_fields = ('user__username', 'security_question_ans')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'txref', 'amount', 'status', 'created_at', 'updated_at')
    search_fields = ('txref', 'user__username')
    list_filter = ('status', 'created_at')

@admin.register(Auction)
class AuctionAdmin(admin.ModelAdmin):
    list_display = ('auction_description', 'user', 'auction_style', 'auction_type', 'starting_bid', 'current_max_bid', 'bid_closing_time')
    search_fields = ('auction_description', 'user__username', 'auction_category')
    list_filter = ('auction_style', 'auction_type', 'created_at')

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'auction', 'preview_image')
    search_fields = ('item_name', 'auction__auction_description')

@admin.register(AuctionHistory)
class AuctionHistoryAdmin(admin.ModelAdmin):
    list_display = ('auction', 'user', 'winning_amount', 'created_at')
    search_fields = ('auction__auction_description', 'user__username')

@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ('user', 'auction', 'amount')
    search_fields = ('user__username', 'auction__auction_description')

@admin.register(ProxyBidding)
class ProxyBiddingAdmin(admin.ModelAdmin):
    list_display = ('user', 'auction', 'amount', 'increasing_amount')
    search_fields = ('user__username', 'auction__auction_description')

@admin.register(Escrow)
class EscrowAdmin(admin.ModelAdmin):
    list_display = ('auction', 'user', 'amount', 'status', 'updated_at')
    search_fields = ('auction__auction_description', 'user__username')
    list_filter = ('status', 'updated_at')

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('user', 'feedback_text')
    search_fields = ('user__username', 'feedback_text')

@admin.register(Balance)
class BalanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'current_balance', 'updated_at')
    search_fields = ('user__username',)  # Note the tuple notation here
