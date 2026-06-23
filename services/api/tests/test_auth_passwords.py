from app.routers.auth import verify_password


def test_verify_password_accepts_sha256_demo_hash():
    assert verify_password(
        "engineer",
        "7826b958b79c70626801b880405eb5111557dadceb2fee2b1ed69a18eed0c6dc",
    )
