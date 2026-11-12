from app.core.security import get_password_hash, verify_password
import uuid
def test_password_hashing():
    """Test that password hashing works correctly and verifies matching passwords."""
    plain_password = "SecurePassword123!"
    hashed_password = get_password_hash(plain_password)
    
    # Hashed password should not equal plain text
    assert hashed_password != plain_password
    
    # Verification should succeed with correct password
    assert verify_password(plain_password, hashed_password) is True
    
    # Verification should fail with incorrect password
    assert verify_password("WrongPassword!", hashed_password) is False




def test_login_wrong_password(client):
    """Test that logging in with an incorrect password fails with 401 Unauthorized."""
    unique_email = f"test_{uuid.uuid4().hex[:8]}@university.edu"
    
    # 1. Register a test user with a unique email
    user_data = {
        "email": unique_email,
        "password": "CorrectPassword123",
        "full_name": "Test User",
        "affiliation": "University"
    }
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201

    # 2. Attempt to log in with the correct email but a wrong password
    login_data = {
        "username": unique_email,
        "password": "WrongPassword456"
    }
    response = client.post(
        "/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    

    # 3. Assert unauthorized error
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]