from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.schemas import EmployeeRegister, EmployeeLogin
from app.security import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register_employee(
    employee: EmployeeRegister,
    db: Session = Depends(get_db)
):

    existing_employee = db.query(Employee).filter(
        Employee.email == employee.email
    ).first()

    if existing_employee:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_employee = Employee(
        full_name=employee.full_name,
        email=employee.email,
        hashed_password=hash_password(employee.password),
        role="employee",
        leave_balance=12
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return {
        "message": "Employee registered successfully",
        "employee_id": new_employee.id,
        "name": new_employee.full_name,
        "email": new_employee.email
    }


@router.post("/login")
def login_employee(
    credentials: EmployeeLogin,
    db: Session = Depends(get_db)
):

    employee = db.query(Employee).filter(
        Employee.email == credentials.email
    ).first()

    if not employee or not verify_password(
        credentials.password,
        employee.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": str(employee.id),
        "role": employee.role
    })

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "employee": {
            "id": employee.id,
            "name": employee.full_name,
            "email": employee.email,
            "role": employee.role,
            "leave_balance": employee.leave_balance
        }
    }