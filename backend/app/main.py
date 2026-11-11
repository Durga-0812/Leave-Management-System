from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app import models

from app.routes.auth import router as auth_router
from app.routes.leaves import router as leaves_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Leave Management System",
    description="Employee Leave Management Application",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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