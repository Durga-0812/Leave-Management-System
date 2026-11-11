from getpass import getpass

from app.database import SessionLocal
from app.models import Employee
from app.security import hash_password

db = SessionLocal()

try:
    email = input("Enter manager email: ").strip().lower()

    manager = db.query(Employee).filter(
        Employee.email == email,
        Employee.role == "manager"
    ).first()

    if manager:
        password = getpass("Enter new password: ")

        if len(password) < 8:
            print("Password must contain at least 8 characters.")
        else:
            manager.hashed_password = hash_password(password)
            db.commit()

            print("Manager password updated successfully!")

    else:
        print("Manager account not found.")

finally:
    db.close()