#fitsum this one is used to populate the user model don't forget to add faker library just run 'python 1234e.py' 
import os
import django
from faker import Faker
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bidding_system.settings')
django.setup()

from users.models import User

fake = Faker()

users = [
    User(
        first_name=fake.first_name(),
        last_name=fake.last_name(),
        country_code=fake.country_code(),
        phone_number=fake.phone_number(),
        profile_img_url=fake.image_url(),
        status=fake.word(),
        password=fake.password(),
        email=fake.email(),
        verified=fake.boolean(),
    )
    for _ in range(100)
]

User.objects.bulk_create(users)
print('Successfully inserted 100 users')
