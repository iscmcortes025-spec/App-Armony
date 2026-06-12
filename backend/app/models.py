from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from .database import Base

# ==========================================
# 1. TABLA DE USUARIOS (Basado en tu interfaz 'Usuario')
# ==========================================
class User(Base):
    __tablename__ = "users"

    # Usaremos String para los IDs para mantener compatibilidad con cualquier sistema
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nivel = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ==========================================
# 2. TABLAS SINCRONIZABLES OFFLINE-FIRST
# ==========================================

class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(String, primary_key=True) 
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    type = Column(String, nullable=False)
    duration_seconds = Column(Integer, nullable=False)
    duration_minutes = Column(Float, nullable=True) # <-- NUEVO: Para guardar los minutos exactos
    created_at = Column(DateTime(timezone=True))
    
    lesson_name = Column(String, nullable=True)
    tema_id = Column(Integer, nullable=True)
    bpm_start = Column(Integer, nullable=True)
    bpm_end = Column(Integer, nullable=True)
    meta = Column(Text, nullable=True) # Usamos Text para mandar un JSON stringificado

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

class PracticePlace(Base):
    __tablename__ = "practice_places"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True))
    address = Column(String, nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

class DailyChallengeDay(Base):
    __tablename__ = "daily_challenge_days"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    date_key = Column(String, nullable=False)
    challenges_json = Column(Text, nullable=False) 

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)