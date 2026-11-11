# LeaveFlow – Employee Leave Management System

LeaveFlow is a web-based Employee Leave Management System that simplifies leave applications, approvals, employee leave tracking and management.

## Features

### Employee
- Employee registration and login.
- Personal dashboard.
- Apply for leave.
- View leave application history.
- View leave balance.
- View leave status and manager remarks.
- Monthly leave calendar.

### Manager
- Secure manager login.
- View all employee leave requests.
- View employee details.
- Approve or reject leave applications.
- Add manager remarks.
- Filter leave requests by status.

### Validations
- Prevent applications for past dates.
- Validate start and end dates.
- Prevent overlapping leave requests.
- Check available leave balance.
- Prevent approval of already processed requests.
- Automatically deduct leave balance after approval.

## Technology Stack

**Frontend**
- React.js
- Vite
- HTML
- CSS
- JavaScript

**Backend**
- Python
- FastAPI
- SQLAlchemy
- JWT Authentication

**Database**
- SQLite

## Project Structure

```text
Leave-Management-System/
│
├── backend/
│   └── app/
│       ├── routes/
│       │   ├── auth.py
│       │   └── leaves.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── security.py
│       └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Leave-Management-System
```

### 2. Create Python virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

```powershell
pip install fastapi uvicorn sqlalchemy pydantic[email] python-jose[cryptography] passlib[bcrypt]
pip install "bcrypt<4.1"
```

### 4. Start the backend

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Backend URL:

http://127.0.0.1:8001

API documentation:

http://127.0.0.1:8001/docs

### 5. Install frontend dependencies

Open another terminal:

```powershell
cd frontend
npm install
```

### 6. Start frontend

```powershell
npm run dev -- --port 5173
```

Frontend URL:

http://localhost:5173

## Database

SQLite is used to store:

- Employee information.
- Login credentials (hashed passwords).
- Employee leave balances.
- Leave requests.
- Leave statuses.
- Manager remarks.

## Leave Status

- Pending
- Approved
- Rejected

## Future Enhancements

- Email notifications.
- Password reset functionality.
- Leave reports and analytics.
- Public holiday management.
- Deployment to cloud hosting.

## Project

**Project Name:** LeaveFlow  
**Category:** Full Stack Web Application  
**Purpose:** Employee Leave Management