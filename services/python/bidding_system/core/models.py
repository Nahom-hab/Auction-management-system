from django.db import models
from django.utils import timezone
from django.conf import settings
AUCTION_TYPE_CHOICES = [
    ('open', 'Open'),
    ('closed', 'Closed'),
]

AUCTION_STYLE_CHOICES = [
    ('increasing', 'Increasing'),
    ('decreasing', 'Decreasing'),
]

class UserAuthentication(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True)
    security_question_ans = models.CharField(max_length=255, blank=True, null=True)
    class Meta:
        db_table = 'user_authentication'

    def __str__(self):
        return f'Auth for {self.user}'

class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions', null=True)
    txref = models.CharField(max_length=255, unique=True, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=255, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transaction'

    def __str__(self):
        return f'Transaction {self.txref}'

class Auction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='auctions', null=True)
    auction_style = models.CharField(max_length=20, choices=AUCTION_STYLE_CHOICES, blank=True, null=True)
    auction_category = models.CharField(max_length=255, blank=True, null=True)
    auction_type = models.CharField(max_length=20, choices=AUCTION_TYPE_CHOICES, blank=True, null=True)
    auction_description = models.CharField(max_length=255, blank=True, null=True)
    starting_bid = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    increment_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    bid_starting_time = models.DateTimeField(blank=True, null=True, default=timezone.now)
    current_max_bid = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    bid_closing_time = models.DateTimeField(blank=True, null=True)
    bid_winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='won_auctions', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'auction'

    def __str__(self):
        return self.auction_description or ''

class Item(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='items', null=True)
    item_name = models.CharField(max_length=255, blank=True, null=True)
    preview_image = models.URLField(blank=True, null=True)
    images_url = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = 'item'

    def __str__(self):
        return self.item_name or ''

class AuctionHistory(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='history', null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='auction_histories', null=True)
    winning_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'auction_history'

    def __str__(self):
        return f'History for {self.auction} by {self.user}'

class Bid(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bids', null=True)
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='bids', null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'bid'

    def __str__(self):
        return f'Bid {self.id} for {self.auction} by {self.user}'

class ProxyBidding(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='proxy_bids', null=True)
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='proxy_bids', null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    increasing_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'proxy_bidding'

    def __str__(self):
        return f'Proxy Bid {self.id} for {self.auction} by {self.user}'

class Escrow(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='escrows', null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='escrows', null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=255, default='PENDING')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'escrow'

    def __str__(self):
        return f'Escrow {self.id} for {self.auction} by {self.user}'

class Feedback(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feedbacks', null=True)
    feedback_text = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'feedback'

    def __str__(self):
        return f'Feedback from {self.user}'

class Balance(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='balances', null=True)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'balance'

    def __str__(self):
        return f'Balance for {self.user}'
