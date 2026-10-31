import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker,declarative_base
from app.core.config import settings
if settings.DATABASE_URL.startswith("sqlite:///"):
    os.makedirs("data", exist_ok=True)

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite:///") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(declarative_base()):
    __abstract__ = True
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()





