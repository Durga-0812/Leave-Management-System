import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app import models

from app.routes.auth import router as auth_router
from app.routes.leaves import router as leaves_router


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Leave Management System",
    description="Employee Leave Management Application",
    version="1.0.0"
)


# Allowed frontend origins
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

# Add deployed Vercel frontend URL from environment
frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Connect API routers
app.include_router(auth_router)
app.include_router(leaves_router)


@app.get("/")
def home():
    return {
        "message": "Leave Management System API is running!"
    }