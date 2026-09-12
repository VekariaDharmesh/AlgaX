import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

db_url = os.environ.get("DATABASE_URL")
if not db_url or ("postgresql" in db_url and not os.environ.get("USE_POSTGRES")):
    if os.path.exists("backend/algax.db"):
        db_url = "sqlite:///./backend/algax.db"
    elif os.path.exists("algax.db"):
        db_url = "sqlite:///./algax.db"
    elif not db_url:
        db_url = "sqlite:///./backend/algax.db"

DATABASE_URL = db_url

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
