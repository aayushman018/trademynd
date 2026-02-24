import os
import sys

# Set production DATABASE_URL
os.environ["DATABASE_URL"] = "postgresql://postgres.fzmrzyepcdvmdyphktvy:Aayupass%23supabase%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

from app.core.database import SessionLocal
from app.models.user import User

try:
    db = SessionLocal()
    # Querying the user model to trigger mapper or execution errors
    user = db.query(User).first()
    if user:
        print(f"User found: {user.email}")
    else:
        print("No users found.")
except Exception as e:
    import traceback
    traceback.print_exc()
