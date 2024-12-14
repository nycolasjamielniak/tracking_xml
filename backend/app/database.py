from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

# Create database engine - using relative path from the app directory
DATABASE_URL = "sqlite:///./trips.db"
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create declarative base
Base = declarative_base()

# Create Session class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class IntegratedTrip(Base):
    __tablename__ = "integrated_trips"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, unique=True, index=True)
    trip_data = Column(JSON)
    matrix_cargo_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String)  # 'success' or 'error'
    error_message = Column(String, nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 