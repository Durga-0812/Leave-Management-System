
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.models import LeaveRequest, Employee
from app.schemas import LeaveApply, ManagerDecision
from app.security import get_current_employee, get_current_manager


router = APIRouter(
    prefix="/api/leaves",
    tags=["Leave Management"]
)


# =====================================================
# 1. APPLY FOR LEAVE
# =====================================================

@router.post("/apply")
def apply_leave(
    leave: LeaveApply,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):

    # Validate dates
    if leave.start_date > leave.end_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be before start date"
        )

    # Prevent past-date leave applications
    if leave.start_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Cannot apply for leave in the past"
        )

    # Validate reason
    if not leave.reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Leave reason cannot be empty"
        )

    # Calculate total days (inclusive)
    total_days = (leave.end_date - leave.start_date).days + 1

    # Check leave balance
    if total_days > current_employee.leave_balance:
        raise HTTPException(
            status_code=400,
            detail="Insufficient leave balance"
        )

    # Check overlapping Pending or Approved requests
    overlapping_leave = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == current_employee.id,
        LeaveRequest.status.in_(["Pending", "Approved"]),
        LeaveRequest.start_date <= leave.end_date,
        LeaveRequest.end_date >= leave.start_date
    ).first()

    if overlapping_leave:
        raise HTTPException(
            status_code=400,
            detail="You already have a leave request for these dates"
        )

    # Create leave request
    new_leave = LeaveRequest(
        employee_id=current_employee.id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason.strip(),
        total_days=total_days,
        status="Pending"
    )

    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    return {
        "message": "Leave request submitted successfully",
        "leave_id": new_leave.id,
        "employee_name": current_employee.full_name,
        "start_date": new_leave.start_date,
        "end_date": new_leave.end_date,
        "total_days": new_leave.total_days,
        "status": new_leave.status,
        "remaining_balance": current_employee.leave_balance
    }


# =====================================================
# 2. EMPLOYEE LEAVE HISTORY
# =====================================================

@router.get("/history")
def get_leave_history(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):

    leave_requests = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == current_employee.id
    ).order_by(
        LeaveRequest.created_at.desc()
    ).all()

    return {
        "employee_name": current_employee.full_name,
        "leave_balance": current_employee.leave_balance,
        "total_requests": len(leave_requests),

        "leave_history": [
            {
                "leave_id": leave.id,
                "start_date": leave.start_date,
                "end_date": leave.end_date,
                "total_days": leave.total_days,
                "reason": leave.reason,
                "status": leave.status,
                "manager_remarks": leave.manager_remarks
            }
            for leave in leave_requests
        ]
    }


# =====================================================
# 3. MANAGER VIEW ALL LEAVE REQUESTS
# =====================================================

@router.get("/manager/requests")
def get_all_leave_requests(
    db: Session = Depends(get_db),
    current_manager: Employee = Depends(get_current_manager)
):

    # Join LeaveRequest and Employee tables
    requests = db.query(
        LeaveRequest,
        Employee
    ).join(
        Employee,
        LeaveRequest.employee_id == Employee.id
    ).order_by(
        LeaveRequest.created_at.desc()
    ).all()

    return {
        "manager": current_manager.full_name,
        "total_requests": len(requests),

        "requests": [
            {
                # Leave request ID
                "leave_id": leave.id,

                # Employee information
                "employee_id": employee.id,
                "employee_name": employee.full_name,
                "employee_email": employee.email,

                # Leave information
                "start_date": leave.start_date,
                "end_date": leave.end_date,
                "total_days": leave.total_days,
                "reason": leave.reason,

                # Approval information
                "status": leave.status,
                "manager_remarks": leave.manager_remarks
            }
            for leave, employee in requests
        ]
    }


# =====================================================
# 4. MANAGER APPROVE LEAVE
# =====================================================

@router.put("/manager/approve/{leave_id}")
def approve_leave(
    leave_id: int,
    decision: ManagerDecision,
    db: Session = Depends(get_db),
    current_manager: Employee = Depends(get_current_manager)
):

    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id
    ).with_for_update().first()

    if not leave:
        raise HTTPException(
            status_code=404,
            detail="Leave request not found"
        )

    # Only pending requests can be approved
    if leave.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending leave requests can be approved"
        )

    employee = db.query(Employee).filter(
        Employee.id == leave.employee_id
    ).with_for_update().first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Check balance again before approval
    if employee.leave_balance < leave.total_days:
        raise HTTPException(
            status_code=400,
            detail="Insufficient leave balance"
        )

    # Deduct leave balance
    employee.leave_balance -= leave.total_days

    # Update leave status
    leave.status = "Approved"
    leave.manager_remarks = decision.remarks.strip()

    db.commit()

    db.refresh(leave)
    db.refresh(employee)

    return {
        "message": "Leave approved successfully",
        "leave_id": leave.id,
        "employee_name": employee.full_name,
        "status": leave.status,
        "approved_days": leave.total_days,
        "remaining_balance": employee.leave_balance,
        "manager_remarks": leave.manager_remarks
    }


