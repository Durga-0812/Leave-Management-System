import os
from pathlib import Path
from dotenv import load_dotenv

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee


# Load local environment variables
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env.local")

# Secure JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is missing."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

oauth2_scheme = HTTPBearer()


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        employee_id = payload.get("sub")

        if employee_id is None:
            raise credentials_exception

    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    employee = db.query(Employee).filter(
        Employee.id == int(employee_id)
    ).first()

    if employee is None:
        raise credentials_exception

    return employee


def get_current_manager(
    current_employee: Employee = Depends(get_current_employee)
):
    if current_employee.role != "manager":
        raise HTTPException(
            status_code=403,
            detail="Only managers can perform this action"
        )

    return current_employee