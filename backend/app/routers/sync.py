from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError

# 🚀 Nuevas importaciones necesarias para las fechas, JSON y UUIDs
from datetime import datetime, timedelta
import json
import uuid

from .. import models, schemas, database
from ..core import security

router = APIRouter(
    prefix="/sync",
    tags=["Synchronization"]
)

security_scheme = HTTPBearer()

# --- DEPENDENCIA DE SEGURIDAD ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(database.get_db)):
    token = credentials.credentials
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# --- ENDPOINTS DE SYNC (Existente) ---
@router.post("/push")
def sync_push(
    payload: schemas.SyncPushPayload, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Recibe los datos locales de la app y los guarda en la base de datos central.
    """
    registros_actualizados = 0
    
    for practice in payload.practices:
        db_practice = db.query(models.PracticeSession).filter(
            models.PracticeSession.id == practice.id
        ).first()

        if db_practice:
            db_practice.user_id = current_user.id
            db_practice.type = practice.type
            db_practice.duration_seconds = practice.duration_seconds
            db_practice.lesson_name = practice.lesson_name
            db_practice.tema_id = practice.tema_id
            db_practice.bpm_start = practice.bpm_start
            db_practice.bpm_end = practice.bpm_end
            db_practice.meta = json.dumps(practice.meta) if practice.meta is not None else None
            db_practice.is_deleted = practice.is_deleted
            db_practice.updated_at = datetime.utcnow()
        else:
            new_practice = models.PracticeSession(
                id=practice.id,
                user_id=current_user.id,
                type=practice.type,
                duration_seconds=practice.duration_seconds,
                created_at=practice.created_at,
                lesson_name=practice.lesson_name,
                tema_id=practice.tema_id,
                bpm_start=practice.bpm_start,
                bpm_end=practice.bpm_end,
                meta=json.dumps(practice.meta) if practice.meta is not None else None,
                is_deleted=practice.is_deleted
            )
            db.add(new_practice)
        
        registros_actualizados += 1

    db.commit()
    
    return {
        "status": "success", 
        "message": f"Se sincronizaron {registros_actualizados} prácticas correctamente."
    }

@router.post("/practice-places")
def sync_practice_places(
    payload: schemas.PracticePlacesSyncPayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Recibe los lugares de práctica registrados en la app y los guarda en la base de datos central.
    """
    registros_actualizados = 0

    for place in payload.places:
        db_place = db.query(models.PracticePlace).filter(
            models.PracticePlace.id == place.id,
            models.PracticePlace.user_id == current_user.id
        ).first()

        if db_place:
            db_place.lat = place.lat
            db_place.lng = place.lng
            db_place.address = place.address
            db_place.created_at = place.created_at
            db_place.is_deleted = place.is_deleted
            db_place.updated_at = datetime.utcnow()
        else:
            new_place = models.PracticePlace(
                id=place.id,
                user_id=current_user.id,
                lat=place.lat,
                lng=place.lng,
                address=place.address,
                created_at=place.created_at,
                is_deleted=place.is_deleted
            )
            db.add(new_place)

        registros_actualizados += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Se sincronizaron {registros_actualizados} lugares correctamente."
    }

# ==========================================
# 🚀 NUEVOS ENDPOINTS PARA RETOS Y SESIONES
# ==========================================

