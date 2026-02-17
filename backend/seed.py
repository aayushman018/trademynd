import sys
import os

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_data():
    db = SessionLocal()
    try:
        email = "demo@trademynd.com"
        password = "password123"
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Creating user {email}...")
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                user_id="TRD-DEMO1",
                name="Demo User",
                plan="free"
            )
            db.add(user)
            db.commit()
            print("User created successfully!")
        else:
            print(f"User {email} already exists.")
            
        print("\nLogin Credentials:")
        print(f"Email: {email}")
        print(f"Password: {password}")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
