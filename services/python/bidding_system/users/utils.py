from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

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
