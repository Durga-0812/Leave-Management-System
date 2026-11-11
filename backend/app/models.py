from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    func
)

from app.database import Base


# Employee Table
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=False)

    email = Column(String, unique=True, nullable=False)

    hashed_password = Column(String, nullable=False)

    role = Column(String, default="employee")

    leave_balance = Column(Integer, default=12)


# Leave Request Table
class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    start_date = Column(Date, nullable=False)

    end_date = Column(Date, nullable=False)

    reason = Column(String, nullable=False)

    total_days = Column(Integer, nullable=False)

    status = Column(String, default="Pending")

    manager_remarks = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())