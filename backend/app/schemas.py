from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==========================================
# 1. ESQUEMAS DE AUTENTICACIÓN (Usuarios)
# ==========================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    nombre: str
    nivel: int
    xp: int

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: Optional[str] = None
    email: Optional[str] = None

# ==========================================
# 2. ESQUEMAS DE RETOS DIARIOS Y RACHA
# ==========================================

class ChallengeItem(BaseModel):
    id: str
    section: str
    title: str
    description: str
    type: str
    required_minutes: Optional[int] = Field(default=None, alias="requiredMinutes")
    done: bool

    model_config = ConfigDict(populate_by_name=True)

class DailyChallengeUpdate(BaseModel):
    date_key: str = Field(alias="dateKey")
    challenges: List[ChallengeItem]

    model_config = ConfigDict(populate_by_name=True)

class StreakResponse(BaseModel):
    streak: int

# ==========================================
# 3. ESQUEMAS DE SINCRONIZACIÓN (App Data)
# ==========================================

class PracticeSessionCreate(BaseModel):
    # Payload que usa la app al terminar un timer de práctica
    type: str
    duration_seconds: int = Field(alias="durationSeconds")
    duration_minutes: float = Field(alias="durationMinutes")
    meta: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)

class PracticeSessionSync(BaseModel):
    id: str 
    type: str
    duration_seconds: int
    created_at: datetime
    
    lesson_name: Optional[str] = None
    tema_id: Optional[int] = None
    bpm_start: Optional[int] = None
    bpm_end: Optional[int] = None
    meta: Optional[Dict[str, Any]] = None
    
    is_deleted: bool = False 

    model_config = ConfigDict(from_attributes=True)

class PracticePlaceSync(BaseModel):
    id: str
    lat: float
    lng: float
    address: Optional[str] = None
    created_at: datetime
    is_deleted: bool = False

    model_config = ConfigDict(from_attributes=True)

class PracticePlacesSyncPayload(BaseModel):
    places: List[PracticePlaceSync]

    model_config = ConfigDict(from_attributes=True)

class SyncPushPayload(BaseModel):
    practices: List[PracticeSessionSync]