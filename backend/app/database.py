import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# Project root directory
BASE_DIR = Path(__file__).resolve().parents[2]

# Load local Neon environment variables if available.
# Render will provide DATABASE_URL through its environment settings.
load_dotenv(BASE_DIR / ".env.local")

# Use PostgreSQL when DATABASE_URL is configured.
# Otherwise, use SQLite for local development.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./leave_management.db"
)

# Convert cloud PostgreSQL URLs to the psycopg driver.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg://",
        1
    )
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )

# Configure database connection.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()