from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models import domain  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Lightweight migration: add audit_logs.batch_id if missing
    insp = inspect(engine)
    if "audit_logs" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("audit_logs")}
        if "batch_id" not in cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE audit_logs ADD COLUMN batch_id VARCHAR"))
                conn.commit()
    # Lightweight migration: add refunds.batch_id if missing
    if "refunds" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("refunds")}
        if "batch_id" not in cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE refunds ADD COLUMN batch_id VARCHAR"))
                conn.commit()
