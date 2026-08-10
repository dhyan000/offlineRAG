import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

DATABASE_URL = f"sqlite:///{os.path.join(STORAGE_DIR, 'app.db')}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_and_migrate_db():
    """Initializes tables and automatically adds missing columns for schema updates."""
    Base.metadata.create_all(bind=engine)
    try:
        inspector = inspect(engine)
        if "documents" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("documents")]
            with engine.connect() as conn:
                if "duration" not in columns:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN duration VARCHAR;"))
                if "file_hash" not in columns:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN file_hash VARCHAR;"))
                conn.commit()
    except Exception as e:
        print(f"Database migration notice: {e}")