# =====================================================
# 5. MANAGER REJECT LEAVE
# =====================================================

@router.put("/manager/reject/{leave_id}")
def reject_leave(
    leave_id: int,
    decision: ManagerDecision,
    db: Session = Depends(get_db),
    current_manager: Employee = Depends(get_current_manager)
):

    leave = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id
    ).first()

    if not leave:
        raise HTTPException(
            status_code=404,
            detail="Leave request not found"
        )

    # Only pending requests can be rejected
    if leave.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending leave requests can be rejected"
        )

    # Update leave status
    leave.status = "Rejected"
    leave.manager_remarks = decision.remarks.strip()

    db.commit()
    db.refresh(leave)

    return {
        "message": "Leave rejected successfully",
        "leave_id": leave.id,
        "status": leave.status,
        "manager_remarks": leave.manager_remarks
    }
# =====================================================
# 6. MANAGER ANALYTICS DASHBOARD
# =====================================================

from collections import defaultdict
from datetime import date
import calendar


@router.get("/manager/analytics")
def get_manager_analytics(
    db: Session = Depends(get_db),
    current_manager: Employee = Depends(get_current_manager)
):
    today = date.today()

    # Get all employees and leave requests
    employees = db.query(Employee).filter(
        Employee.role == "employee"
    ).all()

    leave_requests = db.query(LeaveRequest).all()

    # Status overview
    status_counts = {
        "Pending": 0,
        "Approved": 0,
        "Rejected": 0
    }

    for leave in leave_requests:
        if leave.status in status_counts:
            status_counts[leave.status] += 1

    # Employees currently on approved leave
    employees_on_leave = set()

    for leave in leave_requests:
        if (
            leave.status == "Approved"
            and leave.start_date <= today <= leave.end_date
        ):
            employees_on_leave.add(leave.employee_id)

    # Monthly leave overview - last 6 months
    monthly_data = defaultdict(lambda: {
        "requests": 0,
        "days": 0
    })

    months = []

    for offset in range(5, -1, -1):
        month_number = today.month - offset
        year = today.year

        while month_number <= 0:
            month_number += 12
            year -= 1

        month_key = f"{year}-{month_number:02d}"

        months.append({
            "month": month_key,
            "label": calendar.month_abbr[month_number],
            "requests": 0,
            "days": 0
        })

    month_lookup = {
        item["month"]: item for item in months
    }

    for leave in leave_requests:
        month_key = leave.start_date.strftime("%Y-%m")

        if month_key in month_lookup:
            month_lookup[month_key]["requests"] += 1
            month_lookup[month_key]["days"] += leave.total_days

    # Employee-wise statistics
    employee_statistics = []

    for employee in employees:
        employee_leaves = [
            leave for leave in leave_requests
            if leave.employee_id == employee.id
        ]

        employee_statistics.append({
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "email": employee.email,
            "leave_balance": employee.leave_balance,
            "total_requests": len(employee_leaves),
            "approved_requests": sum(
                1 for leave in employee_leaves
                if leave.status == "Approved"
            ),
            "pending_requests": sum(
                1 for leave in employee_leaves
                if leave.status == "Pending"
            ),
            "rejected_requests": sum(
                1 for leave in employee_leaves
                if leave.status == "Rejected"
            )
        })

    # Upcoming approved leaves
    upcoming_leaves = []

    upcoming = db.query(
        LeaveRequest,
        Employee
    ).join(
        Employee,
        LeaveRequest.employee_id == Employee.id
    ).filter(
        LeaveRequest.status == "Approved",
        LeaveRequest.start_date >= today
    ).order_by(
        LeaveRequest.start_date.asc()
    ).limit(10).all()

    for leave, employee in upcoming:
        upcoming_leaves.append({
            "employee_name": employee.full_name,
            "start_date": leave.start_date,
            "end_date": leave.end_date,
            "total_days": leave.total_days
        })

    return {
        "manager": current_manager.full_name,

        "overview": {
            "total_employees": len(employees),
            "total_requests": len(leave_requests),
            "pending_requests": status_counts["Pending"],
            "approved_requests": status_counts["Approved"],
            "rejected_requests": status_counts["Rejected"],
            "employees_on_leave_today": len(employees_on_leave)
        },

        "leave_status_chart": [
            {
                "status": status,
                "count": count
            }
            for status, count in status_counts.items()
        ],

        "monthly_leave_chart": months,

        "employee_statistics": employee_statistics,

        "upcoming_leaves": upcoming_leaves
    }
