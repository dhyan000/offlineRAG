import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from backend.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, index=True, nullable=False)
    type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    status = Column(String, default="uploaded")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    indexed_at = Column(DateTime, nullable=True)
    duration = Column(String, nullable=True)
    file_hash = Column(String, nullable=True, index=True)
    chunk_count = Column(Integer, default=0)
    error_message = Column(String, nullable=True)