@router.get("/challenges/daily")
def get_daily_challenges(
    date: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """ Obtiene el progreso de los retos de un día específico. """
    daily = db.query(models.DailyChallengeDay).filter(
        models.DailyChallengeDay.user_id == current_user.id,
        models.DailyChallengeDay.date_key == date
    ).first()

    if not daily:
        return {"challenges": []}
    
    return {"challenges": json.loads(daily.challenges_json)}


@router.post("/challenges/daily")
def update_daily_challenges(
    payload: schemas.DailyChallengeUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """ Guarda o actualiza los retos del día. """
    daily = db.query(models.DailyChallengeDay).filter(
        models.DailyChallengeDay.user_id == current_user.id,
        models.DailyChallengeDay.date_key == payload.date_key
    ).first()

    # Pydantic v2: model_dump convierte el objeto a diccionario respetando los alias de camelCase
    challenges_dict_list = [c.model_dump(by_alias=True) for c in payload.challenges]
    challenges_json_str = json.dumps(challenges_dict_list)

    if daily:
        daily.challenges_json = challenges_json_str
        daily.updated_at = datetime.utcnow()
    else:
        daily = models.DailyChallengeDay(
            id=str(uuid.uuid4()), # Generamos ID único para postgres
            user_id=current_user.id,
            date_key=payload.date_key,
            challenges_json=challenges_json_str
        )
        db.add(daily)
    
    db.commit()
    return {"status": "success"}


@router.post("/practice-sessions")
def create_practice_session(
    payload: schemas.PracticeSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """ Guarda una sesión individual (ej. cuando se termina el timer del reto de 5 min). """
    new_practice = models.PracticeSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        type=payload.type,
        duration_seconds=payload.duration_seconds,
        duration_minutes=payload.duration_minutes,
        meta=json.dumps(payload.meta) if payload.meta else None,
        created_at=payload.created_at or datetime.utcnow()
    )
    db.add(new_practice)
    db.commit()
    return {"status": "success", "id": new_practice.id}


@router.get("/users/me/streak")
def get_user_streak(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """ 
    Calcula la racha revisando si en los últimos días se completó al menos un reto de 'today'.
    """
    days = db.query(models.DailyChallengeDay).filter(
        models.DailyChallengeDay.user_id == current_user.id
    ).order_by(models.DailyChallengeDay.date_key.desc()).limit(60).all()

    # Mapeo rápido: { "2023-10-01": [{"id": "nom-1", "done": true...}] }
    days_dict = {d.date_key: json.loads(d.challenges_json) for d in days}
    
    streak = 0
    cursor_date = datetime.now()

    for i in range(60):
        key = cursor_date.strftime("%Y-%m-%d")
        
        if key not in days_dict:
            # Si estamos validando "hoy" (i=0) y no hay datos, no rompe la racha, 
            # saltamos a checar ayer.
            if i == 0:
                cursor_date -= timedelta(days=1)
                continue
            else:
                break # Rompe la racha si falta un día hacia atrás
        
        challenges = days_dict[key]
        # Validamos si completó al menos un reto de la sección "today"
        ok = any(c.get("section") == "today" and c.get("done") for c in challenges)
        
        if not ok:
            if i == 0:
                cursor_date -= timedelta(days=1)
                continue
            else:
                break
        
        streak += 1
        cursor_date -= timedelta(days=1)

    return {"streak": streak}   


# --- GET /sync/pull ---
@router.get("/pull")
def sync_pull(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Devuelve todos los datos del usuario para restaurar el dispositivo.
    Se usa al iniciar la app o al cambiar de teléfono.
    """
    practices = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id,
        models.PracticeSession.is_deleted == False
    ).all()

    places = db.query(models.PracticePlace).filter(
        models.PracticePlace.user_id == current_user.id,
        models.PracticePlace.is_deleted == False
    ).all()

    challenges = db.query(models.DailyChallengeDay).filter(
        models.DailyChallengeDay.user_id == current_user.id,
        models.DailyChallengeDay.is_deleted == False
    ).all()

    return {
        "practices": [
            {
                "id": p.id,
                "type": p.type,
                "duration_seconds": p.duration_seconds,
                "lesson_name": p.lesson_name,
                "tema_id": p.tema_id,
                "bpm_start": p.bpm_start,
                "bpm_end": p.bpm_end,
                "meta": json.loads(p.meta) if p.meta else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in practices
        ],
        "places": [
            {
                "id": pl.id,
                "lat": pl.lat,
                "lng": pl.lng,
                "address": pl.address,
                "created_at": pl.created_at.isoformat() if pl.created_at else None,
            }
            for pl in places
        ],
        "challenges": [
            {
                "date_key": c.date_key,
                "challenges": json.loads(c.challenges_json),
            }
            for c in challenges
        ],
    }