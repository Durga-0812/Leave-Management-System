from pydantic import BaseModel, EmailStr
from datetime import date


class EmployeeRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str


class LeaveApply(BaseModel):
    start_date: date
    end_date: date
    reason: str
class ManagerDecision(BaseModel):
    remarks: str